# AskOwl WebApp

Web client for the AskOwlAPI backend, built with Vue 3, TypeScript, and Vite.

## Overview

AskOwl WebApp provides a modern frontend interface for the AskOwl system, enabling users to interact with AI-powered search, chat, and history features through a clean and responsive web application.

## Tech Stack

- **Framework**: Vue 3.5.25 (Composition API)
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.3.1
- **Package Manager**: Bun

## Features

- **Authentication**: Login and registration
- **Admin Panel**: Configure searcher, scraper, ranker, and LLM settings
- **User Management**: Admin controls for user accounts
- **Chat Interface**: Interactive AI chat functionality
- **History**: View past conversations and interactions

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Node.js (for development dependencies)

### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Start development server
bun run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
# Build for production (includes type checking)
bun run build

# Preview production build locally
bun run preview
```

## Project Structure

```
src/
├── app/           # Application entry point (App.vue, main.ts)
├── components/    # Reusable Vue components
├── pages/         # Page-level components (routing)
├── features/      # Feature-specific modules
├── entities/      # Domain entities
├── shared/        # Shared utilities and composables
└── assets/        # Static assets (images, styles)
```

## Documentation

- [Development Guide](docs/development/1_introduction.md)
- [Administration Guide](docs/administration/1_introduction.md)
- [User Guide](docs/using/1_introduction.md)
- [Agent Guide](AGENTS.md)
- [Roadmap](ROADMAP.md)

## Development

### Type Checking

```bash
# Run TypeScript type checker
bun run vue-tsc -b
```

### Code Style

This project follows Vue 3 best practices:
- Use `<script setup>` syntax
- Always include `lang="ts"` in script tags
- Use scoped styles in components
- Maintain explicit type definitions

See [AGENTS.md](AGENTS.md) for detailed development guidelines.

## License

See [LICENSE](LICENSE) file for details.

## Status

🚧 **Active Development** - This project is in early development. Features are being implemented according to the [roadmap](ROADMAP.md).
