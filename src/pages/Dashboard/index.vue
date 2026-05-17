<template>
    <section class="py-10 px-4 md:px-6">
        <div class="max-w-container mx-auto">

            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-2xl md:text-3xl font-semibold text-primary mb-2">
                        Projects
                    </h1>

                    <p class="text-secondary">
                        Manage all your existing projects.
                    </p>
                </div>

                <!-- Add Project Button -->
                <router-link to="/dashboard/image-upload" class="btn-primary">
                    + Add Project
                </router-link>
            </div>

            <!-- Table Card -->
            <div class="bg-white border border-secondaryMute rounded-2xl overflow-hidden">

                <!-- Top Bar -->
                <div
                    class="p-5 border-b border-secondaryMute flex flex-col md:flex-row gap-4 md:items-center md:justify-between">

                    <!-- Search -->
                    <div class="w-full md:max-w-sm">
                        <input type="text" placeholder="Search projects..."
                            class="w-full h-11 rounded-xl border border-secondaryMute px-4 outline-none focus:border-primary" />
                    </div>
                </div>

                <!-- Table -->
                <TableListing :projects="projects" />

            </div>

        </div>
    </section>
</template>

<script setup>
import TableListing from "../../components/tableListing/table.vue";
const projects = [
    {
        id: 1,
        title: "Brand Identity Design",
        category: "Branding",
        description: "Modern branding project for startup company.",
        createdAt: "May 2026",
        tags: ["Branding", "Logo", "UI/UX"],
        thumbnail:
            "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1171&auto=format&fit=crop",
    },

    {
        id: 2,
        title: "Packaging Design",
        category: "Packaging",
        description: "Creative packaging concept for cosmetic products.",
        createdAt: "April 2026",
        tags: ["Packaging", "Illustration"],
        thumbnail:
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200",
    },

    {
        id: 3,
        title: "Social Media Campaign",
        category: "Marketing",
        description: "Instagram and Facebook campaign visuals.",
        createdAt: "March 2026",
        tags: ["Social", "Ads"],
        thumbnail:
            "https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=80&w=1200",
    },
];
</script>
<style scoped></style>