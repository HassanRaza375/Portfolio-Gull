<template>
  <div class="border-b border-secondary sticky top-0 bg-bg-primary z-10">
    <header class="lg:py-8 md:py-6 sm:py-6 py-4 container mx-auto">
      <nav class="flex justify-between items-center">
        <h1
          class="font-semibold text-[22px] text-primary cursor-pointer"
          @click="gotoHome"
        >
          Hafiz Gull
        </h1>
  
        <div class="flex gap-10 font-semibold text-[16px] text-primary">
          <router-link :to="{ name: 'Home', hash: '#project_1' }"
            >Work</router-link
          >
          <router-link to="/about">About</router-link>
        </div>
      </nav>
    </header>
  </div>
</template>
<script setup>
import { useRouter } from "vue-router";
const router = useRouter();
const gotoHome = () => {
  router.push({ name: "Home" });
};
</script>
