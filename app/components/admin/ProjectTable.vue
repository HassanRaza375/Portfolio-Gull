<script setup lang="ts">
// The projects list: a table on wide screens, cards on phones. The arrows change the order shown on Home.
import type { ProjectDto } from '#shared/project'

defineProps<{ projects: ProjectDto[], busyId: number | null }>()
const emit = defineEmits<{
  move: [id: number, direction: 'up' | 'down']
  remove: [project: ProjectDto]
}>()
</script>

<template>
  <div>
    <!-- Wide screens -->
    <div class="hidden overflow-hidden rounded-xl bg-white shadow-sm md:block">
      <table class="w-full text-left">
        <caption class="sr-only">Projects, in the order shown on the home page</caption>
        <thead class="bg-[#f6f8fb] text-sm">
          <tr>
            <th scope="col" class="w-28 px-6 py-3 font-semibold">Order</th>
            <th scope="col" class="px-3 py-3 font-semibold">Project</th>
            <th scope="col" class="px-3 py-3 font-semibold">Tags</th>
            <th scope="col" class="px-3 py-3 font-semibold">Status</th>
            <th scope="col" class="px-6 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in projects" :key="p.id" class="border-t border-[#e8ecf2] align-middle">
            <td class="px-6 py-4">
              <div class="flex flex-col gap-1">
                <button type="button" class="icon-btn h-6 w-8" :disabled="i === 0 || busyId !== null" :aria-label="`Move ${p.title} up`" @click="emit('move', p.id, 'up')">
                  <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
                <button type="button" class="icon-btn h-6 w-8" :disabled="i === projects.length - 1 || busyId !== null" :aria-label="`Move ${p.title} down`" @click="emit('move', p.id, 'down')">
                  <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
              </div>
            </td>
            <td class="px-3 py-4">
              <div class="flex items-center gap-4">
                <img v-if="p.cover" :src="cldUrl(p.cover.url, { width: 160, height: 112 })" alt="" width="80" height="56" class="h-14 w-20 shrink-0 rounded-lg object-cover" loading="lazy">
                <div v-else class="h-14 w-20 shrink-0 rounded-lg bg-section" aria-hidden="true" />
                <div class="min-w-0">
                  <p class="font-semibold">{{ p.title }}</p>
                  <p class="text-sm text-about-grey">/projects/{{ p.slug }}</p>
                </div>
              </div>
            </td>
            <td class="px-3 py-4">
              <div class="flex flex-wrap gap-1.5">
                <span v-for="t in p.tags" :key="t" class="chip text-xs uppercase">{{ t }}</span>
              </div>
            </td>
            <td class="px-3 py-4">
              <span class="inline-block rounded-full px-3 py-1 text-xs font-semibold" :class="p.published ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-chip text-[#404040]'">
                {{ p.published ? 'Published' : 'Draft' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <NuxtLink :to="`/admin/projects/${p.id}`" class="btn-small" :aria-label="`Edit ${p.title}`">Edit</NuxtLink>
                <button type="button" class="icon-btn text-[#b42318]" :aria-label="`Delete ${p.title}`" :disabled="busyId !== null" @click="emit('remove', p)">
                  <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Phones -->
    <ul class="space-y-4 md:hidden">
      <li v-for="(p, i) in projects" :key="p.id" class="panel">
        <div class="flex gap-4">
          <img v-if="p.cover" :src="cldUrl(p.cover.url, { width: 160, height: 112 })" alt="" width="80" height="56" class="h-14 w-20 shrink-0 rounded-lg object-cover" loading="lazy">
          <div v-else class="h-14 w-20 shrink-0 rounded-lg bg-section" aria-hidden="true" />
          <div class="min-w-0">
            <p class="font-semibold">{{ p.title }}</p>
            <p class="break-all text-sm text-about-grey">/projects/{{ p.slug }}</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          <span class="inline-block rounded-full px-3 py-1 text-xs font-semibold" :class="p.published ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-chip text-[#404040]'">
            {{ p.published ? 'Published' : 'Draft' }}
          </span>
          <span v-for="t in p.tags" :key="t" class="chip text-xs uppercase">{{ t }}</span>
        </div>
        <div class="mt-4 flex items-center justify-between gap-2">
          <div class="flex gap-2">
            <button type="button" class="icon-btn" :disabled="i === 0 || busyId !== null" :aria-label="`Move ${p.title} up`" @click="emit('move', p.id, 'up')">
              <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <button type="button" class="icon-btn" :disabled="i === projects.length - 1 || busyId !== null" :aria-label="`Move ${p.title} down`" @click="emit('move', p.id, 'down')">
              <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <NuxtLink :to="`/admin/projects/${p.id}`" class="btn-small" :aria-label="`Edit ${p.title}`">Edit</NuxtLink>
            <button type="button" class="icon-btn text-[#b42318]" :aria-label="`Delete ${p.title}`" :disabled="busyId !== null" @click="emit('remove', p)">
              <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
