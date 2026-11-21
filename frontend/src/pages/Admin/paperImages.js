import { unzip } from 'fflate'
import { prepareImageUploads } from './testsApi.js'

/*
  Diagrams for a question paper. The admin chooses the questions JSON and a
  zip of the pictures it names ("image": "phy-q1.png" on a question, or on an
  option). Here, in the browser:
    1. find every picture the JSON names, and match it to the zip
       (by file name, ignoring folders and upper/lower case);
    2. shrink each one (max 1400 px, WebP) so students load less;
    3. upload them straight to Cloudflare R2 with signed links from our server;
    4. swap each file name in the JSON for the name the picture got in our
       bucket (q/202611/<hex>.webp). The server turns those into signed links
       whenever it sends the paper out.
  Names that are already uploaded (a paper saved earlier) are left as they are.
*/

const PICTURE = /\.(png|jpe?g|webp)$/i
const MAX_SIDE = 1400
// Already uploaded: our bucket's name for a picture (or a web address, which the server refuses)
const UPLOADED = /^q\/\d{6}\/[0-9a-f]{32}\.(webp|png|jpg)$/
const isLink = (s) => UPLOADED.test(s.trim()) || /^https?:\/\//i.test(s)
const baseName = (p) => p.split(/[\\/]/).pop()
const keyOf = (name) => baseName(String(name).trim()).toLowerCase()

/* Every question (with its place, like "Physics › Q3") in any accepted paper shape. */
function questionsOf(json) {
  const sections = Array.isArray(json)
    ? [{ name: 'Questions', questions: json }]
    : json && Array.isArray(json.sections)
      ? json.sections
      : json && Array.isArray(json.questions)
        ? [{ name: 'Questions', questions: json.questions }]
        : []
  return sections.flatMap((s, si) =>
    (Array.isArray(s && s.questions) ? s.questions : []).map((q, qi) => ({ q, where: `${(s && s.name) || 'Section ' + (si + 1)} › Q${qi + 1}` })),
  )
}

/* The pictures a paper names that still need uploading: [{ name, where }]. */
export function picturesNeeded(json) {
  const out = []
  for (const { q, where } of questionsOf(json)) {
    if (!q || typeof q !== 'object') continue
    const imgs = q.image == null ? [] : Array.isArray(q.image) ? q.image : [q.image]
    for (const v of imgs) if (typeof v === 'string' && v.trim() && !isLink(v)) out.push({ name: v.trim(), where })
    ;(Array.isArray(q.options) ? q.options : []).forEach((o, i) => {
      if (o && typeof o === 'object' && typeof o.image === 'string' && o.image.trim() && !isLink(o.image))
        out.push({ name: o.image.trim(), where: `${where} › option ${String.fromCharCode(65 + i)}` })
    })
  }
  return out
}

/* The zip's pictures by lower-case file name: Map(key -> { name, bytes }). */
export function readZip(file) {
  return file.arrayBuffer().then(
    (buf) =>
      new Promise((resolve, reject) => {
        unzip(new Uint8Array(buf), (err, files) => {
          if (err) return reject(new Error("That zip couldn't be opened. Make sure it's a .zip file of the diagrams."))
          const map = new Map()
          const twice = []
          for (const [path, bytes] of Object.entries(files)) {
            const name = baseName(path)
            if (!name || name.startsWith('.') || path.includes('__MACOSX') || !PICTURE.test(name) || !bytes.length) continue
            if (map.has(name.toLowerCase())) twice.push(name)
            map.set(name.toLowerCase(), { name, bytes })
          }
          if (twice.length) return reject(new Error(`The zip has more than one picture called ${twice.slice(0, 3).join(', ')}. Give every picture its own name.`))
          resolve(map)
        })
      }),
  )
}

const typeOf = (name) => (/\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg')

/* A smaller copy for students: at most 1400 px on its longer side, as WebP.
   Keeps the original when that is already smaller (or the browser can't
   convert). null when the file isn't a picture a browser can open (a damaged
   crop would only show students "Diagram couldn't load"). */
async function shrink({ name, bytes }) {
  const original = new Blob([bytes], { type: typeOf(name) })
  let bmp
  try {
    bmp = await createImageBitmap(original)
  } catch {
    return null
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * scale))
    canvas.height = Math.max(1, Math.round(bmp.height * scale))
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close && bmp.close()
    const webp = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.86))
    if (webp && webp.type === 'image/webp' && (webp.size < original.size || scale < 1)) return webp
  } catch {
    /* fall back to the original file */
  }
  return original
}

/* Runs `job` over items, `n` at a time. After the first failure no new job
   starts; the ones already running finish, then that first error is thrown
   (so nothing reports progress after the error is shown). */
async function pool(items, n, job) {
  let next = 0
  let failed = null
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length && !failed) {
        const i = next++
        try {
          await job(items[i], i)
        } catch (e) {
          failed = failed || e
        }
      }
    }),
  )
  if (failed) throw failed
}

/*
  The whole step for one paper. Returns { json, uploaded, unused } with the
  file names swapped for uploaded names, or throws an Error whose message (and
  `.errors` list) says exactly what to fix. onStep({ phase, done, total }).
*/
export async function attachPictures(json, zipFile, onStep = () => {}) {
  const needed = picturesNeeded(json)
  if (!needed.length) return { json, uploaded: 0, unused: [] }
  if (!zipFile) {
    const e = new Error(`This paper uses ${needed.length} picture${needed.length === 1 ? '' : 's'}. Choose the diagrams zip as well.`)
    e.errors = []
    throw e
  }
  const zip = await readZip(zipFile)
  const missing = needed.filter((p) => !zip.has(keyOf(p.name)))
  if (missing.length) {
    const e = new Error(`${missing.length} picture${missing.length === 1 ? ' is' : 's are'} missing from the zip.`)
    e.errors = missing.map((p) => `${p.where}: "${p.name}" isn't in the zip.`)
    throw e
  }
  const names = [...new Set(needed.map((p) => keyOf(p.name)))]
  const used = new Set(names)
  const unused = [...zip.values()].filter((f) => !used.has(f.name.toLowerCase())).map((f) => f.name)

  // 2. shrink
  const blobs = []
  let done = 0
  onStep({ phase: 'shrink', done, total: names.length })
  for (const k of names) {
    blobs.push(await shrink(zip.get(k)))
    onStep({ phase: 'shrink', done: ++done, total: names.length })
  }
  const broken = names.filter((k, i) => !blobs[i])
  if (broken.length) {
    const e = new Error(`${broken.length} picture${broken.length === 1 ? " can't" : "s can't"} be opened, so nothing was uploaded.`)
    e.errors = broken.map((k) => `"${zip.get(k).name}" isn't a readable picture. Save it again as PNG or JPG.`)
    throw e
  }
  const big = names.filter((k, i) => blobs[i].size > 5 * 1024 * 1024)
  if (big.length) {
    const e = new Error('Some pictures are too large even after shrinking (5 MB each at most).')
    e.errors = big.map((k) => `"${zip.get(k).name}" is too large.`)
    throw e
  }

  // 3. upload (signed links from our server, files straight to R2)
  const { files } = await prepareImageUploads(names.map((k, i) => ({ name: zip.get(k).name, type: blobs[i].type, size: blobs[i].size })))
  done = 0
  onStep({ phase: 'upload', done, total: names.length })
  await pool(names, 6, async (k, i) => {
    let ok = false
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const r = await fetch(files[i].putUrl, { method: 'PUT', body: blobs[i], headers: { 'Content-Type': blobs[i].type } })
        ok = r.ok
      } catch {
        ok = false
      }
    }
    if (!ok) throw new Error(`"${zip.get(k).name}" couldn't be uploaded. Check your internet connection and try again.`)
    onStep({ phase: 'upload', done: ++done, total: names.length })
  })

  // 4. swap the zip's file names for the names the pictures got in our bucket
  const link = new Map(names.map((k, i) => [k, files[i].key]))
  const swap = (v) => (typeof v === 'string' && !isLink(v) && link.has(keyOf(v)) ? link.get(keyOf(v)) : v)
  const out = JSON.parse(JSON.stringify(json))
  for (const { q } of questionsOf(out)) {
    if (!q || typeof q !== 'object') continue
    if (q.image != null) q.image = Array.isArray(q.image) ? q.image.map(swap) : swap(q.image)
    if (Array.isArray(q.options)) q.options.forEach((o) => o && typeof o === 'object' && o.image != null && (o.image = swap(o.image)))
  }
  return { json: out, uploaded: names.length, unused }
}
