import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/pages/HomeView.vue'
import NotFoundView from '@/pages/NotFoundView.vue'
import ResetPasswordView from '@/pages/ResetPasswordView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    // 이메일 재설정 링크 랜딩 페이지 — AuthGate 가 로그인 없이 통과시킴
    { path: '/reset-password', name: 'reset-password', component: ResetPasswordView },
    // ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL ROUTE
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

export default router
