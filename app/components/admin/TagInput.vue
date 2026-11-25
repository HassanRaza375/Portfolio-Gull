<script setup lang="ts">
// Tags: type and press Enter (or comma). Backspace on an empty box removes the last tag. Text left in the box is added when the box loses focus.
const props = defineProps<{ modelValue: string[], id: string, error?: string, describedBy?: string }>()
const emit = defineEmits<{ 'update:modelValue': [tags: string[]] }>()

const draft = ref('')

function add() {
  const value = draft.value.trim().replace(/,+$/, '').trim()
  draft.value = ''
  if (!value) return
  if (props.modelValue.some((t) => t.toLowerCase() === value.toLowerCase())) return
  emit('update:modelValue', [...props.modelValue, value])
}

function remove(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault() // Enter must not submit the form
    add()
  } else if (e.key === 'Backspace' && !draft.value && props.modelValue.length) {
    remove(props.modelValue.length - 1)
  }
}
</script>

<template>
  <div
    class="focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink mt-2 flex flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2.5"
    :class="error ? 'border-[#b42318]' : 'border-[#d4d4dc]'"
  >
    <span v-for="(tag, i) in modelValue" :key="tag" class="chip gap-1.5 uppercase">
      {{ tag }}
      <button
        type="button"
        class="focus-ring inline-flex size-5 items-center justify-center rounded-full hover:bg-black/10"
        :aria-label="`Remove tag ${tag}`"
        @click="remove(i)"
      >
        <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
      </button>
    </span>
    <input
      :id="id"
      v-model="draft"
      type="text"
      class="min-w-40 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-about-grey"
      placeholder="Type a tag, press Enter"
      :aria-invalid="!!error"
      :aria-describedby="describedBy"
      @keydown="onKeydown"
      @blur="add"
    >
  </div>
</template>
