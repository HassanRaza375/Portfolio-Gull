// POST /api/admin/uploads/sign { kind: "logo" | "cover" | "gallery" }
// Returns what the browser needs to upload one image straight to Cloudinary: cloudName, apiKey, timestamp, folder, allowedFormats, signature.
// The signature covers folder, allowed formats and timestamp. The API secret is never returned.
import { z } from 'zod'
import { IMAGE_KINDS } from '../../../../shared/project'
import { cloudinaryConfig, createUploadSignature } from '../../../utils/cloudinary'

const Body = z.object({ kind: z.enum(IMAGE_KINDS) })

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const parsed = Body.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  const cfg = cloudinaryConfig()
  if (!cfg) {
    console.error('[cloudinary] CLOUDINARY_URL or CLOUDINARY_FOLDER is missing or malformed')
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'Image uploads are not configured.' })
  }
  return createUploadSignature(cfg, parsed.data.kind)
})
