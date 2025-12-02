<template>
  <a-layout class="main-layout">
    <Sidebar v-model="collapsed" />
    <a-layout>
      <a-layout-content class="content">
        <router-view></router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'

const collapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true')
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.content {
  background: #f0f2f5;
  min-height: 280px;
  overflow-y: auto;
}
</style>
