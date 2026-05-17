<template>
    <section class="bg-bgSecondary py-10 px-4 md:px-6">
        <div class="max-w-container mx-auto">

            <!-- Header -->
            <div class="mb-8 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 class="text-2xl md:text-3xl font-semibold mb-2">
                        Create Project
                    </h1>

                    <p class="text-secondary">
                        Upload your project details and showcase images.
                    </p>
                </div>
                <div>
                    <router-link to="/dashboard" class="btn-primary text-white">
                        Back
                    </router-link>
                </div>
            </div>

            <!-- Form Card -->
            <div class="bg-white border border-secondaryMute rounded-2xl p-5 md:p-8">

                <div class="space-y-8">

                    <!-- Title -->
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Project Title
                        </label>

                        <input v-model="projectData.title" type="text" placeholder="Enter project title"
                            class="w-full h-12 rounded-xl border border-secondaryMute px-4 outline-none focus:border-primary" />
                    </div>

                    <!-- Slug -->
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Project Slug
                        </label>

                        <input v-model="projectData.slug" type="text" placeholder="branding-project"
                            class="w-full h-12 rounded-xl border border-secondaryMute px-4 outline-none focus:border-primary" />
                    </div>

                    <!-- Logo + Thumbnail -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <!-- Logo -->
                        <div>
                            <label class="block text-sm font-medium mb-2">
                                Logo Image
                            </label>

                            <div class="relative">
                                <label
                                    class="border border-dashed border-secondaryMute rounded-2xl h-52 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-bgSecondary transition">
                                    <input type="file" class="hidden" accept="image/*" @change="handleLogoUpload" />

                                    <template v-if="projectData.logoPreview">
                                        <img :src="projectData.logoPreview" class="w-full h-full object-cover"
                                            alt="logo" />
                                    </template>

                                    <template v-else>
                                        <div class="text-center">
                                            <p class="font-medium">Upload Logo</p>
                                            <p class="text-sm text-muted mt-1">
                                                PNG, SVG, JPG
                                            </p>
                                        </div>
                                    </template>
                                </label>

                                <!-- Remove Button -->
                                <button v-if="projectData.logoPreview" @click="removeLogo"
                                    class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-sm">
                                    ✕
                                </button>
                            </div>
                        </div>

                        <!-- Thumbnail -->
                        <div>
                            <label class="block text-sm font-medium mb-2">
                                Thumbnail Image
                            </label>

                            <div class="relative">
                                <label
                                    class="border border-dashed border-secondaryMute rounded-2xl h-52 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-bgSecondary transition">
                                    <input type="file" class="hidden" accept="image/*"
                                        @change="handleThumbnailUpload" />

                                    <template v-if="projectData.thumbnailPreview">
                                        <img :src="projectData.thumbnailPreview" class="w-full h-full object-cover"
                                            alt="thumbnail" />
                                    </template>

                                    <template v-else>
                                        <div class="text-center">
                                            <p class="font-medium">Upload Thumbnail</p>
                                            <p class="text-sm text-muted mt-1">
                                                Recommended landscape image
                                            </p>
                                        </div>
                                    </template>
                                </label>

                                <!-- Remove Button -->
                                <button v-if="projectData.thumbnailPreview" @click="removeThumbnail"
                                    class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-sm">
                                    ✕
                                </button>
                            </div>
                        </div>

                    </div>

                    <!-- Gallery Upload -->
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h2 class="font-semibold mb-1">
                                    Project Images
                                </h2>

                                <p class="text-sm text-muted">
                                    Upload multiple landscape images.
                                </p>
                            </div>

                            <label class="btn-primary">
                                <input type="file" multiple class="hidden" accept="image/*"
                                    @change="handleGalleryUpload" />

                                + Add Images
                            </label>
                        </div>

                        <!-- Gallery Grid -->
                        <div v-if="projectData.galleryPreview.length" class="grid grid-cols-2 md:grid-cols-3 gap-4">

                            <div v-for="(img, index) in projectData.galleryPreview" :key="index"
                                class="relative rounded-xl overflow-hidden aspect-[16/10] bg-secondaryMute">
                                <img :src="img" class="w-full h-full object-cover" alt="gallery" />

                                <button @click="removeGalleryImage(index)"
                                    class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white text-sm cursor-pointer">
                                    ✕
                                </button>
                            </div>

                        </div>

                        <!-- Empty State -->
                        <div v-else
                            class="border border-dashed border-secondaryMute rounded-2xl h-52 flex items-center justify-center text-center">
                            <div>
                                <p class="font-medium">
                                    No Images Uploaded
                                </p>

                                <p class="text-sm text-muted mt-1">
                                    Add showcase images for your project
                                </p>
                            </div>
                        </div>

                    </div>

                    <!-- Tags -->
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Tags
                        </label>

                        <input v-model="projectData.tags" type="text" placeholder="branding, uiux, packaging"
                            class="w-full h-12 rounded-xl border border-secondaryMute px-4 outline-none focus:border-primary" />
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Brief Description
                        </label>

                        <textarea v-model="projectData.description" rows="5" placeholder="Write project overview..."
                            class="w-full rounded-2xl border border-secondaryMute p-4 outline-none resize-none focus:border-primary"></textarea>
                    </div>

                    <!-- Buttons -->
                    <div class="flex flex-col sm:flex-row gap-4">

                        <button class="btn-primary">
                            Publish Project
                        </button>

                        <button class="btn-secondary">
                            Save Draft
                        </button>

                    </div>

                </div>

            </div>

        </div>
    </section>
</template>

<script setup>
import { ref } from "vue";

const projectData = ref({
    title: "",
    slug: "",
    tags: "",
    description: "",

    logo: null,
    logoPreview: "",

    thumbnail: null,
    thumbnailPreview: "",

    gallery: [],
    galleryPreview: [],
});

// Logo Upload
const handleLogoUpload = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    projectData.value.logo = file;
    projectData.value.logoPreview = URL.createObjectURL(file);
};

// Thumbnail Upload
const handleThumbnailUpload = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    projectData.value.thumbnail = file;
    projectData.value.thumbnailPreview = URL.createObjectURL(file);
};

// Gallery Upload
const handleGalleryUpload = (event) => {
    const files = Array.from(event.target.files);

    files.forEach((file) => {
        projectData.value.gallery.push(file);

        projectData.value.galleryPreview.push(
            URL.createObjectURL(file)
        );
    });
};

// Remove Gallery Image
const removeGalleryImage = (index) => {
    projectData.value.gallery.splice(index, 1);
    projectData.value.galleryPreview.splice(index, 1);
};

// Remove Logo
const removeLogo = () => {
    projectData.value.logo = null;
    projectData.value.logoPreview = "";
};

// Remove Thumbnail
const removeThumbnail = () => {
    projectData.value.thumbnail = null;
    projectData.value.thumbnailPreview = "";
};
</script>
<style scoped>
.router-link-active {
    color: white;
}
</style>