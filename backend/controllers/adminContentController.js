const prisma = require('../lib/prisma');

// Admin > Website info: the resources and announcements the site reads
// (controllers/siteController.js), plus the admin's own notification inbox.

const EXAMS = ['neet', 'jee-main', 'jee-advanced'];
const AUDIENCES = ['all', 'students', 'paid', 'exam:neet', 'exam:jee-main', 'exam:jee-advanced'];
const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

// "https://www.youtube.com/watch?v=dQw4w9WgXcQ" / "https://youtu.be/…" / "dQw4w9WgXcQ" -> "dQw4w9WgXcQ"
function videoIdOf(input) {
  const s = String(input == null ? '' : input).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:[^&]*&)*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function httpUrl(v) {
  const s = clean(v, 500);
  if (!s) return '';
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null;
  } catch {
    return null;
  }
}

const resourceOf = (r) => ({
  id: r.id,
  title: r.title,
  videoId: r.videoId,
  exam: r.exam,
  topic: r.topic,
  sortOrder: r.sortOrder,
  isPublished: r.isPublished,
  createdAt: r.createdAt,
});

// ---------------------------------------------------------------- resources

// GET /api/admin/resources — every resource (published or not), admin order
const listResources = async (req, res) => {
  try {
    const rows = await prisma.resource.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    res.json({ resources: rows.map(resourceOf) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load resources' });
  }
};

// Reads the body shared by create and update. `id` skips the "video already
// added" check when a resource updates itself.
function readResource(b, id) {
  const title = clean(b.title, 120);
  if (!title) return { field: 'title', error: 'Give the video a title.' };
  const videoId = videoIdOf(b.videoId || b.url);
  if (!videoId) return { field: 'videoId', error: 'Paste a YouTube link or video id (https://youtu.be/…).' };
  const exam = b.exam ? String(b.exam) : null;
  if (exam && !EXAMS.includes(exam)) return { field: 'exam', error: 'Choose an exam, or leave it open to everyone.' };
  const topic = clean(b.topic, 60) || null;
  const isPublished = b.isPublished === undefined ? true : !!b.isPublished;
  return { videoId, data: { title, videoId, exam, topic, isPublished } };
}

// POST /api/admin/resources — { title, videoId | url, exam?, topic?, isPublished? }
const createResource = async (req, res) => {
  try {
    const r = readResource(req.body);
    if (r.error) return res.status(400).json(r);
    if (await takenByOther(r.videoId, null)) return res.status(409).json({ field: 'videoId', error: 'That video is already in the list.' });
    const last = await prisma.resource.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    const row = await prisma.resource.create({
      data: { ...r.data, sortOrder: (last ? last.sortOrder : 0) + 1, createdById: req.user.id },
    });
    res.status(201).json({ message: 'Resource added', resource: resourceOf(row) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not add the resource' });
  }
};

// PUT /api/admin/resources/:id — any subset of the fields above, plus sortOrder
const updateResource = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Resource not found' });

    const r = readResource({ ...existing, ...req.body }, id);
    if (r.error) return res.status(400).json(r);
    if (await takenByOther(r.videoId, id)) return res.status(409).json({ field: 'videoId', error: 'That video is already in the list.' });

    const data = { ...r.data };
    if (req.body.sortOrder !== undefined) data.sortOrder = Number(req.body.sortOrder) || 0;
    const row = await prisma.resource.update({ where: { id }, data });
    res.json({ message: 'Resource saved', resource: resourceOf(row) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save the resource' });
  }
};

const takenByOther = async (videoId, id) =>
  !!(await prisma.resource.findFirst({ where: { videoId, ...(id ? { NOT: { id } } : {}) }, select: { id: true } }));

// DELETE /api/admin/resources/:id
const deleteResource = async (req, res) => {
  try {
    await prisma.resource.delete({ where: { id: req.params.id } });
    res.json({ message: 'Resource removed' });
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: 'Resource not found' });
  }
};

// ------------------------------------------------------------ announcements

const announcementOf = (a) => ({
  id: a.id,
  body: a.body,
  audience: a.audience,
  link: a.link,
  startsAt: a.startsAt,
  endsAt: a.endsAt,
  isActive: a.isActive,
  createdAt: a.createdAt,
  // only the admin list carries reads
  reads: a.reads === undefined ? undefined : a.reads.length,
});

function readAnnouncement(b) {
  const raw = String(b.body == null ? '' : b.body).trim();
  if (!raw) return { field: 'body', error: 'Write the announcement.' };
  if (raw.length > 300) return { field: 'body', error: 'Keep the announcement under 300 characters.' };
  const body = raw;
  const audience = b.audience ? String(b.audience) : 'all';
  if (!AUDIENCES.includes(audience)) return { field: 'audience', error: 'Choose who sees this.' };
  const link = httpUrl(b.link);
  if (link === null) return { field: 'link', error: 'The link must be a full http(s) address.' };

  let startsAt = b.startsAt ? new Date(b.startsAt) : new Date();
  if (isNaN(startsAt)) return { field: 'startsAt', error: 'Choose a valid start time.' };
  let endsAt = b.endsAt ? new Date(b.endsAt) : null;
  if (endsAt && isNaN(endsAt)) return { field: 'endsAt', error: 'Choose a valid end time.' };
  if (endsAt && endsAt <= startsAt) return { field: 'endsAt', error: 'The end time must be after the start time.' };

  return { data: { body, audience, link: link || null, startsAt, endsAt, isActive: b.isActive === undefined ? true : !!b.isActive } };
}

// GET /api/admin/announcements — newest first, each with how many students
// have seen it, and how many could (active students today)
const listAnnouncements = async (req, res) => {
  try {
    const [rows, students] = await Promise.all([
      prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, include: { reads: { select: { userId: true } } } }),
      prisma.user.count({ where: { role: 'student', isActive: true } }),
    ]);
    res.json({ announcements: rows.map(announcementOf), audienceSize: students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load announcements' });
  }
};

// POST /api/admin/announcements — { body, audience?, link?, startsAt?, endsAt?, isActive? }
const createAnnouncement = async (req, res) => {
  try {
    const r = readAnnouncement(req.body);
    if (r.error) return res.status(400).json(r);
    const row = await prisma.announcement.create({ data: { ...r.data, createdById: req.user.id } });
    res.status(201).json({ message: 'Announcement published', announcement: announcementOf(row) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not publish the announcement' });
  }
};

// PUT /api/admin/announcements/:id — edit and/or switch on and off
const updateAnnouncement = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });
    const r = readAnnouncement({ ...existing, ...req.body });
    if (r.error) return res.status(400).json(r);
    const row = await prisma.announcement.update({ where: { id }, data: r.data });
    res.json({ message: 'Announcement saved', announcement: announcementOf(row) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not save the announcement' });
  }
};

// DELETE /api/admin/announcements/:id (its read receipts go with it)
const deleteAnnouncement = async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: 'Announcement not found' });
  }
};

// ------------------------------------------------------------ notifications

const notificationOf = (n) => ({
  id: n.id,
  type: n.type,
  text: n.text,
  view: n.view,
  read: !!n.readAt,
  createdAt: n.createdAt,
});

// GET /api/admin/notifications — the newest 30 and how many are unread
const listNotifications = async (req, res) => {
  try {
    const rows = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
    const unread = await prisma.notification.count({ where: { readAt: null } });
    res.json({ notifications: rows.map(notificationOf), unread });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load notifications' });
  }
};

// POST /api/admin/notifications/read — clear the whole inbox (no body)
const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
    res.json({ message: 'All notifications read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update notifications' });
  }
};

// POST /api/admin/notifications/:id/read — one item
const markRead = async (req, res) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } });
    res.json({ message: 'Notification read' });
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: 'Notification not found' });
  }
};

module.exports = {
  listResources,
  createResource,
  updateResource,
  deleteResource,
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listNotifications,
  markAllRead,
  markRead,
};
