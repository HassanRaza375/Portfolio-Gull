<script setup lang="ts">
import type { ProjectDto } from '#shared/project'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Projects · Admin' })

const projects = ref<ProjectDto[]>([])
const loading = ref(true)
const loadError = ref('')
const busyId = ref<number | null>(null)
const actionError = ref('')
const toDelete = ref<ProjectDto | null>(null)
const deleting = ref(false)
const status = ref('')

async function refresh() {
  try {
    projects.value = await adminFetch<ProjectDto[]>('/api/admin/projects')
    loadError.value = ''
  } catch (e) {
    loadError.value = messageFrom(e, 'Could not load the projects.')
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

async function move(id: number, direction: 'up' | 'down') {
  busyId.value = id
  actionError.value = ''
  try {
    await adminFetch(`/api/admin/projects/${id}/move`, { method: 'POST', body: { direction } })
    await refresh()
    const index = projects.value.findIndex((p) => p.id === id)
    status.value = `Moved to position ${index + 1} of ${projects.value.length}.`
  } catch (e) {
    actionError.value = messageFrom(e, 'Could not change the order.')
  } finally {
    busyId.value = null
  }
}

async function confirmDelete() {
  const project = toDelete.value
  if (!project) return
  deleting.value = true
  actionError.value = ''
  try {
    await adminFetch(`/api/admin/projects/${project.id}`, { method: 'DELETE' })
    status.value = `${project.title} deleted.`
    toDelete.value = null
    await refresh()
  } catch (e) {
    actionError.value = messageFrom(e, 'Could not delete the project.')
    toDelete.value = null
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <main class="page-container py-12">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-[40px] font-semibold leading-tight">Projects</h1>
        <p class="mt-1 text-base text-about-grey">Order here is the order on your home page. Changes go live within a minute.</p>
      </div>
      <NuxtLink to="/admin/projects/new" class="btn-primary focus-ring">New project</NuxtLink>
    </div>

    <p v-if="actionError" role="alert" class="mt-6 rounded-xl bg-[#fee4e2] px-4 py-3 text-sm font-medium text-[#7a271a]">{{ actionError }}</p>
    <p class="sr-only" role="status" aria-live="polite">{{ status }}</p>

    <div class="mt-8">
      <p v-if="loading" class="text-about-grey" role="status">Loading…</p>
      <p v-else-if="loadError" role="alert" class="rounded-xl bg-[#fee4e2] px-4 py-3 text-sm font-medium text-[#7a271a]">{{ loadError }}</p>
      <div v-else-if="!projects.length" class="panel text-center">
        <p class="text-lg font-semibold">No projects yet</p>
        <p class="mt-1 text-about-grey">Add your first project to show it on the home page.</p>
        <NuxtLink to="/admin/projects/new" class="btn-primary focus-ring mt-6">New project</NuxtLink>
      </div>
      <ProjectTable v-else :projects="projects" :busy-id="busyId" @move="move" @remove="toDelete = $event" />
    </div>

    <p class="mt-6 text-sm text-about-grey">Deleting a project also removes its images from Cloudinary, after a confirmation.</p>

    <ConfirmDialog
      :open="!!toDelete"
      :title="`Delete ${toDelete?.title ?? 'project'}?`"
      message="This removes the project and all its images from Cloudinary. It cannot be undone."
      confirm-label="Delete"
      :pending="deleting"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />
  </main>
</template>
