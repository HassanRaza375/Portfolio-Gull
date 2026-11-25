// POST /api/admin/projects -> creates a project at the end of the order.
import { projectInputSchema } from '../../../../shared/project'
import { useDb } from '../../../utils/db'
import { assertImagesAreOurs, isUniqueViolation, toProjectDto, toRowData, validationError, zodValidationError } from '../../../utils/projects'
import { refreshPublicPages } from '../../../utils/revalidate'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const parsed = projectInputSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw zodValidationError(parsed.error)
  const data = parsed.data
  assertImagesAreOurs(data)

  const db = useDb()
  try {
    const last = await db.project.aggregate({ _max: { sortOrder: true } })
    const row = await db.project.create({
      data: { ...toRowData(data), sortOrder: (last._max.sortOrder ?? -1) + 1 },
    })
    await refreshPublicPages(event, [row.slug])
    setResponseStatus(event, 201)
    return toProjectDto(row)
  } catch (err) {
    if (isUniqueViolation(err)) throw validationError({ slug: 'This page address is already used by another project.' })
    throw err
  }
})
