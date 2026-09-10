<script setup lang="ts">
import { t } from '@/lib/i18n'
</script>

<template>
  <!-- 액센트 바는 로그인을 제외한 전 화면에 (가이드 7-1) · 배경엔 심볼 워터마크 (4-4) -->
  <div class="asm-accent-bar" />
  <main class="asm-motif flex min-h-[calc(100vh-4px)] items-center justify-center px-4">
    <div class="relative text-center">
      <p class="asm-kicker uppercase">404</p>
      <h1 class="mt-2 text-3xl font-bold text-foreground">{{ t('notfound.title') }}</h1>
      <p class="mt-3 text-sm text-muted-foreground">{{ t('notfound.desc') }}</p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active"
      >
        {{ t('notfound.home') }}
      </RouterLink>
    </div>
  </main>
</template>
