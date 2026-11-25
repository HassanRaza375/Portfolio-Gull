// Unit tests for step 4: project validation, Cloudinary signing and ownership, delivery URLs, and page-refresh paths. No network, no database.
import { v2 as cloudinary } from 'cloudinary'
import { describe, expect, it, vi } from 'vitest'
import { cldSrcset, cldUrl } from '../shared/utils/cloudinaryUrl'
import { nextInOrder, projectInputSchema, slugify, type ProjectImage } from '../shared/project'
import { createUploadSignature, ownsImage, ownsPublicId, parseCloudinaryConfig, signParams } from '../server/utils/cloudinary'
import { affectedPaths, revalidatePaths } from '../server/utils/revalidate'

const CFG = parseCloudinaryConfig('cloudinary://123456:s3cr3t-value@democloud', 'portfolio-gull')!
const img = (kind: string, id = 'abc123'): ProjectImage => ({
  url: `https://res.cloudinary.com/democloud/image/upload/v1700000000/portfolio-gull/${kind}/${id}.png`,
  publicId: `portfolio-gull/${kind}/${id}`,
  width: 1600,
  height: 900,
})
const valid = { title: 'A project', slug: 'a-project', summary: 'Short text', description: '', tags: [], projectUrl: '', published: false, logo: null, cover: null, gallery: [] }

describe('slugify', () => {
  it('makes a clean address from a title', () => {
    expect(slugify('78% improvement in usability, with a redesign for SAT Japan!')).toBe('78-improvement-in-usability-with-a-redesign-for-sat-japan')
    expect(slugify('  Café  Menu  ')).toBe('cafe-menu')
    expect(slugify('---')).toBe('')
  })
  it('never ends with a hyphen after cutting to 80 characters', () => {
    const s = slugify('word '.repeat(40))
    expect(s.length).toBeLessThanOrEqual(80)
    expect(s.endsWith('-')).toBe(false)
  })
})

describe('project validation', () => {
  it('accepts a minimal draft', () => {
    expect(projectInputSchema.safeParse(valid).success).toBe(true)
  })

  it('shows an error for each missing field', () => {
    const r = projectInputSchema.safeParse({ ...valid, title: ' ', slug: '', summary: '' })
    expect(r.success).toBe(false)
    const fields = r.error!.issues.map((i) => i.path[0])
    expect(fields).toEqual(expect.arrayContaining(['title', 'slug', 'summary']))
  })

  it('rejects slugs that are not lowercase words with single hyphens', () => {
    for (const slug of ['Has Space', 'UPPER', 'a--b', '-a', 'a-', '../x', 'a/b']) {
      expect(projectInputSchema.safeParse({ ...valid, slug }).success, slug).toBe(false)
    }
  })

  it('needs a cover image to publish, but not for a draft', () => {
    const r = projectInputSchema.safeParse({ ...valid, published: true })
    expect(r.success).toBe(false)
    expect(r.error!.issues[0]!.path).toEqual(['cover'])
    expect(projectInputSchema.safeParse({ ...valid, published: true, cover: img('cover') }).success).toBe(true)
  })

  it('turns an empty project URL into null and accepts only http(s) addresses', () => {
    expect(projectInputSchema.parse({ ...valid, projectUrl: '  ' }).projectUrl).toBeNull()
    expect(projectInputSchema.parse({ ...valid, projectUrl: 'https://example.com/x' }).projectUrl).toBe('https://example.com/x')
    for (const bad of ['javascript:alert(1)', 'example.com', 'ftp://example.com', 'data:text/html,x']) {
      expect(projectInputSchema.safeParse({ ...valid, projectUrl: bad }).success, bad).toBe(false)
    }
  })

  it('removes duplicate tags (ignoring case) and limits their number', () => {
    expect(projectInputSchema.parse({ ...valid, tags: ['UX Design', 'ux design', 'Research'] }).tags).toEqual(['UX Design', 'Research'])
    expect(projectInputSchema.safeParse({ ...valid, tags: Array.from({ length: 9 }, (_, i) => `t${i}`) }).success).toBe(false)
  })

  it('needs real image data (positive whole-number size)', () => {
    expect(projectInputSchema.safeParse({ ...valid, gallery: [{ ...img('gallery'), width: 0 }] }).success).toBe(false)
    expect(projectInputSchema.safeParse({ ...valid, gallery: [{ ...img('gallery'), url: 'not a url' }] }).success).toBe(false)
  })
})

describe('Cloudinary config', () => {
  it('parses the URL and folder', () => {
    expect(CFG).toEqual({ cloudName: 'democloud', apiKey: '123456', apiSecret: 's3cr3t-value', folder: 'portfolio-gull' })
  })
  it('is null when anything is missing or malformed', () => {
    expect(parseCloudinaryConfig(undefined, 'f')).toBeNull()
    expect(parseCloudinaryConfig('cloudinary://k:s@c', '')).toBeNull()
    expect(parseCloudinaryConfig('https://k:s@c', 'f')).toBeNull()
    expect(parseCloudinaryConfig('cloudinary://k@c', 'f')).toBeNull()
    expect(parseCloudinaryConfig('cloudinary://k:s@c', '../etc')).toBeNull()
  })
})

describe('signed uploads', () => {
  it('matches the signature Cloudinary\'s own SDK produces', () => {
    const params = { allowed_formats: 'png,jpg,webp', folder: 'portfolio-gull/gallery', timestamp: 1_700_000_000 }
    expect(signParams(params, CFG.apiSecret)).toBe(cloudinary.utils.api_sign_request(params, CFG.apiSecret))
  })

  it('signs folder, allowed formats and timestamp for the right folder and file types', () => {
    const s = createUploadSignature(CFG, 'gallery', 1_700_000_000)
    expect(s.folder).toBe('portfolio-gull/gallery')
    expect(s.allowedFormats).toBe('png,jpg,webp')
    expect(s.signature).toBe(cloudinary.utils.api_sign_request({ allowed_formats: s.allowedFormats, folder: s.folder, timestamp: s.timestamp }, CFG.apiSecret))
    expect(createUploadSignature(CFG, 'logo').allowedFormats).toContain('svg')
    expect(createUploadSignature(CFG, 'cover').allowedFormats).not.toContain('svg')
  })

  it('returns cloudName and apiKey but never the API secret', () => {
    const s = createUploadSignature(CFG, 'cover')
    expect(s.cloudName).toBe('democloud')
    expect(s.apiKey).toBe('123456')
    expect(JSON.stringify(s)).not.toContain(CFG.apiSecret)
    expect(Object.keys(s).sort()).toEqual(['allowedFormats', 'apiKey', 'cloudName', 'folder', 'signature', 'timestamp', 'uploadUrl'])
  })
})

describe('site address', () => {
  it('never ends with a slash, so "${origin}/about" has no double slash', async () => {
    const { siteOrigin } = await import('../shared/utils/siteUrl')
    expect(siteOrigin('https://example.com/')).toBe('https://example.com')
    expect(siteOrigin('https://example.com///')).toBe('https://example.com')
    expect(siteOrigin('  https://example.com  ')).toBe('https://example.com')
    expect(siteOrigin('https://example.com')).toBe('https://example.com')
    expect(siteOrigin(undefined)).toBe('')
  })
})

describe('safe log messages', () => {
  it('removes the Cloudinary secret and key from an error message and keeps it short', async () => {
    const { safeMessage } = await import('../server/utils/cloudinary')
    const msg = safeMessage(new Error(`Invalid signature for ${CFG.apiKey} using ${CFG.apiSecret} ` + 'x'.repeat(500)), CFG)
    expect(msg).not.toContain(CFG.apiSecret)
    expect(msg).not.toContain(CFG.apiKey)
    expect(msg.length).toBeLessThanOrEqual(200)
  })
})

describe('image ownership', () => {
  it('accepts images in our cloud and folder, for the right field', () => {
    expect(ownsImage(CFG, 'gallery', img('gallery'))).toBe(true)
    expect(ownsImage(CFG, 'logo', img('logo'))).toBe(true)
  })
  it('refuses another cloud, another folder, the wrong field, and path tricks', () => {
    const other = { ...img('gallery'), url: img('gallery').url.replace('democloud', 'someoneelse') }
    expect(ownsImage(CFG, 'gallery', other)).toBe(false)
    expect(ownsImage(CFG, 'gallery', { ...img('gallery'), publicId: 'other-project/gallery/x', url: 'https://res.cloudinary.com/democloud/image/upload/v1/other-project/gallery/x.png' })).toBe(false)
    expect(ownsImage(CFG, 'cover', img('gallery'))).toBe(false)
    expect(ownsImage(CFG, 'gallery', { ...img('gallery'), publicId: 'portfolio-gull/gallery/../../other/x' })).toBe(false)
    expect(ownsImage(CFG, 'gallery', { ...img('gallery'), url: 'https://evil.example/portfolio-gull/gallery/abc123.png' })).toBe(false)
  })
  it('only lets us delete public IDs inside our folder', () => {
    expect(ownsPublicId(CFG, 'portfolio-gull/cover/x')).toBe(true)
    expect(ownsPublicId(CFG, 'portfolio-gull-other/x')).toBe(false)
    expect(ownsPublicId(CFG, 'sample')).toBe(false)
    expect(ownsPublicId(CFG, 'portfolio-gull/../sample')).toBe(false)
  })
})

describe('delivery URLs', () => {
  const url = 'https://res.cloudinary.com/democloud/image/upload/v1700000000/portfolio-gull/gallery/abc.png'
  it('adds automatic format and quality, and a width that never crops or upscales', () => {
    expect(cldUrl(url, { width: 1088 })).toBe('https://res.cloudinary.com/democloud/image/upload/f_auto,q_auto,w_1088,c_limit/v1700000000/portfolio-gull/gallery/abc.png')
  })
  it('crops to fill only when both a width and a height are given (cards and thumbnails)', () => {
    expect(cldUrl(url, { width: 520, height: 443 })).toContain('w_520,h_443,c_fill')
  })
  it('limits (never crops or upscales) when only a height is given, as for small logos', () => {
    expect(cldUrl(url, { height: 80 })).toContain('f_auto,q_auto,h_80,c_limit/')
  })
  it('leaves other URLs unchanged', () => {
    expect(cldUrl('https://example.com/a.png', { width: 100 })).toBe('https://example.com/a.png')
  })
  it('builds a srcset', () => {
    const set = cldSrcset(url, [640, 1088])
    expect(set).toContain('w_640,c_limit')
    expect(set).toMatch(/ 640w, .* 1088w$/)
  })
})

describe('next project', () => {
  const ordered = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]
  it('is the project after this one in Home order', () => {
    expect(nextInOrder(ordered, 'a')).toEqual({ slug: 'b' })
    expect(nextInOrder(ordered, 'b')).toEqual({ slug: 'c' })
  })
  it('is null on the last project (Next is hidden) and for an unknown slug', () => {
    expect(nextInOrder(ordered, 'c')).toBeNull()
    expect(nextInOrder(ordered, 'zzz')).toBeNull()
    expect(nextInOrder([], 'a')).toBeNull()
  })
})

describe('page refresh after a save', () => {
  it('refreshes Home, the changed pages, and every published project page, once each', () => {
    expect(affectedPaths({ slugs: ['old', 'new'], publishedSlugs: ['new', 'other'] })).toEqual(['/', '/projects/old', '/projects/new', '/projects/other'])
  })

  it('does nothing but log when there is no token', async () => {
    const fetch = vi.fn()
    const log = vi.fn()
    expect(await revalidatePaths(['/'], { token: undefined, origin: 'http://x', fetch, log })).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
    expect(log.mock.calls[0]![0]).toContain('no REVALIDATE_TOKEN')
  })

  it('sends the bypass-token header for each path and reports failures without throwing', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/bad')) throw new Error('network')
      return { ok: !url.endsWith('/500'), status: url.endsWith('/500') ? 500 : 200 }
    })
    const log = vi.fn()
    const failed = await revalidatePaths(['/', '/ok', '/500', '/bad'], { token: 'tok', origin: 'https://site.example', fetch, log })
    expect(failed.sort()).toEqual(['/500', '/bad'])
    expect(fetch).toHaveBeenCalledWith('https://site.example/', expect.objectContaining({ headers: { 'x-prerender-revalidate': 'tok' } }))
    expect(log).toHaveBeenCalled()
  })
})
