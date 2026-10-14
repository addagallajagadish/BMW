import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve('public')
const TARGETS = [
  path.join(ROOT, 'explosion-frames'),
  path.join(ROOT, 'videos'),
]

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function inpaintSparkle(data, width, height, channels) {
  const x0 = Math.floor(width * 0.84)
  const y0 = Math.floor(height * 0.78)
  const x1 = width
  const y1 = height

  const samples = []
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * channels
      samples.push(luminance(data[i], data[i + 1], data[i + 2]))
    }
  }
  samples.sort((a, b) => a - b)
  const bgL = samples[Math.floor(samples.length * 0.25)]
  const threshold = Math.max(bgL + 22, 42)

  const mask = new Uint8Array(width * height)
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let hits = 0

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels
      if (luminance(data[i], data[i + 1], data[i + 2]) > threshold) {
        mask[y * width + x] = 1
        hits++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (hits < 8) return { hits: 0 }

  const radius = Math.max(10, Math.round(Math.min(width, height) * 0.018))
  const dilated = new Uint8Array(width * height)
  for (let y = Math.max(0, minY - radius); y < Math.min(height, maxY + radius + 1); y++) {
    for (let x = Math.max(0, minX - radius); x < Math.min(width, maxX + radius + 1); x++) {
      if (!mask[y * width + x]) continue
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          dilated[ny * width + nx] = 1
        }
      }
    }
  }

  const sampleR = radius + 10
  const fillX0 = Math.max(0, minX - radius)
  const fillY0 = Math.max(0, minY - radius)
  const fillX1 = Math.min(width, maxX + radius + 1)
  const fillY1 = Math.min(height, maxY + radius + 1)
  for (let y = fillY0; y < fillY1; y++) {
    for (let x = fillX0; x < fillX1; x++) {
      if (!dilated[y * width + x]) continue
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let dy = -sampleR; dy <= sampleR; dy += 2) {
        for (let dx = -sampleR; dx <= sampleR; dx += 2) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          if (dilated[ny * width + nx]) continue
          const i = (ny * width + nx) * channels
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          if (channels > 3) a += data[i + 3]
          n++
        }
      }
      if (!n) continue
      const i = (y * width + x) * channels
      data[i] = Math.round(r / n)
      data[i + 1] = Math.round(g / n)
      data[i + 2] = Math.round(b / n)
      if (channels > 3) data[i + 3] = Math.round(a / n)
    }
  }

  return { hits, minX, minY, maxX, maxY }
}

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return null

  const image = sharp(filePath)
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const result = inpaintSparkle(data, info.width, info.height, info.channels)
  if (!result.hits) return { filePath, skipped: true }

  const pipeline = sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })

  if (ext === '.png') {
    await pipeline.png().toFile(filePath + '.tmp')
  } else {
    await pipeline.jpeg({ quality: 92, mozjpeg: true }).toFile(filePath + '.tmp')
  }
  fs.renameSync(filePath + '.tmp', filePath)
  return { filePath, ...result }
}

async function processDir(dir) {
  if (!fs.existsSync(dir)) return []
  const names = fs.readdirSync(dir)
  const results = []
  for (const name of names) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) continue
    const result = await processFile(full)
    if (result) results.push(result)
  }
  return results
}

const extraFiles = [
  path.join(ROOT, 'm4_top_view.jpg'),
  path.join(ROOT, 'm4_top_view_cutout.png'),
  path.join(ROOT, 'm4_top_view_test.png'),
]

const all = []
for (const dir of TARGETS) {
  all.push(...await processDir(dir))
}
for (const file of extraFiles) {
  if (fs.existsSync(file)) {
    const result = await processFile(file)
    if (result) all.push(result)
  }
}

const cleaned = all.filter((item) => !item.skipped)
const skipped = all.filter((item) => item.skipped)
console.log(`Cleaned ${cleaned.length} files, skipped ${skipped.length} with no sparkle.`)
if (cleaned[0]) {
  console.log('Example:', cleaned[0])
}
