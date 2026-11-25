// Delivery URLs for public Cloudinary images: automatic format and quality, and a width that fits the screen.
// Auto-imported on both sides (app and server). A URL that is not a Cloudinary upload URL is returned unchanged.

export interface CldOptions {
  /** Output width in pixels. */
  width?: number
  /** Output height in pixels. Together with a width the image is cropped to fill that box ("c_fill"). With only one of the two it is never cropped or upscaled. */
  height?: number
}

const UPLOAD = '/image/upload/'

export function cldUrl(url: string, { width, height }: CldOptions = {}): string {
  const i = url.indexOf(UPLOAD)
  if (i === -1 || !url.startsWith('https://res.cloudinary.com/')) return url
  const t = ['f_auto', 'q_auto']
  if (width) t.push(`w_${Math.round(width)}`)
  if (height) t.push(`h_${Math.round(height)}`)
  t.push(width && height ? 'c_fill' : 'c_limit') // a box is filled (cropped); a single dimension only limits: never upscaled, never cropped
  return `${url.slice(0, i + UPLOAD.length)}${t.join(',')}/${url.slice(i + UPLOAD.length)}`
}

/** "url 640w, url 1088w, ..." for an <img srcset>. Heights, when given, keep the same aspect ratio as the base. */
export function cldSrcset(url: string, widths: number[], aspect?: number): string {
  return widths.map((w) => `${cldUrl(url, { width: w, height: aspect ? w / aspect : undefined })} ${w}w`).join(', ')
}
