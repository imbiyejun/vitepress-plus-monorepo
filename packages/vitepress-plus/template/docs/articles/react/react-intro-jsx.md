---
title: React Introduction & JSX
date: 2025-01-01
status: completed
---

# React Introduction & JSX

React is a JavaScript library for building user interfaces.

## What is React?

React lets you build user interfaces out of individual pieces called components. React components are JavaScript functions that return markup.

## JSX Syntax

JSX is a syntax extension for JavaScript that lets you write HTML-like markup inside a JavaScript file.

```jsx
function Welcome() {
  return <h1>Hello, React!</h1>
}
```

## Components

React components are the building blocks of React applications:

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>
}

export default Greeting
```

## Next Steps

- Learn about [Props and State]
- Explore [Hooks]

