<script setup lang="ts">
// A confirmation using the native <dialog>: focus moves into it, Tab stays inside it, Esc cancels.
const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
}>()
const emit = defineEmits<{ confirm: [], cancel: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    const el = dialog.value
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  },
  { flush: 'post' },
)
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(92vw,440px)] rounded-xl p-0 shadow-xl backdrop:bg-black/40"
    aria-labelledby="confirm-title"
    aria-describedby="confirm-message"
    @cancel.prevent="emit('cancel')"
  >
    <div class="p-6">
      <h2 id="confirm-title" class="text-xl font-semibold">{{ title }}</h2>
      <p id="confirm-message" class="mt-2 text-base text-about-grey">{{ message }}</p>
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" class="btn-outline" :disabled="pending" @click="emit('cancel')">Cancel</button>
        <button
          type="button"
          class="focus-ring inline-flex items-center justify-center rounded-full bg-[#b42318] px-6 py-3 text-[13px] font-semibold uppercase tracking-wide text-white disabled:opacity-60"
          :disabled="pending"
          @click="emit('confirm')"
        >
          {{ pending ? 'Deleting…' : confirmLabel }}
        </button>
      </div>
    </div>
  </dialog>
</template>
