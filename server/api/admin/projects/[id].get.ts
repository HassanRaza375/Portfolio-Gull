// GET /api/admin/projects/:id -> one project, drafts included. Also what the editor's Preview page reads (admin-only, never cached).
import { useDb } from '../../../utils/db'
import { projectIdParam, projectNotFound, toProjectDto } from '../../../utils/projects'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const id = projectIdParam(event) // checked before the database is touched
  const row = await useDb().project.findUnique({ where: { id } })
  if (!row) throw projectNotFound()
  return toProjectDto(row)
})
