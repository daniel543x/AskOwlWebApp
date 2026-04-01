# AskOwl WebApp - Agent Guide

This guide helps AI agents work effectively in the AskOwl WebApp codebase.

## Project Overview

AskOwl WebApp is a Vue 3 + TypeScript + Vite application that serves as the frontend for the AskOwl system. The project is in early development phase.

## Essential Commands

### Development
```bash
bun run dev          # Start development server (Vite)
bun run build        # Build for production (type-checks then builds)
bun run preview      # Preview production build locally
```

### Package Management
- Uses Bun as the package manager (`bun.lock` present)
- Dependencies are managed via `package.json`

### Build Process
The build command runs two steps:
1. `vue-tsc -b` - TypeScript type checking
2. `vite build` - Production bundle creation

## Code Organization

### Directory Structure
```
src/
├── app/           # Application entry point (App.vue, main.ts)
├── components/    # Reusable Vue components
├── pages/         # Page-level components (intended for routing)
├── features/      # Feature-specific modules (currently empty)
├── entities/      # Domain entities (currently empty)
├── shared/        # Shared utilities/composables (currently empty)
└── assets/        # Static assets (images, global styles)
```

### Entry Points
- `src/app/main.ts` - Application bootstrap file
- `src/app/App.vue` - Root Vue component
- `index.html` - HTML entry point

## Code Conventions

### Vue Components
- Use Vue 3 Composition API with `<script setup>` syntax
- Always add `lang="ts"` to script tags
- Example structure:
  ```vue
  <script setup lang="ts">
  import { ref } from 'vue';

  defineProps<{ msg: string }>();

  const count = ref(0);
  </script>

  <template>
    <h1>{{ msg }}</h1>
  </template>

  <style scoped>
  /* component styles */
  </style>
  ```

### TypeScript
- Strict mode is enabled in `tsconfig.app.json`
- Compiler enforces: no unused locals, no unused parameters, no fallthrough cases in switch
- Type definitions should be explicit when possible

### Imports
- Use relative imports for internal modules: `import Component from "../components/Component.vue"`
- Vue imports: `import { ref, computed } from 'vue'`

### Styling
- Use scoped styles in components (`<style scoped>`)
- Global styles go in `src/assets/style.css`
- Follow Vue.js style guide patterns

## Project Roadmap Context

The project is in early development with planned features:
- Authentication (Login/Register pages)
- Admin panel with settings for: searcher, scraper, ranker, LLM
- User management
- Chat interface
- History page

## Technology Stack

- **Framework**: Vue 3.5.25
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.3.1
- **Package Manager**: Bun
- **Type Checker**: vue-tsc 3.1.5

## Configuration Files

- `vite.config.ts` - Vite configuration (minimal, uses @vitejs/plugin-vue)
- `tsconfig.json` - TypeScript root configuration (references app and node configs)
- `tsconfig.app.json` - Application TypeScript config (strict mode enabled)
- `tsconfig.node.json` - Node/build tool TypeScript config

## Current State

- Project structure is prepared but most feature directories are empty
- Only placeholder code exists (HelloWorld component, template App)
- No tests configured yet
- No linting configured yet
- CI/CD not configured

## Gotchas

- Build command (`bun run build`) will fail on type errors - run type checking first
- No test framework is set up - tests need to be added
- No linting/formatting tools configured - consider adding ESLint/Prettier
- Empty directories (pages/, features/, entities/, shared/) indicate intended architecture
- Documentation files in `docs/` are currently empty placeholders

## Development Workflow

1. Start dev server: `bun run dev`
2. Make changes to source files
3. Vite handles hot module replacement automatically
4. Build before committing/deploying: `bun run build`
5. Preview build locally: `bun run preview`
