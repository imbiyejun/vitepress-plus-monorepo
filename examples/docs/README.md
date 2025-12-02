# Example Docs

This is an example VitePress Plus project that demonstrates how to use the packages in a real project.

## Structure

```
examples/docs/
├── .vitepress/
│   ├── config.ts           # VitePress configuration
│   ├── theme/              # Custom theme from @imbiyejun/vitepress-plus
│   ├── components/         # Custom components
│   └── topics/             # Topic configurations and data
├── articles/               # Article markdown files
├── index.md               # Homepage
├── topics.md              # Topics list page
└── about.md               # About page
```

## Usage

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## Notes

This example uses workspace references to the packages:
- `@imbiyejun/vitepress-plus` - Core functionality
- `@imbiyejun/vitepress-admin` - Management backend (dev dependency)

