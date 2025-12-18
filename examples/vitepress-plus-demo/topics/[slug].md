---
layout: page
---

<script setup>
import TopicDetail from '../.vitepress/components/TopicDetail.vue'
import { useData } from 'vitepress'
import { topics } from '../.vitepress/topics/config'

const { params } = useData()
const topicId = params.value.slug

// 获取专题信息用于设置页面标题和描述
const topicInfo = topics
  .flatMap(category => category.items)
  .find(topic => topic.slug === topicId)

if (topicInfo) {
  document.title = `${topicInfo.name} 专题`
}
</script>

<div class="topic-page">
  <TopicDetail :topic-id="topicId" />
</div>

<style>
.topic-page {
  padding: 0 24px;
}

@media (max-width: 768px) {
  .topic-page {
    padding: 0 16px;
  }
}
</style>
