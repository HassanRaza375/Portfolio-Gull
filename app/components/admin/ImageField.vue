<script setup lang="ts">
// One image: the client logo or the cover. Upload, replace, remove, with progress and the error next to the field.
import { ALLOWED_MIME, type ImageKind, type ProjectImage } from '#shared/project'

const props = defineProps<{
  modelValue: ProjectImage | null
  kind: Extract<ImageKind, 'logo' | 'cover'>
  label: string
  hint: string
  error?: string
  /** Alt text for the preview of the current image. */
  alt: string
}>()
const emit = defineEmits<{
  'update:modelValue': [image: ProjectImage | null]
  /** The old image is no longer used by this form (removed or replaced). The parent deletes it if it was never saved. */
  release: [image: ProjectImage]
}>()

const { upload } = useImageUpload()
const input = ref<HTMLInputElement | null>(null)
const progress = ref<number | null>(null)
const localError = ref('')
const inputId = useId()
const hintId = useId()
const errorId = useId()

const accept = computed(() => ALLOWED_MIME[props.kind].join(','))
const shownError = computed(() => localError.value || props.error || '')

async function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = '' // lets the same file be picked again
  if (!file) return
  localError.value = ''
  progress.value = 0
  try {
    const image = await upload(file, props.kind, (p) => (progress.value = p))
    if (props.modelValue) emit('release', props.modelValue)
    emit('update:modelValue', image)
  } catch (err) {
    localError.value = (err as Error).message
  } finally {
    progress.value = null
  }
}

function remove() {
  if (props.modelValue) emit('release', props.modelValue)
  emit('update:modelValue', null)
  localError.value = ''
}
</script>

<template>
  <section class="panel" :aria-labelledby="`${inputId}-title`">
    <h2 :id="`${inputId}-title`" class="text-base font-semibold">{{ label }}</h2>

    <div class="mt-4">
      <div
        v-if="modelValue"
        class="overflow-hidden"
        :class="kind === 'logo' ? 'flex h-14 w-36 items-center justify-center rounded-lg bg-section p-2' : 'rounded-xl bg-section'"
      >
        <img
          :src="cldUrl(modelValue.url, kind === 'logo' ? { width: 288 } : { width: 624, height: 360 })"
          :alt="alt"
          :class="kind === 'logo' ? 'max-h-full max-w-full object-contain' : 'aspect-[26/15] w-full object-cover'"
        >
      </div>
      <p v-if="modelValue && kind === 'cover'" class="mt-2 text-sm text-about-grey">{{ modelValue.width }} × {{ modelValue.height }}</p>
      <p v-else-if="!modelValue" class="rounded-xl bg-section px-4 py-6 text-center text-sm text-about-grey">
        {{ kind === 'logo' ? 'No logo yet' : 'No cover image yet' }}
      </p>
    </div>

    <div v-if="progress !== null" class="mt-4" role="status">
      <div class="flex justify-between text-sm"><span>Uploading</span><span>{{ progress }}%</span></div>
      <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-chip" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`Uploading ${label}`">
        <div class="h-full bg-ink transition-[width]" :style="{ width: `${progress}%` }" />
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <input :id="inputId" ref="input" type="file" class="hidden" tabindex="-1" :accept="accept" @change="onPick">
      <button type="button" class="btn-small" :disabled="progress !== null" :aria-describedby="[hintId, shownError ? errorId : ''].join(' ').trim()" @click="input?.click()">
        {{ modelValue ? 'Replace' : 'Upload' }}<span class="sr-only"> {{ label.toLowerCase() }}</span>
      </button>
      <button v-if="modelValue" type="button" class="focus-ring rounded-md text-sm font-semibold text-[#b42318]" :disabled="progress !== null" @click="remove">
        Remove<span class="sr-only"> {{ label.toLowerCase() }}</span>
      </button>
    </div>

    <p :id="hintId" class="field-hint">{{ hint }}</p>
    <p v-if="shownError" :id="errorId" role="alert" class="field-error">{{ shownError }}</p>
  </section>
</template>
