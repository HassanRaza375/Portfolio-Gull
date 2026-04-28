<template>
    <div class="min-h-screen flex flex-col bg-bgPrimary text-primary">

        <!-- Header -->
        <Header />

        <!-- Page Content -->
        <main class="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
            <router-view />
        </main>

        <!-- Footer -->
        <Footer />

    </div>
</template>
<script setup>
import Header from '../components/layout/Navbar.vue';
import Footer from '../components/layout/Footer.vue';
</script>