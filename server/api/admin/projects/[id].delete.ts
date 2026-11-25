// DELETE /api/admin/projects/:id -> removes the project, then its images from Cloudinary.
import { deleteImages } from '../../../utils/cloudinary'
import { useDb } from '../../../utils/db'
import { projectIdParam, projectNotFound, publicIdsOf, toProjectDto } from '../../../utils/projects'
import { refreshPublicPages } from '../../../utils/revalidate'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const id = projectIdParam(event)
  const db = useDb()
  const row = await db.project.findUnique({ where: { id } })
  if (!row) throw projectNotFound()
  const project = toProjectDto(row)

  await db.project.delete({ where: { id } })
  await deleteImages(publicIdsOf(project)) // after the row is gone: a leftover image is harmless, a project with missing images is not
  await refreshPublicPages(event, [project.slug])
  return { ok: true }
})
