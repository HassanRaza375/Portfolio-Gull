<script setup lang="ts">
// The project editor, used for /admin/projects/new (no id) and /admin/projects/[id].
import { fieldErrorsOf, projectInputSchema, slugify, type ProjectDto, type ProjectImage } from '#shared/project'

const props = defineProps<{ projectId?: number }>()

interface FormState {
  title: string
  slug: string
  summary: string
  description: string
  tags: string[]
  projectUrl: string
  published: boolean
  logo: ProjectImage | null
  cover: ProjectImage | null
  gallery: ProjectImage[]
}

const empty = (): FormState => ({ title: '', slug: '', summary: '', description: '', tags: [], projectUrl: '', published: false, logo: null, cover: null, gallery: [] })

const form = reactive<FormState>(empty())
const errors = ref<Record<string, string>>({})
const loading = ref(!!props.projectId)
const notFound = ref(false)
const saving = ref(false)
const formError = ref('')
const savedNote = ref('')
const slugTouched = ref(!!props.projectId) // an existing project keeps its address when the title changes
const savedImageIds = ref(new Set<string>()) // images already stored with the project (never deleted just by removing them in the form)
const { discard } = useImageUpload()
const flash = useState<string>('admin-flash', () => '')

const ids = { title: useId(), slug: useId(), summary: useId(), description: useId(), tags: useId(), projectUrl: useId(), published: useId() }
const errorId = (f: string) => `${f}-error-${ids.title}`
const described = (f: string, hint?: string) => [hint, errors.value[f] ? errorId(f) : ''].filter(Boolean).join(' ') || undefined

const idsOf = (p: Pick<ProjectDto, 'logo' | 'cover' | 'gallery'>) => new Set([p.logo, p.cover, ...p.gallery].filter((i): i is ProjectImage => !!i).map((i) => i.publicId))

function load(p: ProjectDto) {
  Object.assign(form, {
    title: p.title, slug: p.slug, summary: p.summary, description: p.description, tags: [...p.tags],
    projectUrl: p.projectUrl ?? '', published: p.published, logo: p.logo, cover: p.cover, gallery: [...p.gallery],
  })
  savedImageIds.value = idsOf(p)
}

onMounted(async () => {
  if (flash.value) {
    savedNote.value = flash.value
    flash.value = ''
  }
  if (!props.projectId) return
  try {
    load(await adminFetch<ProjectDto>(`/api/admin/projects/${props.projectId}`))
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 404) notFound.value = true
    else formError.value = messageFrom(e, 'Could not load this project.')
  } finally {
    loading.value = false
  }
})

watch(() => form.title, (title) => {
  if (!slugTouched.value) form.slug = slugify(title)
})

/** An image taken out of the form: delete it from Cloudinary right away only if it was never saved with the project. */
function release(image: ProjectImage) {
  if (!savedImageIds.value.has(image.publicId)) void discard(image)
}

async function save() {
  formError.value = ''
  savedNote.value = ''
  const check = projectInputSchema.safeParse(form)
  if (!check.success) {
    errors.value = fieldErrorsOf(check.error)
    await focusFirstError()
    return
  }
  errors.value = {}
  saving.value = true
  try {
    const saved = props.projectId
      ? await adminFetch<ProjectDto>(`/api/admin/projects/${props.projectId}`, { method: 'PUT', body: form })
      : await adminFetch<ProjectDto>('/api/admin/projects', { method: 'POST', body: form })
    savedImageIds.value = idsOf(saved)
    if (!props.projectId) {
      flash.value = 'Project created.'
      await navigateTo(`/admin/projects/${saved.id}`, { replace: true })
      return
    }
    load(saved)
    savedNote.value = 'Saved. Changes go live on the site within a minute.'
  } catch (e) {
    const fields = fieldErrorsFrom(e)
    if (Object.keys(fields).length) {
      errors.value = fields
      await focusFirstError()
    } else {
      formError.value = messageFrom(e, 'Could not save. Try again.')
    }
  } finally {
    saving.value = false
  }
}

async function focusFirstError() {
  await nextTick()
  const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
  first?.focus()
  if (!first) document.getElementById('form-error')?.focus()
}

const heading = computed(() => (props.projectId ? 'Edit project' : 'New project'))
</script>

<template>
  <main class="page-container py-10">
    <p v-if="loading" class="text-about-grey" role="status">Loading…</p>

    <div v-else-if="notFound" class="panel">
      <h1 class="text-2xl font-semibold">Project not found</h1>
      <p class="mt-2 text-about-grey">It may have been deleted.</p>
      <NuxtLink to="/admin" class="btn-primary mt-6">Back to projects</NuxtLink>
    </div>

    <form v-else novalidate @submit.prevent="save">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <NuxtLink to="/admin" class="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-about-grey">
            <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M7.5 2.5L4 6l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            Projects
          </NuxtLink>
          <h1 class="mt-1 text-[32px] font-semibold leading-tight">{{ heading }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <a v-if="projectId" :href="`/admin/preview/${projectId}`" target="_blank" rel="noopener" class="btn-outline">
            Preview<span class="sr-only"> (opens the last saved version in a new tab)</span>
          </a>
          <button type="submit" class="btn-primary focus-ring disabled:opacity-60" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </div>

      <p v-if="formError" id="form-error" tabindex="-1" role="alert" class="mt-4 rounded-xl bg-[#fee4e2] px-4 py-3 text-sm font-medium text-[#7a271a]">{{ formError }}</p>
      <p class="mt-4 min-h-6 text-sm font-medium text-[#14532d]" role="status" aria-live="polite">{{ savedNote }}</p>

      <div class="mt-2 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div class="panel space-y-6 p-8">
          <div>
            <label :for="ids.title" class="field-label">Title</label>
            <input :id="ids.title" v-model="form.title" type="text" class="field-input" required :aria-invalid="!!errors.title" :aria-describedby="described('title')">
            <p v-if="errors.title" :id="errorId('title')" role="alert" class="field-error">{{ errors.title }}</p>
          </div>

          <div>
            <label :for="ids.slug" class="field-label">URL slug</label>
            <input :id="ids.slug" v-model="form.slug" type="text" class="field-input" required autocapitalize="none" spellcheck="false" :aria-invalid="!!errors.slug" :aria-describedby="described('slug', `${ids.slug}-hint`)" @input="slugTouched = true">
            <p :id="`${ids.slug}-hint`" class="field-hint">Page address: /projects/{{ form.slug || 'your-slug' }}. Filled in from the title, editable.</p>
            <p v-if="errors.slug" :id="errorId('slug')" role="alert" class="field-error">{{ errors.slug }}</p>
          </div>

          <div>
            <label :for="ids.summary" class="field-label">Card summary</label>
            <textarea :id="ids.summary" v-model="form.summary" rows="3" class="field-input" required :aria-invalid="!!errors.summary" :aria-describedby="described('summary', `${ids.summary}-hint`)" />
            <p :id="`${ids.summary}-hint`" class="field-hint">Short text shown on the home page.</p>
            <p v-if="errors.summary" :id="errorId('summary')" role="alert" class="field-error">{{ errors.summary }}</p>
          </div>

          <div>
            <label :for="ids.description" class="field-label">Project description</label>
            <textarea :id="ids.description" v-model="form.description" rows="8" class="field-input" placeholder="Concept, tools used, your role, outcome." :aria-invalid="!!errors.description" :aria-describedby="described('description', `${ids.description}-hint`)" />
            <p :id="`${ids.description}-hint`" class="field-hint">Shown under the title on the project page. Blank lines make paragraphs.</p>
            <p v-if="errors.description" :id="errorId('description')" role="alert" class="field-error">{{ errors.description }}</p>
          </div>

          <div>
            <label :for="ids.tags" class="field-label">Tags</label>
            <TagInput v-model="form.tags" :id="ids.tags" :error="errors.tags" :described-by="described('tags')" />
            <p v-if="errors.tags" :id="errorId('tags')" role="alert" class="field-error">{{ errors.tags }}</p>
          </div>

          <div>
            <label :for="ids.projectUrl" class="field-label">Project URL</label>
            <input :id="ids.projectUrl" v-model="form.projectUrl" type="url" inputmode="url" class="field-input" placeholder="https://" :aria-invalid="!!errors.projectUrl" :aria-describedby="described('projectUrl', `${ids.projectUrl}-hint`)">
            <p :id="`${ids.projectUrl}-hint`" class="field-hint">Opens from the "Visit project" button on the project page. Leave empty to hide the button.</p>
            <p v-if="errors.projectUrl" :id="errorId('projectUrl')" role="alert" class="field-error">{{ errors.projectUrl }}</p>
          </div>

          <div class="flex items-center gap-3">
            <input :id="ids.published" v-model="form.published" type="checkbox" class="focus-ring size-5 accent-black">
            <label :for="ids.published" class="text-base font-semibold">Published (visible on the site)</label>
          </div>
        </div>

        <div class="space-y-6">
          <ImageField v-model="form.logo" kind="logo" label="Client logo" hint="SVG or PNG, small. Shown above the title on the card." :error="errors.logo" :alt="`${form.title || 'Project'} logo`" @release="release" />
          <ImageField v-model="form.cover" kind="cover" label="Cover image" hint="Shown on the home page card. Required to publish." :error="errors.cover" :alt="`${form.title || 'Project'} cover`" @release="release" />
          <GalleryEditor v-model="form.gallery" :title="form.title" :error="errors.gallery" @release="release" />
        </div>
      </div>
    </form>
  </main>
</template>
