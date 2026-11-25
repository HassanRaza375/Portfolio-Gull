// Project shapes and validation, used by BOTH the admin form (to show errors next to the field) and the server routes (which are the real authority).
import { z } from 'zod'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const IMAGE_KINDS = ['logo', 'cover', 'gallery'] as const
export type ImageKind = (typeof IMAGE_KINDS)[number]

/** File types allowed per kind (the design: PNG, JPG, WebP; SVG for logos). */
export const ALLOWED_FORMATS: Record<ImageKind, string[]> = {
  logo: ['png', 'jpg', 'webp', 'svg'],
  cover: ['png', 'jpg', 'webp'],
  gallery: ['png', 'jpg', 'webp'],
}
export const ALLOWED_MIME: Record<ImageKind, string[]> = {
  logo: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  cover: ['image/png', 'image/jpeg', 'image/webp'],
  gallery: ['image/png', 'image/jpeg', 'image/webp'],
}

/** One stored image. width and height are the real pixel size, used on public pages to reserve space. */
export const imageSchema = z.object({
  url: z.string().url().max(600),
  publicId: z.string().min(1).max(300),
  width: z.number().int().positive().max(30000),
  height: z.number().int().positive().max(200000),
})
export type ProjectImage = z.infer<typeof imageSchema>

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** "78% improvement in usability, for SAT Japan!" -> "78-improvement-in-usability-for-sat-japan" */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export const projectInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title.').max(160, 'Keep the title under 160 characters.'),
    slug: z
      .string()
      .trim()
      .min(1, 'Enter a page address.')
      .max(80, 'Keep the address under 80 characters.')
      .regex(slugPattern, 'Use lowercase letters, numbers and single hyphens, like my-project.'),
    summary: z.string().trim().min(1, 'Enter a card summary.').max(400, 'Keep the summary under 400 characters.'),
    description: z.string().trim().max(10000, 'Keep the description under 10,000 characters.').default(''),
    tags: z
      .array(z.string().trim().min(1).max(30, 'Keep each tag under 30 characters.'))
      .max(8, 'Use at most 8 tags.')
      .default([])
      .transform((tags) => {
        const seen = new Set<string>()
        return tags.filter((t) => {
          const k = t.toLowerCase()
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
      }),
    projectUrl: z
      .string()
      .nullish()
      .transform((v) => (v ?? '').trim() || null)
      .refine((v) => v === null || (v.length <= 500 && isHttpUrl(v)), 'Enter a full address starting with https://'),
    logo: imageSchema.nullable().default(null),
    cover: imageSchema.nullable().default(null),
    gallery: z.array(imageSchema).max(200, 'Use at most 200 images.').default([]),
    published: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.published && !v.cover) {
      ctx.addIssue({ code: 'custom', path: ['cover'], message: 'Add a cover image before publishing.' })
    }
  })

export type ProjectInput = z.input<typeof projectInputSchema>
export type ProjectData = z.output<typeof projectInputSchema>

/** A project as the admin API returns it. */
export interface ProjectDto extends ProjectData {
  id: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** What a Home card needs (no gallery, so Home stays light). */
export interface PublicCard {
  slug: string
  title: string
  summary: string
  tags: string[]
  logo: ProjectImage | null
  cover: ProjectImage | null
}

/** What a public project page needs. `next` is the next published project in Home order, or null on the last one. */
export interface PublicProject extends PublicCard {
  description: string
  projectUrl: string | null
  gallery: ProjectImage[]
  next: { slug: string, title: string } | null
}

/** The project after `slug` in a list that is already in Home order, or null for the last one (or an unknown slug). */
export function nextInOrder<T extends { slug: string }>(ordered: T[], slug: string): T | null {
  const i = ordered.findIndex((p) => p.slug === slug)
  return i === -1 ? null : (ordered[i + 1] ?? null)
}

/** Zod issues -> { fieldName: first message }. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
