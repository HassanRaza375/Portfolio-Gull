<script setup lang="ts">
// The body of a project page: title, description, tags, "Visit project", and the gallery stacked full width with no gap,
// no rounded corners and no cropping, so the images read as one long design. width and height reserve space before each image loads.
import type { ProjectData } from '#shared/project'

const props = defineProps<{ project: Pick<ProjectData, 'title' | 'description' | 'tags' | 'projectUrl' | 'gallery'> }>()

const paragraphs = computed(() => props.project.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean))
const SIZES = '(min-width: 1120px) 1088px, calc(100vw - 32px)'
// Fine steps, so a phone downloads the smallest file that is still sharp (the old 640 -> 1088 jump sent 1088 px to a 380 px screen)
const WIDTHS = [480, 720, 960, 1280, 1600, 2176]
</script>

<template>
  <article class="page-container pt-8 pb-8">
    <div class="flex flex-wrap items-end justify-between gap-6">
      <div class="max-w-[760px]">
        <h1 class="text-[34px] font-semibold leading-tight">{{ project.title }}</h1>
        <div v-if="paragraphs.length" class="mt-4 space-y-4 text-lg text-grey">
          <p v-for="(p, i) in paragraphs" :key="i" class="whitespace-pre-line">{{ p }}</p>
        </div>
        <ul v-if="project.tags.length" class="mt-5 flex flex-wrap gap-2" aria-label="Tags">
          <li v-for="t in project.tags" :key="t" class="chip uppercase">{{ t }}</li>
        </ul>
      </div>
      <a v-if="project.projectUrl" :href="project.projectUrl" target="_blank" rel="noopener noreferrer" class="btn-primary focus-ring">
        Visit project<span class="sr-only"> (opens in a new tab)</span>
      </a>
    </div>

    <div v-if="project.gallery.length" class="mt-8">
      <img
        v-for="(image, i) in project.gallery"
        :key="image.publicId"
        :src="cldUrl(image.url, { width: 960 })"
        :srcset="cldSrcset(image.url, WIDTHS)"
        :sizes="SIZES"
        :width="image.width"
        :height="image.height"
        :alt="`${project.title}, image ${i + 1} of ${project.gallery.length}`"
        :loading="i === 0 ? 'eager' : 'lazy'"
        :fetchpriority="i === 0 ? 'high' : 'auto'"
        decoding="async"
        class="block h-auto w-full"
      >
    </div>
  </article>
</template>
