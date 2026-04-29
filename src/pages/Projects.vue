<template>
  <section class="container mx-auto py-8 min-h-[calc(100vh-157px)]">
    <div>
      <h3 class="font-semibold mb-2">Project {{ id }}</h3>
      <p class="text-muted">Short description</p>
    </div>
  </section>
</template>
<script setup>
import { useRoute } from "vue-router";
import { ref } from "vue";
const route = useRoute();
const id = ref(route.params.id);
</script>
