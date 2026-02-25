# @imbiyejun/vitepress-plus-cli

Scaffolding tool for VitePress Plus projects.

## Usage

### Create a new project

```bash
# Using npm
npx @imbiyejun/vitepress-plus-cli create my-project

# Using pnpm
pnpm create @imbiyejun/vitepress-plus my-project

# Using yarn
yarn create @imbiyejun/vitepress-plus my-project
```

### Options

- `--force, -f`: Overwrite target directory if it exists

### Example

```bash
# Create a new project
npx @imbiyejun/vitepress-plus-cli create my-blog

# Navigate to the project directory
cd my-blog

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

## Features

- 🚀 Quick project scaffolding
- 📦 Template includes all necessary configurations
- 🎨 Pre-configured VitePress with custom theme
- 📝 Topic-based content management
- 🔧 TypeScript support out of the box

## Development

### Build

```bash
pnpm build
```

This will:

1. Copy the template from `vitepress-plus` package (respecting `.gitignore`)
2. Compile TypeScript files

### Local Testing

```bash
# In the monorepo
cd packages/vitepress-plus-cli
pnpm build

# Test the CLI
node bin/vp-plus.js create test-project
```

## License

MIT
