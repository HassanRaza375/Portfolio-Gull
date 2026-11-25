<script setup lang="ts">
import type { PublicProject } from '#shared/project'

// Cached on Vercel (ISR). Only published projects exist here: an unknown or unpublished slug is a real 404.
const route = useRoute()
const slug = String(route.params.slug)
const { data: project, error } = await useFetch<PublicProject>(`/api/projects/${encodeURIComponent(slug)}`, { key: `project-${slug}` })

if (error.value || !project.value) {
  const notFound = error.value?.statusCode === 404
  throw createError({
    statusCode: notFound ? 404 : 503,
    statusMessage: notFound ? 'Page not found' : 'Service Unavailable',
    fatal: true, // a failed render is never cached
  })
}

const p = project.value!
useSeo({
  title: `${p.title} · Hafiz Gull`,
  description: p.summary,
  path: `/projects/${p.slug}`,
  image: p.cover ? cldUrl(p.cover.url, { width: 1200, height: 630 }) : undefined,
  imageAlt: p.cover ? `${p.title} cover image` : undefined,
})
</script>

<template>
  <div v-if="project">
    <ProjectDetail :project="project" />
    <nav aria-label="Project navigation" class="page-container flex items-center justify-between pb-10 pt-6 text-sm font-semibold">
      <NuxtLink to="/" class="focus-ring inline-flex items-center gap-2 rounded-md">
        <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true"><path d="M13 8H3M7.5 3.5L3 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        Back
      </NuxtLink>
      <!-- hidden on the last project -->
      <NuxtLink v-if="project.next" :to="`/projects/${project.next.slug}`" class="focus-ring inline-flex items-center gap-2 rounded-md text-grey">
        Next<span class="sr-only">: {{ project.next.title }}</span>
        <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true"><path d="M3 8h10M8.5 3.5L13 8l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </NuxtLink>
    </nav>
  </div>
</template>
