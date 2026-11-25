// npm run optimize-images
// Builds the hero portrait files from the original (docs/source-images/gull_main.png, 840 x 1086, transparent background):
//   - grayscale baked in (the old site applied a CSS filter in the browser; this is smaller and free at runtime)
//   - AVIF and WebP, at the displayed width (560 px) and the original's own width (840 px, the 2x source: never upscaled)
//   - a 1200 x 630 social-sharing image (public/og.jpg)
// Outputs go to app/assets/images, where Vite fingerprints them and the CDN caches them for a year. Run it again only if the source image changes.
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const SOURCE = 'docs/source-images/gull_main.png'
const OUT = 'app/assets/images'
mkdirSync(OUT, { recursive: true })

const { width, height } = await sharp(SOURCE).metadata()
console.log(`source: ${width} x ${height}`)

const sizes = [560, width] // 560 = displayed width, width = the 2x source (capped at the file's own width)
for (const w of sizes) {
  const base = sharp(SOURCE).grayscale().resize({ width: w })
  await base.clone().avif({ quality: 55, effort: 6 }).toFile(`${OUT}/gull-${w}.avif`)
  await base.clone().webp({ quality: 82, effort: 6 }).toFile(`${OUT}/gull-${w}.webp`)
  console.log(`gull-${w}: avif + webp, ${w} x ${Math.round((w * height) / width)}`)
}

// Social image: the portrait on the site's light blue, with the name and role.
const portrait = await sharp(SOURCE).grayscale().resize({ height: 600 }).png().toBuffer()
const svg = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#f2f6fb"/>
    <text x="80" y="290" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="700" fill="#000">Hafiz Gull</text>
    <text x="80" y="360" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="500" fill="#4a4a4a">Lead Product Designer</text>
    <text x="80" y="410" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#4a4a4a">UX and product design case studies</text>
  </svg>`)
await sharp(svg)
  .composite([{ input: portrait, left: 1200 - 464 - 60, top: 30 }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile('public/og.jpg')
console.log('public/og.jpg written')
