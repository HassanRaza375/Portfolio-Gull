<script setup lang="ts">
// The first screen of Home. Text, client logos and the portrait are fixed in the code (not editable in the admin).
// The portrait is built once from the original by `npm run optimize-images`: grayscale baked in, AVIF and WebP, 560 px as displayed and
// 840 px (the original's own width) for 2x screens. width and height are fixed so the page does not shift while it loads.
import satJapan from '~/assets/images/sat_japan.svg'
import gameDistrict from '~/assets/images/game_district.svg'
import oziPub from '~/assets/images/ozi_tech.svg'
import avif560 from '~/assets/images/gull-560.avif'
import avif840 from '~/assets/images/gull-840.avif'
import webp560 from '~/assets/images/gull-560.webp'
import webp840 from '~/assets/images/gull-840.webp'

const SIZES = '(max-width: 560px) 100vw, 560px'

// Fetched first: the browser is told about the portrait in the HTML <head>, before any CSS or script
useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      type: 'image/avif',
      imagesrcset: `${avif560} 560w, ${avif840} 840w`,
      imagesizes: SIZES,
      fetchpriority: 'high',
    },
  ],
})
</script>

<template>
  <section class="page-container grid items-end gap-6 pt-8 lg:grid-cols-2 lg:gap-0">
    <div class="self-center pb-8 lg:pr-8">
      <h1 class="mb-6 max-w-[586px] text-xl font-bold md:text-2xl lg:text-3xl">
        “Hafiz believes every great design starts with truly understanding the people it's built for”
      </h1>
      <p class="mb-3 text-lg font-medium text-grey md:mb-4 lg:mb-11 lg:text-xl">Lead Product Designer, SAT JAPAN</p>
      <p class="mb-3 text-lg font-medium uppercase text-grey md:mb-4 lg:mb-11 lg:text-xl">I've designed user experiences for</p>
      <ul class="grid grid-cols-3" aria-label="Clients">
        <li class="flex items-center justify-center border-r border-divider pr-5">
          <img :src="satJapan" width="141" height="41" alt="SAT Japan" class="h-auto w-full max-w-[140px]">
        </li>
        <li class="flex items-center border-r border-divider px-5">
          <img :src="gameDistrict" width="142" height="62" alt="Game District" class="h-auto w-full max-w-[141px]">
        </li>
        <li class="flex items-center px-5">
          <img :src="oziPub" width="73" height="74" alt="Ozi Pub" class="h-auto w-full max-w-[86px]">
        </li>
      </ul>
    </div>

    <picture class="flex justify-center lg:justify-end">
      <source type="image/avif" :srcset="`${avif560} 560w, ${avif840} 840w`" :sizes="SIZES">
      <source type="image/webp" :srcset="`${webp560} 560w, ${webp840} 840w`" :sizes="SIZES">
      <img
        :src="webp560"
        width="560"
        height="724"
        alt="Portrait of Hafiz Gull"
        class="block h-auto w-full max-w-[560px]"
        fetchpriority="high"
        decoding="async"
      >
    </picture>
  </section>
</template>
