// Project rows <-> the DTO the admin API returns, and the Cloudinary ownership check for a project's images.
import { Prisma, type Project } from '../generated/prisma/client'
import { imageSchema, type ImageKind, type ProjectData, type ProjectDto, type ProjectImage, fieldErrorsOf } from '../../shared/project'
import { z } from 'zod'
import { cloudinaryConfig, ownsImage } from './cloudinary'

/** JSON column -> a list of images (anything malformed becomes an empty list). */
export const galleryOf = (value: unknown): ProjectImage[] => {
  const parsed = z.array(imageSchema).safeParse(value)
  return parsed.success ? parsed.data : []
}
/** JSON column -> one image, or null. */
export const imageOrNull = (value: unknown): ProjectImage | null => {
  const parsed = imageSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
const imageOf = imageOrNull

export function toProjectDto(row: Project): ProjectDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    tags: row.tags,
    projectUrl: row.projectUrl,
    logo: imageOf(row.logo),
    cover: imageOf(row.cover),
    gallery: galleryOf(row.gallery),
    sortOrder: row.sortOrder,
    published: row.published,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Validated form data -> the columns to write. An optional JSON column needs Prisma.DbNull, not null, to store "no value". */
export function toRowData(data: ProjectData) {
  return {
    title: data.title,
    slug: data.slug,
    summary: data.summary,
    description: data.description,
    tags: data.tags,
    projectUrl: data.projectUrl,
    logo: data.logo ?? Prisma.DbNull,
    cover: data.cover ?? Prisma.DbNull,
    gallery: data.gallery,
    published: data.published,
  }
}

/** Every Cloudinary public ID a project uses. */
export const publicIdsOf = (p: Pick<ProjectData, 'logo' | 'cover' | 'gallery'>): string[] =>
  [p.logo, p.cover, ...p.gallery].filter((i): i is ProjectImage => !!i).map((i) => i.publicId)

/** 422 with { fieldErrors } in the body, which the editor shows next to each field. */
export const validationError = (fieldErrors: Record<string, string>) =>
  createError({ statusCode: 422, statusMessage: 'Unprocessable Content', message: 'Check the highlighted fields.', data: { fieldErrors } })

export const zodValidationError = (error: z.ZodError) => validationError(fieldErrorsOf(error))

export const projectNotFound = () => createError({ statusCode: 404, statusMessage: 'Not Found', data: { code: 'project_not_found' } })

/** The id in the URL, as a positive integer (404 otherwise). */
export function projectIdParam(event: Parameters<typeof getRouterParam>[0]): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) throw projectNotFound()
  return id
}

/** Refuses images that are not ours (another cloud, another folder, or the wrong sub-folder for the field). */
export function assertImagesAreOurs(data: Pick<ProjectData, 'logo' | 'cover' | 'gallery'>): void {
  const checks: Array<[string, ImageKind, ProjectImage]> = []
  if (data.logo) checks.push(['logo', 'logo', data.logo])
  if (data.cover) checks.push(['cover', 'cover', data.cover])
  data.gallery.forEach((img) => checks.push(['gallery', 'gallery', img]))
  if (!checks.length) return
  const cfg = cloudinaryConfig()
  if (!cfg) throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'Image storage is not configured.' })
  for (const [field, kind, image] of checks) {
    if (!ownsImage(cfg, kind, image)) throw validationError({ [field]: 'This image was not uploaded through the editor. Upload it again.' })
  }
}

/** True for Prisma's unique-constraint error. */
export const isUniqueViolation = (err: unknown): boolean => (err as { code?: string })?.code === 'P2002'
