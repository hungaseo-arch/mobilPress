<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import AuthGate from '@/components/AuthGate.vue'
</script>

<template>
  <!-- Global toast host (vue-sonner) — equivalent to <Sonner /> in the React app -->
  <Toaster position="top-right" rich-colors />
  <!-- Neon 모드에서는 로그인 후에만 앱 진입 (mock/proxy 모드는 그대로 통과) -->
  <AuthGate>
    <RouterView />
  </AuthGate>
</template>
