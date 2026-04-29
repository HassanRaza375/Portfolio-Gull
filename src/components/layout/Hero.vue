<template>
  <div class="container mx-auto py-8">
    <div class="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1">
      <div class="flex flex-col justify-center">
        <div>
          <h1 class="lg:text-3xl md:text-2xl sm:text-2xl text-xl font-bold mb-6 max-w-146.6">
            “Hafiz believes every great design starts with truly understanding the
            people it's built for”
          </h1>
          <p class="lg:text-xl md:text-lg sm:text-lg text-lg md:mb-4 sm:mb-4 mb-3 font-medium text-secondary lg:mb-11">
            Lead Product Designer, SAT JAPAN
          </p>
          <p class="lg:text-xl md:text-lg sm:text-lg text-lg md:mb-4 sm:mb-4 mb-3 font-medium text-secondary uppercase lg:mb-11">
            I've designed user experiences for
          </p>
          <div class="grid grid-cols-3">
            <div class="flex items-center sm:justify-center justify-center pr-5 border-r border-[#AFAFAF]">
              <img
                :src="sat_japan"
                class="w-full h-auto max-h-14 max-w-35"
                width="140"
                height="40"
                alt="company"
              />
            </div>
            <div class="flex items-center px-5 border-r border-[#AFAFAF]">
              <img
                :src="game_district"
                class="w-full h-auto max-w-35.25 max-h-15.25"
                width="140"
                height="40"
                alt="company"
              />
            </div>
            <div class="flex items-center px-5">
              <img
                :src="ozi_tech"
                class="w-full h-auto max-w-21.5 max-h-21.75"
                width="140"
                height="40"
                alt="company"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-center">
        <img :src="gull_main" class="w-full h-auto max-w-140 max-h-181 grayscale hover:grayscale-0 transition duration-300" width="580" height="724" loading="eager" alt="" />
      </div>
    </div>
  </div>
</template>
<script setup>
import game_district from "../../assets/game_district.svg";
import gull_main from "../../assets/gull_main.png";
import sat_japan from "../../assets/sat_japan.svg";
import ozi_tech from "../../assets/ozi_tech.svg";
</script>
