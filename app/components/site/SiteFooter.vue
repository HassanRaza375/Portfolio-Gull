<script setup lang="ts">
// The year is generated, never typed in.
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-ink">
    <div class="page-container py-8">
      <p class="text-center text-sm text-grey">Copyright {{ year }} © Hafiz Gull. All Rights Reserved.</p>
    </div>
  </footer>
</template>
