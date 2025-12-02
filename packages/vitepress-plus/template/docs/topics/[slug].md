---
layout: doc
---

<script setup>
import { useData } from 'vitepress'
import TopicDetail from '../.vitepress/components/TopicDetail.vue'

const { params } = useData()
</script>

<TopicDetail :topic-id="params.slug" />

