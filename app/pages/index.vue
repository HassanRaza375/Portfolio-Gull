<script setup lang="ts">
import type { PublicCard } from '#shared/project'

// Cached on Vercel (ISR, see nuxt.config.ts). The cards come from one read-only route.
const { data: projects, error } = await useFetch<PublicCard[]>('/api/projects', { key: 'home-projects' })
// If the database cannot be reached, fail the render rather than cache an empty Home page.
if (error.value || !projects.value) throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', fatal: true })

useSeo({
  title: 'Hafiz Gull · Lead Product Designer',
  description: "Hafiz Gull is a Lead Product Designer at SAT Japan, based in Lahore. See UX research and product design case studies for SAT Japan, Game District and Ozi Pub.",
  path: '/',
})
</script>

<template>
  <div>
    <HeroSection />
    <section id="work" aria-label="Selected work" class="scroll-mt-24 bg-section py-6 md:py-12">
      <div class="page-container space-y-12">
        <ProjectCard v-for="project in projects" :key="project.slug" :project="project" />
        <p v-if="!projects?.length" class="py-12 text-center text-about-grey">Projects are on their way. Check back soon.</p>
      </div>
    </section>
  </div>
</template>
