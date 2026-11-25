<script setup lang="ts">
definePageMeta({ layout: false })
useHead({
  title: 'Admin sign in',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)
const checked = useState('admin-checked', () => false)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { email: email.value, password: password.value } })
    checked.value = true
    await navigateTo('/admin')
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    error.value = status === 429
      ? 'Too many attempts. Wait a minute and try again.'
      : status === 503
        ? 'Sign-in is temporarily unavailable. Try again shortly.'
        : status === 400
          ? 'Enter your email and password.'
          : 'Invalid email or password.'
    password.value = ''
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center bg-section px-4 pt-20 pb-10">
    <header>
      <p class="text-[22px] font-semibold">Hafiz Gull</p>
    </header>

    <main class="mt-5 w-full max-w-[420px] rounded-xl bg-white p-9 shadow-sm">
      <h1 class="text-[28px] font-semibold leading-tight">Admin sign in</h1>
      <p class="mt-1 text-base text-about-grey">Manage the projects shown on your portfolio.</p>

      <form class="mt-6" novalidate @submit.prevent="submit">
        <label for="email" class="block text-sm font-semibold">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="username"
          required
          placeholder="you@example.com"
          :aria-invalid="!!error"
          :aria-describedby="error ? 'login-error' : undefined"
          class="mt-2 w-full rounded-xl border border-[#d4d4dc] px-4 py-3.5 text-base placeholder:text-about-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >

        <label for="password" class="mt-5 block text-sm font-semibold">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          placeholder="Your password"
          :aria-invalid="!!error"
          :aria-describedby="error ? 'login-error' : undefined"
          class="mt-2 w-full rounded-xl border border-[#d4d4dc] px-4 py-3.5 text-base placeholder:text-about-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >

        <p v-if="error" id="login-error" role="alert" class="mt-4 text-sm font-medium text-[#b42318]">{{ error }}</p>

        <button
          type="submit"
          class="btn-primary mt-6 w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
          :disabled="pending"
        >
          {{ pending ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-about-grey">Single-user access. There is no sign-up or password reset page.</p>
    </main>

    <footer class="mt-6">
      <a href="/" class="rounded-md text-sm text-about-grey underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">Back to site</a>
    </footer>
  </div>
</template>
