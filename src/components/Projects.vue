<template>
  <div
    class="min-h-[calc(100vh-3.75rem)] bg-bg-secondary flex items-center justify-center"
  >
    <div class="container mx-auto py-8">
      <div class="card">
        <div class="grid grid-cols-2">
          <div class="pr-10">
            <img
              :src="sat_japan"
              class="w-full h-auto max-h-14 max-w-35"
              width="140"
              height="40"
              alt="company"
            />
            <h2 class="my-6 text-[2.5rem] font-semibold">
              78% improvement in usability with a redesign for SAT Japan
            </h2>
            <div class="flex items-center gap-3 mb-6">
              <span
                class="flex items-center justify-center rounded-[3.25rem] py-1.25 px-2.5 bg-secondary-mute text-sm font-medium"
                >UX DESIGN</span
              >
              <span
                class="flex items-center justify-center rounded-[3.25rem] py-1.25 px-2.5 bg-secondary-mute text-sm font-medium"
                >UX RESEARCH</span
              >
              <span
                class="flex items-center justify-center rounded-[3.25rem] py-1.25 px-2.5 bg-secondary-mute text-sm font-medium"
                >UX DESIGN</span
              >
            </div>
            <p class="mb-6 text-[1rem] font-normal">
              Designing the Bridge Between Japan's Auto Market and the World.A
              platform where individual buyers and registered dealers come
              together to move cars across 200+ countries, effortlessly
            </p>
            <router-link to="/projects/1" class="btn-primary"
              >VIEW PROJECT</router-link
            >
          </div>
          <div class="py-2.5 pl-10 flex items-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1171&auto=format&fit=crop"
              class="w-full max-h-110.75 max-w-130 min-h-110.75 cursor-zoom-in object-cover transition-transform duration-500 hover:scale-110"
              loading="lazy"
              alt="project"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import sat_japan from "../assets/sat_japan.svg";

const props = defineProps({
  count: {
    type: Number,
    default: 0,
  },
});
</script>
<style scoped></style>
