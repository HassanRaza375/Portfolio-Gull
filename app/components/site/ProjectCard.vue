<script setup lang="ts">
// One project card on Home: logo, title, tags and summary on the left, the cover (cropped to fill 520 x 443) on the right.
// Everything below the first screen loads lazily. The cover has fixed width and height so no card shifts while its image loads.
import type { PublicCard } from '#shared/project'

defineProps<{ project: PublicCard }>()
const COVER = { width: 520, height: 443 }
</script>

<template>
  <article class="grid items-center gap-8 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
    <div class="flex flex-col items-start gap-5">
      <img
        v-if="project.logo"
        :src="cldUrl(project.logo.url, { height: 80 })"
        :width="project.logo.width"
        :height="project.logo.height"
        :alt="`${project.title} logo`"
        class="h-auto max-h-10 w-auto max-w-40"
        loading="lazy"
        decoding="async"
      >
      <h2 class="text-[32px] font-semibold leading-tight md:text-[40px]">{{ project.title }}</h2>
      <ul v-if="project.tags.length" class="flex flex-wrap gap-2" aria-label="Tags">
        <li v-for="tag in project.tags" :key="tag" class="chip text-xs uppercase">{{ tag }}</li>
      </ul>
      <p class="text-sm leading-relaxed">{{ project.summary }}</p>
      <NuxtLink :to="`/projects/${project.slug}`" class="btn-primary focus-ring">
        View project<span class="sr-only">: {{ project.title }}</span>
      </NuxtLink>
    </div>

    <img
      v-if="project.cover"
      :src="cldUrl(project.cover.url, COVER)"
      :srcset="cldSrcset(project.cover.url, [400, 520, 640, 780, 1040], COVER.width / COVER.height)"
      sizes="(min-width: 768px) 520px, calc(100vw - 80px)"
      :width="COVER.width"
      :height="COVER.height"
      :alt="`${project.title} cover image`"
      class="aspect-[520/443] h-auto w-full max-w-[520px] justify-self-end object-cover"
      loading="lazy"
      decoding="async"
    >
  </article>
</template>
