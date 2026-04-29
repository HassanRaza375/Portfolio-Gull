<template>
  <div class="min-h-screen bg-bg-secondary">
    <div class="container mx-auto py-8">
      <div class="flex align-center justify-center">
        <h1 class="text-center font-bold">Projects {{ count }}</h1>
      </div>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  count: {
    type: Number,
    default: 0,
  },
});
</script>
<style scoped></style>
