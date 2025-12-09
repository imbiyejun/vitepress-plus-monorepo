import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
  // Base configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettierConfig,

  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.vitepress/dist/**',
      '**/.vitepress/cache/**',
      '**/pnpm-lock.yaml',
      '**/*.min.js'
    ]
  },

  // Configuration for all files
  {
    plugins: {
      prettier
    },
    languageOptions: {
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        DragEvent: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLImageElement: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        NodeJS: 'readonly',
        WebSocket: 'readonly',
        Worker: 'readonly',
        requestAnimationFrame: 'readonly',
        Express: 'readonly',
        self: 'readonly'
      }
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-prototype-builtins': 'warn',
      'no-case-declarations': 'error'
    }
  },

  // TypeScript specific rules
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn'
    }
  },

  // Vue specific rules
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/require-prop-types': 'warn',
      'vue/component-name-in-template-casing': 'off',
      'vue/custom-event-name-casing': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/v-on-event-hyphenation': 'off',
      'vue/attributes-order': 'off',
      'vue/no-template-shadow': 'warn',
      'vue/no-required-prop-with-default': 'warn',
      'vue/require-explicit-emits': 'off',
      'vue/no-deprecated-slot-attribute': 'warn',
      'vue/require-toggle-inside-transition': 'warn'
    }
  },

  // Server/Node.js specific rules
  {
    files: ['**/server/**/*.ts', '**/cli/**/*.ts'],
    rules: {
      'no-console': 'off'
    }
  }
]
