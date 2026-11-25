<script setup lang="ts">
// The project gallery: upload many images, drag them into order (or use the Move buttons, which work with a keyboard), remove them one by one.
import { ALLOWED_MIME, type ProjectImage } from '#shared/project'

const props = defineProps<{ modelValue: ProjectImage[], error?: string, title: string }>()
const emit = defineEmits<{
  'update:modelValue': [images: ProjectImage[]]
  release: [image: ProjectImage]
}>()

interface UploadRow { key: number, name: string, progress: number, error: string }

const { upload } = useImageUpload()
const input = ref<HTMLInputElement | null>(null)
const rows = ref<UploadRow[]>([])
const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)
const fileDragging = ref(false)
const announce = ref('')
const inputId = useId()
const errorId = useId()
let nextKey = 1

const accept = ALLOWED_MIME.gallery.join(',')
const widths = computed(() => [...new Set(props.modelValue.map((i) => i.width))])

/** Uploads the files one after another, so the images land in the order they were chosen. */
async function addFiles(files: FileList | File[]) {
  for (const file of Array.from(files)) {
    const row: UploadRow = reactive({ key: nextKey++, name: file.name, progress: 0, error: '' })
    rows.value.push(row)
    try {
      const image = await upload(file, 'gallery', (p) => (row.progress = p))
      emit('update:modelValue', [...props.modelValue, image])
      rows.value = rows.value.filter((r) => r.key !== row.key)
      announce.value = `${file.name} uploaded.`
    } catch (err) {
      row.error = (err as Error).message
    }
  }
}

function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  if (el.files?.length) void addFiles(el.files)
  el.value = ''
}

function onDropFiles(e: DragEvent) {
  fileDragging.value = false
  if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files)
}

function move(from: number, to: number) {
  if (to < 0 || to >= props.modelValue.length || from === to) return
  const next = [...props.modelValue]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  emit('update:modelValue', next)
  announce.value = `Image moved to position ${to + 1} of ${next.length}.`
}

function remove(index: number) {
  const image = props.modelValue[index]!
  emit('release', image)
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
  announce.value = `Image ${index + 1} removed.`
}

function onRowDrop(index: number) {
  if (dragFrom.value !== null) move(dragFrom.value, index)
  dragFrom.value = null
  dragOver.value = null
}
</script>

<template>
  <section class="panel" :aria-labelledby="`${inputId}-title`">
    <div class="flex items-baseline justify-between gap-3">
      <h2 :id="`${inputId}-title`" class="text-base font-semibold">Project images</h2>
      <span class="text-sm text-about-grey">Top to bottom on the page</span>
    </div>

    <ol v-if="modelValue.length" class="mt-4 space-y-3">
      <li
        v-for="(image, i) in modelValue"
        :key="image.publicId"
        draggable="true"
        class="flex items-center gap-3 rounded-xl border bg-white p-2.5"
        :class="dragOver === i && dragFrom !== null && dragFrom !== i ? 'border-ink' : 'border-[#e4e4ea]'"
        @dragstart="dragFrom = i"
        @dragover.prevent="dragOver = i"
        @drop.prevent.stop="onRowDrop(i)"
        @dragend="(dragFrom = null), (dragOver = null)"
      >
        <span class="cursor-grab text-about-grey" aria-hidden="true">
          <svg viewBox="0 0 12 16" class="h-4 w-3"><path fill="currentColor" d="M3 2a1.2 1.2 0 110 2.4A1.2 1.2 0 013 2zm6 0a1.2 1.2 0 110 2.4A1.2 1.2 0 019 2zM3 6.8a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zm6 0a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM3 11.6a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zm6 0a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" /></svg>
        </span>
        <span class="w-4 text-sm font-semibold">{{ i + 1 }}</span>
        <img :src="cldUrl(image.url, { width: 128, height: 88 })" alt="" class="h-11 w-16 shrink-0 rounded-md object-cover" width="64" height="44" loading="lazy">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">Image {{ i + 1 }}</p>
          <p class="text-xs text-about-grey">{{ image.width }} × {{ image.height }}</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" class="icon-btn" :disabled="i === 0" :aria-label="`Move image ${i + 1} up`" @click="move(i, i - 1)">
            <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" class="icon-btn" :disabled="i === modelValue.length - 1" :aria-label="`Move image ${i + 1} down`" @click="move(i, i + 1)">
            <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" class="icon-btn text-[#b42318]" :aria-label="`Remove image ${i + 1}`" @click="remove(i)">
            <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
          </button>
        </div>
      </li>
    </ol>

    <ul v-if="rows.length" class="mt-3 space-y-3">
      <li v-for="row in rows" :key="row.key" class="rounded-xl border border-[#e4e4ea] bg-white px-3 py-2.5">
        <div class="flex justify-between gap-3 text-sm">
          <span class="truncate font-semibold">{{ row.name }}</span>
          <span v-if="!row.error" class="shrink-0 text-about-grey">Uploading {{ row.progress }}%</span>
          <button v-else type="button" class="focus-ring shrink-0 rounded-md font-semibold" @click="rows = rows.filter((r) => r.key !== row.key)">Dismiss</button>
        </div>
        <div v-if="!row.error" class="mt-2 h-1.5 overflow-hidden rounded-full bg-chip" role="progressbar" :aria-valuenow="row.progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`Uploading ${row.name}`">
          <div class="h-full bg-ink transition-[width]" :style="{ width: `${row.progress}%` }" />
        </div>
        <p v-else role="alert" class="field-error">{{ row.error }}</p>
      </li>
    </ul>

    <input :id="inputId" ref="input" type="file" class="hidden" tabindex="-1" multiple :accept="accept" @change="onPick">
    <button
      type="button"
      class="focus-ring mt-4 block w-full rounded-xl border border-dashed px-4 py-6 text-center"
      :class="fileDragging ? 'border-ink bg-section' : 'border-[#9a9aa6]'"
      :aria-describedby="error ? errorId : undefined"
      @click="input?.click()"
      @dragover.prevent="fileDragging = true"
      @dragleave="fileDragging = false"
      @drop.prevent="onDropFiles"
    >
      <span class="block text-sm font-semibold">Drop images here or click to upload</span>
      <span class="mt-1 block text-sm text-about-grey">PNG, JPG, WebP. Up to 10 MB each.</span>
    </button>
    <p v-if="error" :id="errorId" role="alert" class="field-error">{{ error }}</p>

    <p v-if="widths.length > 1" class="mt-3 rounded-lg bg-[#fff4e5] px-3 py-2 text-sm text-[#7a3e00]" role="status">
      These images have different widths ({{ widths.join(', ') }} px). They are shown at the same width on the page, so some will look softer or sharper than others.
    </p>
    <p class="mt-4 rounded-xl bg-section px-4 py-3 text-sm text-about-grey">
      Images join with no gap and are never cropped, so they read as one long design. Export every screen at the same width (1600 px works well).
    </p>
    <p class="sr-only" role="status" aria-live="polite">{{ announce }}</p>
  </section>
</template>
