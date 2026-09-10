<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import AuthGate from '@/components/AuthGate.vue'
</script>

<template>
  <!-- Global toast host (vue-sonner) — 상태색은 main.css 의 [data-sonner-toast] 규칙이 맡는다.
       rich-colors 는 라이브러리 기본 팔레트를 칠해 BI 상태색과 어긋나므로 쓰지 않는다. -->
  <Toaster position="top-right" />
  <!-- Neon 모드에서는 로그인 후에만 앱 진입 (mock/proxy 모드는 그대로 통과) -->
  <AuthGate>
    <RouterView />
  </AuthGate>
</template>
