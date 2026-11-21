// lib/storage.js
// Files on Cloudflare R2 (S3-compatible), in two buckets:
//   R2_IMAGES_BUCKET — question diagrams. Public, read through R2_IMAGES_URL
//                      (img.testverse.in, or the bucket's r2.dev address).
//   R2_FILES_BUCKET  — solution PDFs. Private: students get a link that
//                      works for 10 minutes (presignGet).
// Files never pass through this server (Vercel caps request bodies at ~4.5 MB):
// the admin's browser uploads straight to R2 with a signed PUT link.
// Settings: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_IMAGES_BUCKET, R2_IMAGES_URL, R2_FILES_BUCKET (+ R2_ENDPOINT / R2_REGION
// only for testing against a local S3 server).

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
  imageUrl: env('R2_IMAGES_URL').replace(/\/+$/, ''),
  // Earlier image addresses (comma-separated), e.g. the r2.dev URL after moving
  // to img.testverse.in: papers saved before the move keep working.
  oldImageUrls: env('R2_IMAGES_OLD_URLS').split(',').map((u) => u.trim().replace(/\/+$/, '')).filter(Boolean),
});

const ready = (c = config()) => !!(c.endpoint && c.key && c.secret);
const imagesReady = () => { const c = config(); return ready(c) && !!(c.images && c.imageUrl); };
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

// A link that lets its holder do `method` on one object for `seconds`.
const presign = async (bucket, key, method, seconds, query = {}) => {
  const c = config();
  const url = new URL(objectUrl(c, bucket, key));
  url.searchParams.set('X-Amz-Expires', String(seconds));
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const signed = await aws(c).sign(url.toString(), { method, aws: { signQuery: true } });
  return signed.url;
};

// Random, unguessable object names: diagrams must not be findable before a test opens.
const randomName = () => crypto.randomBytes(16).toString('hex');

const presignPut = (bucket, key) => presign(bucket, key, 'PUT', 600);

// A link to read a private file for 10 minutes, shown in the browser or downloaded.
const presignGet = (bucket, key, { filename = 'file.pdf', download = false, type = 'application/pdf' } = {}) =>
  presign(bucket, key, 'GET', 600, {
    'response-content-type': type,
    'response-content-disposition': `${download ? 'attachment' : 'inline'}; filename="${filename.replace(/["\\\r\n]/g, '')}"`,
  });

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

const imageUrlOf = (key) => `${config().imageUrl}/${key}`;
// The object name behind one of our public image links (current or earlier
// address), or null for any other address.
const imageKeyOf = (url) => {
  if (typeof url !== 'string') return null;
  const c = config();
  const base = [c.imageUrl, ...c.oldImageUrls].find((b) => b && url.startsWith(b + '/'));
  return base ? decodeURIComponent(url.slice(base.length + 1)) : null;
};

module.exports = {
  config, imagesReady, filesReady, randomName, presignPut, presignGet, sizeOf, removeAll, imageUrlOf, imageKeyOf,
};
