// PUT /api/admin/projects/:id -> saves a project. Images that were removed are deleted from Cloudinary after the save succeeds.
import { projectInputSchema } from '../../../../shared/project'
import { deleteImages } from '../../../utils/cloudinary'
import { useDb } from '../../../utils/db'
import { assertImagesAreOurs, isUniqueViolation, projectIdParam, projectNotFound, publicIdsOf, toProjectDto, toRowData, validationError, zodValidationError } from '../../../utils/projects'
import { refreshPublicPages } from '../../../utils/revalidate'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const id = projectIdParam(event)
  const parsed = projectInputSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw zodValidationError(parsed.error)
  const data = parsed.data
  assertImagesAreOurs(data)

  const db = useDb()
  const before = await db.project.findUnique({ where: { id } })
  if (!before) throw projectNotFound()
  const old = toProjectDto(before)

  let row
  try {
    row = await db.project.update({ where: { id }, data: toRowData(data) })
  } catch (err) {
    if (isUniqueViolation(err)) throw validationError({ slug: 'This page address is already used by another project.' })
    throw err
  }

  // images that are no longer used by this project (and by no other)
  const kept = new Set(publicIdsOf(data))
  const removed = publicIdsOf(old).filter((p) => !kept.has(p))
  await deleteImages(removed)

  await refreshPublicPages(event, [old.slug, row.slug])
  return toProjectDto(row)
})
