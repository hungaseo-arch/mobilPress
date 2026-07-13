<script setup lang="ts">
import { t } from '@/lib/i18n'
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-4">
    <div class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
      <h1 class="mt-2 text-3xl font-bold text-foreground">{{ t('notfound.title') }}</h1>
      <p class="mt-3 text-sm text-muted-foreground">{{ t('notfound.desc') }}</p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {{ t('notfound.home') }}
      </RouterLink>
    </div>
  </main>
</template>
