---
layout: doc
---

<script setup>
import { useData } from 'vitepress'
import TopicDetail from '../../../packages/vitepress-plus/template/docs/.vitepress/components/TopicDetail.vue'

const { params } = useData()
</script>

<TopicDetail :topic-id="params.slug" />

