// lib/storage.js
// Files on Cloudflare R2 (S3-compatible), in two PRIVATE buckets:
//   R2_IMAGES_BUCKET — question diagrams. A paper stores each picture's name
//                      (q/202611/<hex>.webp); whenever a paper is sent out the
//                      name becomes a signed link (imageLink) from R2's own
//                      full-speed address, so no public bucket or custom
//                      domain is needed and copied links stop working.
//   R2_FILES_BUCKET  — solution PDFs. Students get a link that works for
//                      10 minutes (presignGet).
// Files never pass through this server (Vercel caps request bodies at ~4.5 MB):
// the admin's browser uploads straight to R2 with a signed PUT link.
// Settings: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_IMAGES_BUCKET, R2_FILES_BUCKET (+ R2_ENDPOINT / R2_REGION only for testing
// against a local S3 server).

const crypto = require('crypto');
const { AwsClient } = require('aws4fetch');

const env = (k) => String(process.env[k] || '').trim();
const config = () => ({
  endpoint: (env('R2_ENDPOINT') || (env('R2_ACCOUNT_ID') ? `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com` : '')).replace(/\/+$/, ''),
  region:   env('R2_REGION') || 'auto',
  key:      env('R2_ACCESS_KEY_ID'),
  secret:   env('R2_SECRET_ACCESS_KEY'),
  images:   env('R2_IMAGES_BUCKET'),
  files:    env('R2_FILES_BUCKET'),
});

const ready = (c = config()) => !!(c.endpoint && c.key && c.secret);
const imagesReady = () => { const c = config(); return ready(c) && !!c.images; };
const filesReady = () => { const c = config(); return ready(c) && !!c.files; };

let client = null;
let clientFor = '';
const aws = (c) => {
  const id = c.key + c.region;
  if (!client || clientFor !== id) {
    client = new AwsClient({ accessKeyId: c.key, secretAccessKey: c.secret, service: 's3', region: c.region });
    clientFor = id;
  }
  return client;
};

const objectUrl = (c, bucket, key) => `${c.endpoint}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

// A link that lets its holder do `method` on one object for `seconds`,
// counted from `datetime` (default: now; format 20261121T120000Z).
const presign = async (bucket, key, method, seconds, query = {}, datetime) => {
  const c = config();
  const url = new URL(objectUrl(c, bucket, key));
  url.searchParams.set('X-Amz-Expires', String(seconds));
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const signed = await aws(c).sign(url.toString(), { method, aws: { signQuery: true, ...(datetime ? { datetime } : {}) } });
  return signed.url;
};

// Random, unguessable object names: diagrams must not be findable before a test opens.
const randomName = () => crypto.randomBytes(16).toString('hex');

const presignPut = (bucket, key) => presign(bucket, key, 'PUT', 600);

// A link to read a private file for 10 minutes, shown in the browser or downloaded.
const presignGet = (bucket, key, { filename = 'file.pdf', download = false, type = 'application/pdf' } = {}) =>
  presign(bucket, key, 'GET', 600, {
    'response-content-type': type,
    // ASCII fallback for old browsers, plus the real (e.g. Hindi) name for the rest
    'response-content-disposition': `${download ? 'attachment' : 'inline'}; filename="${filename.replace(/[^\x20-\x7E]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });

// Picture links: every link handed out in the same 6-hour window is the same
// (signed from the window's start), so browsers cache the pictures and 500
// students opening a test cost one signature per picture, not 500. Each link
// works for 24 hours from its window's start, so at least 18 hours after it is
// handed out, longer than any test (600 minutes at most).
const LINK_WINDOW_MS = 6 * 60 * 60 * 1000;
const LINK_LIFE_S    = 24 * 60 * 60;
let linkWindow = 0;
const links = new Map();
const imageLink = async (key) => {
  const start = Math.floor(Date.now() / LINK_WINDOW_MS) * LINK_WINDOW_MS;
  if (start !== linkWindow) {
    links.clear();
    linkWindow = start;
  }
  let url = links.get(key);
  if (!url) {
    const datetime = new Date(start).toISOString().replace(/[:-]|\.\d{3}/g, '');
    url = await presign(config().images, key, 'GET', LINK_LIFE_S, { 'response-cache-control': 'private, max-age=21600, immutable' }, datetime);
    if (links.size > 20000) links.clear();
    links.set(key, url);
  }
  return url;
};

// Size (bytes) of an uploaded object, or null when it isn't there.
const sizeOf = async (bucket, key) => {
  const c = config();
  const r = await aws(c).fetch(objectUrl(c, bucket, key), { method: 'HEAD' });
  return r.ok ? Number(r.headers.get('content-length')) || 0 : null;
};

// Best effort: a file that can't be removed only costs a little storage.
const removeAll = async (bucket, keys) => {
  const c = config();
  if (!ready(c) || !bucket) return;
  await Promise.allSettled([...new Set(keys)].map((key) => aws(c).fetch(objectUrl(c, bucket, key), { method: 'DELETE' })));
};

// A picture's name as our uploads create it (q/202611/<32 hex>.webp), or null
// for anything else, so a paper can't point at any other object.
const IMAGE_KEY = /^q\/\d{6}\/[0-9a-f]{32}\.(webp|png|jpg)$/;
const imageKeyOf = (v) => (typeof v === 'string' && IMAGE_KEY.test(v) ? v : null);

module.exports = {
  config, imagesReady, filesReady, randomName, presignPut, presignGet, imageLink, sizeOf, removeAll, imageKeyOf, IMAGE_KEY,
};
