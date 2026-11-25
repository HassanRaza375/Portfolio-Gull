// GET /api/admin/projects -> every project (drafts too) in the order shown on Home.
import { useDb } from '../../../utils/db'
import { toProjectDto } from '../../../utils/projects'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const rows = await useDb().project.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  return rows.map(toProjectDto)
})
