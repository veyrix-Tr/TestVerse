// Uploads to Cloudflare R2 (lib/storage.js). The browser sends the files
// straight to R2 with the signed links handed out here; this server never
// receives the files themselves.
const prisma = require('../lib/prisma');
const storage = require('../lib/storage');
const { notifyMany } = require('../lib/notify');

const IMAGE_TYPES = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };
const MAX_IMAGE   = 5 * 1024 * 1024;  // per picture, after the browser compresses it
const MAX_IMAGES  = 400;              // per upload (a whole paper)
const MAX_PDF     = 25 * 1024 * 1024;

const NOT_SET_UP = "File uploads aren't set up yet: the Cloudflare R2 settings are missing on the server.";

// POST /api/admin/uploads/images — Body: { files: [{ name, type, size }] }
// -> { files: [{ name, url, putUrl }] } in the same order. The browser PUTs each
// picture to its putUrl (valid 10 minutes) and puts `url` in the paper.
const imageUploads = async (req, res) => {
  try {
    if (!storage.imagesReady()) return res.status(503).json({ error: NOT_SET_UP });
    const files = req.body && Array.isArray(req.body.files) ? req.body.files : [];
    if (!files.length) return res.status(400).json({ error: 'There are no pictures to upload.' });
    if (files.length > MAX_IMAGES) return res.status(400).json({ error: `At most ${MAX_IMAGES} pictures can be uploaded at once.` });
    for (const f of files) {
      const name = f && typeof f.name === 'string' ? f.name : 'a picture';
      if (!f || !IMAGE_TYPES[f.type]) return res.status(400).json({ error: `${name}: pictures must be PNG, JPG or WebP.` });
      if (!(Number(f.size) > 0 && Number(f.size) <= MAX_IMAGE)) return res.status(400).json({ error: `${name}: each picture can be at most 5 MB.` });
    }
    const c = storage.config();
    const month = new Date().toISOString().slice(0, 7).replace('-', '');
    const out = await Promise.all(
      files.map(async (f) => {
        const key = `q/${month}/${storage.randomName()}.${IMAGE_TYPES[f.type]}`;
        return { name: String(f.name).slice(0, 200), url: storage.imageUrlOf(key), putUrl: await storage.presignPut(c.images, key) };
      }),
    );
    res.json({ files: out });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not prepare the picture upload' });
  }
};

const pdfName = (name) => {
  const base = String(name || 'solutions').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 120) || 'solutions';
  return /\.pdf$/i.test(base) ? base : base + '.pdf';
};

// A live test's solutions open when it closes (the same rule as its answers)
const released = (t) => !(t.kind === 'live' && t.closesAt && Date.now() < t.closesAt.getTime());

// POST /api/admin/tests/:id/solutions/upload — Body: { name, size } -> { key, putUrl }
const solutionsUpload = async (req, res) => {
  try {
    if (!storage.filesReady()) return res.status(503).json({ error: NOT_SET_UP });
    const test = await prisma.test.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    const b = req.body || {};
    if (typeof b.name !== 'string' || !/\.pdf$/i.test(b.name.trim())) return res.status(400).json({ error: 'Choose a PDF file.' });
    if (!(Number(b.size) > 0 && Number(b.size) <= MAX_PDF)) return res.status(400).json({ error: 'The PDF can be at most 25 MB.' });
    const key = `s/${test.id}/${storage.randomName()}.pdf`;
    res.json({ key, putUrl: await storage.presignPut(storage.config().files, key) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not prepare the PDF upload' });
  }
};

// PUT /api/admin/tests/:id/solutions — Body: { key, name }, once the browser's
// upload has finished. Replaces any earlier PDF. The first PDF of a test tells
// the students who've taken it (when its solutions are already open to them).
const saveSolutions = async (req, res) => {
  try {
    if (!storage.filesReady()) return res.status(503).json({ error: NOT_SET_UP });
    const test = await prisma.test.findUnique({ where: { id: req.params.id }, select: { id: true, title: true, kind: true, closesAt: true, solutionsKey: true } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    const key = req.body && typeof req.body.key === 'string' ? req.body.key : '';
    if (!key.startsWith(`s/${test.id}/`) || !/^s\/[\w-]+\/[0-9a-f]{32}\.pdf$/.test(key)) return res.status(400).json({ error: 'That upload is not for this test.' });
    const c = storage.config();
    const size = await storage.sizeOf(c.files, key);
    if (size == null) return res.status(400).json({ error: "The PDF didn't finish uploading. Please try again." });
    if (size > MAX_PDF) {
      await storage.removeAll(c.files, [key]);
      return res.status(400).json({ error: 'The PDF can be at most 25 MB.' });
    }
    const name = pdfName(req.body.name);
    const saved = await prisma.test.update({ where: { id: test.id }, data: { solutionsKey: key, solutionsName: name, solutionsAt: new Date() }, select: { solutionsName: true, solutionsAt: true } });
    if (test.solutionsKey && test.solutionsKey !== key) await storage.removeAll(c.files, [test.solutionsKey]);
    if (!test.solutionsKey && released(test)) {
      const done = await prisma.attempt.findMany({ where: { testId: test.id, submittedAt: { not: null } }, select: { userId: true }, distinct: ['userId'] });
      await notifyMany(done.map((a) => a.userId), { type: 'solutions', text: 'Solutions are out: ' + test.title, view: '/student/result?test=' + test.id });
    }
    res.json({ message: 'Solutions saved', solutions: { name: saved.solutionsName, at: saved.solutionsAt } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save the solutions' });
  }
};

// DELETE /api/admin/tests/:id/solutions
const removeSolutions = async (req, res) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id }, select: { id: true, solutionsKey: true } });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    await prisma.test.update({ where: { id: test.id }, data: { solutionsKey: null, solutionsName: null, solutionsAt: null } });
    if (test.solutionsKey) await storage.removeAll(storage.config().files, [test.solutionsKey]);
    res.json({ message: 'Solutions removed', solutions: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not remove the solutions' });
  }
};

module.exports = { imageUploads, solutionsUpload, saveSolutions, removeSolutions, released };
