<template>
  <div class="image-layout">
    <div class="page-header">
      <h1>图床管理</h1>
    </div>
    <div class="page-content">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.image-layout {
  padding: 24px;
  background: #fff;
  border-radius: 8px;
}

.page-header {
  margin-bottom: 24px;
}

.page-content {
  min-height: 400px;
}
</style>
