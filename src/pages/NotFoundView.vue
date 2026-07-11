<template>
  <main class="flex min-h-screen items-center justify-center px-4">
    <div class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
      <h1 class="mt-2 text-3xl font-bold text-foreground">페이지를 찾을 수 없습니다</h1>
      <p class="mt-3 text-sm text-muted-foreground">주소가 잘못되었거나 삭제된 페이지입니다.</p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        홈으로 돌아가기
      </RouterLink>
    </div>
  </main>
</template>
