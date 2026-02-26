---
layout: page
---

<script setup>
import { onMounted } from 'vue'
import TopicDetail from '../.vitepress/components/TopicDetail.vue'
import { useData } from 'vitepress'
import { topics } from '../.vitepress/topics/config'

const { params } = useData()
const topicId = params.value.slug

const topicInfo = topics
  .flatMap(category => category.items)
  .find(topic => topic.slug === topicId)

onMounted(() => {
  if (topicInfo) {
    document.title = `${topicInfo.name} 专题`
  }
})
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
