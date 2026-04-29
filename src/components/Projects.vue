<template>
  <div class="bg-bg-secondary flex items-center justify-center">
    <div class="container mx-auto py-8">
      <div class="card">
        <div class="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 lg:gap-0 md:gap-0 sm:gap-3 gap-3">
          <div class="lg:pr-10 md:pr-0 sm:pr-0">
            <img
              :src="sat_japan"
              class="w-full h-auto max-h-14 max-w-35"
              width="140"
              height="40"
              alt="company"
            />
            <h2 class="my-6 lg:text-[2.5rem] md:text-2xl sm:text-2xl text-xl font-semibold">
              78% improvement in usability with a redesign for SAT Japan
            </h2>
            <div class="flex items-center flex-wrap gap-3 mb-6">
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
            <router-link :to="`/projects/${count}`" class="btn-primary"
              >VIEW PROJECT</router-link
            >
          </div>
          <div class="py-2.5 lg:pl-10 md:pl-0 sm:pl-0 flex items-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1171&auto=format&fit=crop"
              class="w-full max-h-110.75 lg:max-w-130 md:max-w-full sm:max-w-full min-h-110.75 cursor-zoom-in object-cover transition-transform duration-500 hover:scale-110"
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
