<template>
    <div class="min-h-screen flex flex-col bg-bgPrimary text-primary">

        <!-- Header -->
        <Header />

        <!-- Page Content -->
        <main>
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