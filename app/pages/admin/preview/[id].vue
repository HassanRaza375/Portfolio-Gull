<script setup lang="ts">
// Preview: the project page as visitors will see it, drafts included. Admin-only and never cached; it shows the last SAVED version.
import type { ProjectDto } from '#shared/project'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Preview · Admin' })

const route = useRoute()
const project = ref<ProjectDto | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    project.value = await adminFetch<ProjectDto>(`/api/admin/projects/${Number(route.params.id)}`)
  } catch (e) {
    error.value = (e as { statusCode?: number }).statusCode === 404 ? 'This project was not found.' : messageFrom(e, 'Could not load the preview.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <aside aria-label="Preview notice" class="border-b border-[#d4d4dc] bg-[#fff4e5]">
      <div class="page-container flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-[#7a3e00]">
        <p>
          <strong>Preview</strong>: the last saved version, as visitors will see it.
          <span v-if="project && !project.published"> This project is a draft, so only you can see it.</span>
        </p>
        <NuxtLink v-if="project" :to="`/admin/projects/${project.id}`" class="focus-ring rounded-md font-semibold underline">Back to editor</NuxtLink>
      </div>
    </aside>
    <main class="bg-white">
      <p v-if="loading" class="page-container py-10 text-about-grey" role="status">Loading…</p>
      <p v-else-if="error" role="alert" class="page-container py-10 font-medium text-[#7a271a]">{{ error }}</p>
      <ProjectDetail v-else-if="project" :project="project" />
    </main>
  </div>
</template>
