<script setup lang="ts">
// Preload the one font file nearly every page needs (the Latin subset), so text does not wait for the CSS to discover it.
import interLatin from '~/assets/fonts/inter-latin-wght.woff2?url'

useHead({
  link: [{ rel: 'preload', as: 'font', type: 'font/woff2', href: interLatin, crossorigin: 'anonymous' }],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
