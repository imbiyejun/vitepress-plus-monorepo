---
title: Introduction to Vue.js
date: 2025-01-01
status: completed
---

# Introduction to Vue.js

Vue.js is a progressive JavaScript framework for building user interfaces.

## What is Vue.js?

Vue.js is designed to be incrementally adoptable. The core library focuses on the view layer only, making it easy to integrate with other libraries or existing projects.

## Installation

You can install Vue.js using npm:

```bash
npm install vue@next
```

Or using CDN:

```html
<script src="https://unpkg.com/vue@3"></script>
```

## Your First Vue App

```javascript
import { createApp } from 'vue'

const app = createApp({
  data() {
    return {
      message: 'Hello Vue!'
    }
  }
})

app.mount('#app')
```

## Next Steps

- Learn about [Template Syntax](/articles/vue/vue-template-databinding)
- Explore [Components](/articles/vue/vue-component-intro)

