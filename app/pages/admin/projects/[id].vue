<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Edit project · Admin' })

const route = useRoute()
const projectId = computed(() => Number(route.params.id))
</script>

<template>
  <!-- keyed by id so moving between projects always starts from a fresh form -->
  <ProjectForm :key="projectId" :project-id="projectId" />
</template>
