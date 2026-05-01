<template>
  <section class="container mx-auto py-8">

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl md:text-3xl font-semibold mb-3">
        Project {{ id }}
      </h1>
      <p class="text-muted max-w-2xl">
        This is a short description of the project. Explain the concept, tools used, and your role.
      </p>
    </div>

    <!-- Hero Image -->
    <div class="mb-10 overflow-hidden">
      <img :src="project.images[0]" class="w-full aspect-[16/9] object-cover" alt="project" />
    </div>
    <!-- Image Stack -->
    <div class="space-y-10">
      <div v-for="(img, index) in project.images" :key="index" class="overflow-hidden">
        <img :src="img" class="w-full aspect-[16/9] object-cover"
          alt="project" />
      </div>
    </div>

    <!-- Navigation -->
    <div class="mt-12 flex justify-between text-sm text-secondary">
      <router-link to="/">← Back</router-link>
      <router-link :to="`/projects/${Number(id) + 1}`">
        Next →
      </router-link>
    </div>

  </section>
</template>

<script setup>
import { useRoute } from "vue-router";
import { ref, watch } from "vue";

const route = useRoute();
const id = ref(route.params.id);

watch(() => route.params.id, (newId) => {
  id.value = newId;
});


// Demo data (replace later with API or real data)
const project = {
  images: [
    "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1171&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200",
    "https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=80&w=1200",
    "https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=80&w=1200"
  ]
};
</script>