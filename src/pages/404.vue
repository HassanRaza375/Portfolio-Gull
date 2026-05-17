<template>
    <div class="container mx-auto py-8">
        <div class="h-screen flex flex-col items-center justify-center">
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <router-link to="/" class="btn-primary text-white mt-3">Back to Home</router-link>
        </div>
    </div>
</template>
<script setup>
</script>
<style scoped>
.router-link-active {
    color: white;
}
</style>