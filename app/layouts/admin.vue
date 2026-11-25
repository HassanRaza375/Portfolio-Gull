<script setup lang="ts">
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const signedOut = useState('admin-checked', () => false)
const signingOut = ref(false)

async function signOut() {
  signingOut.value = true
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
  } finally {
    signedOut.value = false
    signingOut.value = false
    await navigateTo('/admin/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-section">
    <header class="border-b border-ink bg-white">
      <div class="page-container flex items-center justify-between py-5">
        <NuxtLink to="/admin" class="flex items-center gap-3 rounded-md text-[22px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
          Hafiz Gull
          <span class="rounded-full bg-chip px-3 py-1 text-xs font-semibold uppercase tracking-wide">Admin</span>
        </NuxtLink>
        <nav class="flex items-center gap-8 text-base font-semibold" aria-label="Admin">
          <a href="/" class="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">View site</a>
          <button
            type="button"
            class="rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-50"
            :disabled="signingOut"
            @click="signOut"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
    <slot />
  </div>
</template>
