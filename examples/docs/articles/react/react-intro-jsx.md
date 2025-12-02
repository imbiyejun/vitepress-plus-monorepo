---
title: React Introduction & JSX
date: 2025-01-01
status: completed
---

# React Introduction & JSX

React is a JavaScript library for building user interfaces.

## What is React?

React lets you build user interfaces out of individual pieces called components.

## JSX Syntax

JSX is a syntax extension for JavaScript:

```jsx
function Welcome() {
  return <h1>Hello, React!</h1>
}
```

## Components

React components are JavaScript functions that return markup:

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>
}

export default Greeting
```

