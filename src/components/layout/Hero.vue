<template>
  <div class="min-h-screen container mx-auto py-8">
    <div class="grid grid-cols-2">
      <div class="flex flex-col justify-center">
        <div>
          <h1 class="text-3xl font-bold mb-6 max-w-146.6">
            “Hafiz believes every great design starts with truly understanding the
            people it's built for”
          </h1>
          <p class="text-xl font-medium text-secondary mb-11">
            Lead Product Designer, SAT JAPAN
          </p>
          <p class="text-xl font-medium text-secondary uppercase mb-11">
            I've designed user experiences for
          </p>
          <div class="grid grid-cols-3">
            <div class="flex items-center pr-5 border-r border-[#AFAFAF]">
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
      <div>
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
