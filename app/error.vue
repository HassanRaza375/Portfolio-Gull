<script setup lang="ts">
// The error page: a real 404 for unknown pages (which is also what a signed-out visitor sees for the admin area), and a plain message otherwise.
// It never shows the underlying error text.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)

useSeo({
  title: notFound.value ? 'Page not found · Hafiz Gull' : 'Something went wrong · Hafiz Gull',
  description: notFound.value ? 'This page does not exist.' : 'Something went wrong. Please try again shortly.',
  path: '/',
  noindex: true,
})
</script>

<template>
  <NuxtLayout name="default">
    <section class="page-container py-24 text-center">
      <p class="text-6xl font-bold">{{ notFound ? '404' : 'Oops' }}</p>
      <h1 class="mt-4 text-2xl font-semibold">{{ notFound ? 'Page not found' : 'Something went wrong' }}</h1>
      <p class="mt-2 text-grey">{{ notFound ? 'The page you are looking for does not exist.' : 'Please try again in a moment.' }}</p>
      <button type="button" class="btn-primary focus-ring mt-8" @click="clearError({ redirect: '/' })">Go back home</button>
    </section>
  </NuxtLayout>
</template>
