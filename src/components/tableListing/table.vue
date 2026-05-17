<template>
    <!-- Desktop Table -->
    <div class="hidden lg:block overflow-x-auto">
        <table class="w-full">
            <thead class="bg-bgSecondary">
                <tr>
                    <th class="text-left px-6 py-4 text-sm font-semibold">
                        Project
                    </th>

                    <th class="text-left px-6 py-4 text-sm font-semibold">
                        Category
                    </th>

                    <th class="text-left px-6 py-4 text-sm font-semibold">
                        Tags
                    </th>

                    <th class="text-left px-6 py-4 text-sm font-semibold">
                        Created
                    </th>

                    <th class="text-right px-6 py-4 text-sm font-semibold">
                        Actions
                    </th>
                </tr>
            </thead>

            <tbody>
                <tr v-for="project in projects" :key="project.id"
                    class="border-t border-secondaryMute hover:bg-bgSecondary transition">

                    <!-- Project -->
                    <td class="px-6 py-5">
                        <div class="flex items-center gap-4">

                            <img :src="project.thumbnail" class="w-20 h-14 rounded-lg object-cover" alt="project" />

                            <div>
                                <h3 class="font-medium text-primary mb-1">
                                    {{ project.title }}
                                </h3>

                                <p class="text-sm text-muted line-clamp-1">
                                    {{ project.description }}
                                </p>
                            </div>

                        </div>
                    </td>

                    <!-- Category -->
                    <td class="px-6 py-5 text-secondary">
                        {{ project.category }}
                    </td>

                    <!-- Tags -->
                    <td class="px-6 py-5">
                        <div class="flex flex-wrap gap-2">
                            <span v-for="tag in project.tags" :key="tag"
                                class="px-3 py-1 rounded-full bg-bgSecondary text-xs">
                                {{ tag }}
                            </span>
                        </div>
                    </td>

                    <!-- Date -->
                    <td class="px-6 py-5 text-secondary">
                        {{ project.createdAt }}
                    </td>

                    <!-- Actions -->
                    <td class="px-6 py-5">
                        <div class="flex justify-end gap-3">

                            <!-- Edit -->
                            <button
                                class="w-10 h-10 rounded-xl border border-secondaryMute flex items-center justify-center hover:bg-bgSecondary transition">
                                ✏️
                            </button>

                            <!-- Delete -->
                            <button
                                class="w-10 h-10 rounded-xl border border-secondaryMute flex items-center justify-center hover:bg-red-50 transition">
                                🗑️
                            </button>

                        </div>
                    </td>

                </tr>
            </tbody>
        </table>
    </div>

    <!-- Mobile Cards -->
    <div class="lg:hidden p-4 space-y-4">

        <div v-for="project in projects" :key="project.id" class="border border-secondaryMute rounded-2xl p-4 bg-white">

            <div class="flex gap-4">

                <img :src="project.thumbnail" class="w-24 h-20 rounded-xl object-cover" alt="project" />

                <div class="flex-1">

                    <div class="flex items-start justify-between gap-4">

                        <div>
                            <h3 class="font-medium mb-1">
                                {{ project.title }}
                            </h3>

                            <p class="text-sm text-muted line-clamp-2">
                                {{ project.description }}
                            </p>
                        </div>

                        <div class="flex gap-2">

                            <button
                                class="w-9 h-9 rounded-lg border border-secondaryMute flex items-center justify-center">
                                ✏️
                            </button>

                            <button
                                class="w-9 h-9 rounded-lg border border-secondaryMute flex items-center justify-center">
                                🗑️
                            </button>

                        </div>

                    </div>

                    <div class="flex flex-wrap gap-2 mt-4">
                        <span v-for="tag in project.tags" :key="tag"
                            class="px-3 py-1 rounded-full bg-bgSecondary text-xs">
                            {{ tag }}
                        </span>
                    </div>

                </div>

            </div>

        </div>

    </div>
</template>
<script setup>
const props = defineProps({
    projects: {
        type: Array,
        required: true
    }
});
</script>
<style scoped></style>