// POST /api/admin/projects/:id/move { direction: "up" | "down" } -> swaps the project with its neighbour in the Home order.
// The whole list is renumbered 0..n in one transaction, so two projects never share a sortOrder.
import { z } from 'zod'
import { useDb } from '../../../../utils/db'
import { projectIdParam, projectNotFound } from '../../../../utils/projects'
import { refreshPublicPages } from '../../../../utils/revalidate'

const Body = z.object({ direction: z.enum(['up', 'down']) })

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const id = projectIdParam(event)
  const parsed = Body.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const db = useDb()
  const rows = await db.project.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { id: true, sortOrder: true, slug: true } })
  const from = rows.findIndex((r) => r.id === id)
  if (from === -1) throw projectNotFound()
  const to = parsed.data.direction === 'up' ? from - 1 : from + 1
  if (to >= 0 && to < rows.length) {
    const reordered = [...rows]
    ;[reordered[from], reordered[to]] = [reordered[to]!, reordered[from]!]
    const changes = reordered.map((r, i) => ({ r, i })).filter(({ r, i }) => r.sortOrder !== i)
    await db.$transaction(changes.map(({ r, i }) => db.project.update({ where: { id: r.id }, data: { sortOrder: i } })))
    await refreshPublicPages(event, changes.map(({ r }) => r.slug))
  }
  return { ok: true }
})
