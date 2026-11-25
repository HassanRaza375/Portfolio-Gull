<script setup lang="ts">
// Fully static: no data, prerendered at build time (see routeRules in nuxt.config.ts).
import portrait from '~/assets/images/gull_portrait.webp'

useSeo({
  title: 'About · Hafiz Gull',
  description: "Hafiz Gull is a product designer based in Lahore with 5+ years of experience creating and improving digital products, with the user at the center of the design process.",
  path: '/about',
})
</script>

<template>
  <section class="page-container grid gap-3 py-8 lg:grid-cols-2 lg:gap-0">
    <div class="order-2 lg:order-1 lg:pr-[124px]">
      <img
        :src="portrait"
        width="630"
        height="870"
        alt="Portrait of Hafiz Gull"
        class="h-auto w-full max-w-[420px] object-contain"
        fetchpriority="high"
        decoding="async"
      >
    </div>
    <div class="order-1 lg:order-2">
      <h1 class="mb-3 text-[48px] font-semibold leading-tight md:mb-4 lg:mb-6">About Me</h1>
      <div class="space-y-6 text-base text-about-grey">
        <p>
          My name is Hafiz Gull, I'm a Product designer based in Lahore, who is passionate about creating and improving digital
          experiences. Over the span of my 5+ year design career, I've had the pleasure of working on some great digital products.
        </p>
        <p>
          Design is not just about how great a person is at using design software. Creating a great design solution comes from a deep
          understanding of a problem. It's not just about how beautiful an interface looks but also how it solves the business needs.
        </p>
        <p>
          I aim for my design solutions to focus on not just the interface, but also the implications it has for the user and the
          business. This allows me to collaborate more effectively with all the stakeholders involved, so that I can truly create a
          solution that meets the business needs as well as the goals of the user.
        </p>
        <p>
          The user is always at the center of my design process. Whether that's in the initial phases of discovering the user needs,
          or in the later stages of testing the design, it's the user that validates everything. This ultimately results in increased
          engagement, enhanced brand identity and a digital product that adds value to people's lives.
        </p>
        <p>
          <span class="font-bold text-ink">Reading deeply into product design and the psychology behind human behavior</span>
          helped me develop a critical and thoughtful approach to design. Understanding how people think, feel, and interact shaped
          the way I see every design challenge, not just visually, but deeply and meaningfully.
        </p>
      </div>
    </div>
  </section>
</template>
