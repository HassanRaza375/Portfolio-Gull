// Cloudinary: signed browser uploads, ownership checks for stored images, and deleting.
// The API secret stays on the server: nothing here returns it, and sign responses are built from an explicit list of fields.
import { createHash } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'
import { ALLOWED_FORMATS, type ImageKind, type ProjectImage } from '../../shared/project'

export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
  /** The folder that keeps this project's images apart from other projects, with no leading or trailing slash. */
  folder: string
}

/** "cloudinary://<api_key>:<api_secret>@<cloud_name>" + a folder -> config, or null when either is missing or malformed. */
export function parseCloudinaryConfig(url: string | undefined, folder: string | undefined): CloudinaryConfig | null {
  if (!url || !folder) return null
  const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, '')
  if (!/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(cleanFolder)) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'cloudinary:') return null
    const cfg = { cloudName: u.hostname, apiKey: decodeURIComponent(u.username), apiSecret: decodeURIComponent(u.password), folder: cleanFolder }
    return cfg.cloudName && cfg.apiKey && cfg.apiSecret ? cfg : null
  } catch {
    return null
  }
}

/** The config from the environment, read at request time (never through runtimeConfig, so it cannot end up in the build output). */
export const cloudinaryConfig = (): CloudinaryConfig | null => parseCloudinaryConfig(process.env.CLOUDINARY_URL, process.env.CLOUDINARY_FOLDER)

export const folderFor = (cfg: Pick<CloudinaryConfig, 'folder'>, kind: ImageKind) => `${cfg.folder}/${kind}`

/** Cloudinary's signature: SHA-1 of the sorted "key=value" pairs joined with "&", followed directly by the API secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(toSign + apiSecret).digest('hex')
}

export interface UploadSignature {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  allowedFormats: string
  signature: string
  uploadUrl: string
}

/**
 * What the browser needs to upload one image straight to Cloudinary. The signature covers the folder, the allowed formats and the timestamp,
 * so the browser cannot upload anywhere else or send another file type. The fields are listed one by one: the secret is never part of the result.
 */
export function createUploadSignature(cfg: CloudinaryConfig, kind: ImageKind, now = Math.floor(Date.now() / 1000)): UploadSignature {
  const folder = folderFor(cfg, kind)
  const allowedFormats = ALLOWED_FORMATS[kind].join(',')
  const signature = signParams({ allowed_formats: allowedFormats, folder, timestamp: now }, cfg.apiSecret)
  return {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    timestamp: now,
    folder,
    allowedFormats,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
  }
}

/** True when the image is one of ours: a Cloudinary URL for our cloud, with a public ID inside our folder for that kind. */
export function ownsImage(cfg: Pick<CloudinaryConfig, 'cloudName' | 'folder'>, kind: ImageKind, image: ProjectImage): boolean {
  if (!image.publicId.startsWith(`${folderFor(cfg, kind)}/`) || image.publicId.includes('..')) return false
  const prefix = `https://res.cloudinary.com/${cfg.cloudName}/image/upload/`
  return image.url.startsWith(prefix) && image.url.includes(`/${image.publicId}`)
}

/** True when the public ID is inside our folder (for any kind). */
export const ownsPublicId = (cfg: Pick<CloudinaryConfig, 'folder'>, publicId: string) =>
  publicId.startsWith(`${cfg.folder}/`) && !publicId.includes('..')

/** An error message that is safe to log: the API key and secret removed, and short. */
export function safeMessage(err: unknown, cfg: Pick<CloudinaryConfig, 'apiKey' | 'apiSecret'>): string {
  let msg = String((err as { message?: unknown })?.message ?? 'unknown error')
  for (const secret of [cfg.apiSecret, cfg.apiKey]) if (secret) msg = msg.split(secret).join('[redacted]')
  return msg.replace(/\s+/g, ' ').slice(0, 200)
}

/** Deletes images from Cloudinary. Only IDs inside our folder are sent. Failures are logged, never thrown: a leftover file is harmless, a failed save is not. */
export async function deleteImages(publicIds: string[]): Promise<void> {
  const cfg = cloudinaryConfig()
  if (!cfg || !publicIds.length) return
  const ids = [...new Set(publicIds)].filter((id) => ownsPublicId(cfg, id))
  if (!ids.length) return
  cloudinary.config({ cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret, secure: true })
  for (let i = 0; i < ids.length; i += 100) {
    try {
      await cloudinary.api.delete_resources(ids.slice(i, i + 100), { resource_type: 'image', type: 'upload', invalidate: true })
    } catch (err) {
      console.error(`[cloudinary] could not delete ${ids.slice(i, i + 100).length} image(s): ${safeMessage(err, cfg)}`)
    }
  }
}
