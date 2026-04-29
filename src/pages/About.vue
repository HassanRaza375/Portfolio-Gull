<template>
  <section class="container mx-auto py-8 min-h-[calc(100vh-157px)]">
    <div class="grid grid-cols-2">
      <div class="pr-31">
        <img
          :src="gull_portrait"
          width="420"
          height="580"
          class="w-full h-auto min-h-145"
          loading="eager"
          alt="gull khan"
        />
      </div>
      <div>
        <h1 class="font-semibold text-[48px] mb-6">About Me</h1>
        <p class="text-[16px] font-normal mb-6 text-muted">
          My name is Hafiz Gull, I'm a Product designer based in Lahore, who is
          passionate about creating and improving digital experiences. Over the
          span of my 5+ year design career, I've had the pleasure of working on
          some great digital products.
        </p>
        <p class="text-[16px] font-normal mb-6 text-muted">
          Design is not just about how great a person is at using design
          software. Creating a great design solution comes from a deep
          understanding of a problem. It's not just about how beautiful an
          interface looks but also how it solves the business needs.
        </p>
        <p class="text-[16px] font-normal mb-6 text-muted">
          I aim for my design solutions to focus on not just the interface, but
          also the implications it has for the user and the business. This
          allows me to collaborate more effectively with all the stakeholders
          involved, so that I can truly create a solution that meets the
          business needs as well as the goals of the user.
        </p>
        <p class="text-[16px] font-normal mb-6 text-muted">
          The user is always at the center of my design process. Whether that's
          in the initial phases of discovering the user needs, or in the later
          stages of testing the design, it's the user that validates everything.
          This ultimately results in increased engagement, enhanced brand
          identity and a digital product that adds value to people's lives.
        </p>
        <p class="text-[16px] font-normal text-muted">
          <span
            >Reading deeply into product design and the psychology behind human
            behavior</span
          >
          helped me develop a critical and thoughtful approach to design.
          Understanding how people think, feel, and interact shaped the way I
          see every design challenge, not just visually, but deeply and
          meaningfully.
        </p>
      </div>
    </div>
  </section>
</template>
<script setup>
import gull_portrait from "../assets/gull_portrait.png";
</script>
