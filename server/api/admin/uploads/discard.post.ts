// POST /api/admin/uploads/discard { publicId }
// Deletes an image that was uploaded in the editor but never saved (the person removed or replaced it before saving).
// Refused when the image is inside our folder but already used by a project, so a saved image can only be removed by saving the project.
import { z } from 'zod'
import { cloudinaryConfig, deleteImages, ownsPublicId } from '../../../utils/cloudinary'
import { useDb } from '../../../utils/db'

const Body = z.object({ publicId: z.string().min(1).max(300) })

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const parsed = Body.safeParse(await readBody(event).catch(() => null))
  const cfg = cloudinaryConfig()
  if (!parsed.success || !cfg || !ownsPublicId(cfg, parsed.data.publicId)) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  const { publicId } = parsed.data

  const inUse = await useDb().project.count({
    where: {
      OR: [
        { logo: { path: ['publicId'], equals: publicId } },
        { cover: { path: ['publicId'], equals: publicId } },
        { gallery: { array_contains: [{ publicId }] } },
      ],
    },
  })
  if (inUse) throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'This image is used by a saved project.' })

  await deleteImages([publicId])
  return { ok: true }
})
