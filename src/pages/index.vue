<template>
  <div>
    <section id="hero">
      <HeroSection />
    </section>
    <section :id="`project_${counts}`" v-for="counts in 5" :key="counts">
      <Projects :count="counts"/>
    </section>
  </div>
</template>
<script setup>
import HeroSection from "../components/layout/Hero.vue";
import Projects from "../components/Projects.vue";
</script>
<style scoped></style>
