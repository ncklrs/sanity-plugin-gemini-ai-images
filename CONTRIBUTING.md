# Contributing to Sanity Plugin: Gemini AI Images

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Getting Started

1. **Fork and clone the repository:**

```bash
git clone https://github.com/ncklrs/sanity-plugin-gemini-ai-images.git
cd sanity-plugin-gemini-ai-images
```

2. **Install dependencies:**

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

3. **Build all packages:**

```bash
npm run build
```

## Project Structure

This is a monorepo with multiple packages:

```
packages/
├── core/                    # Main plugin (Studio UI, components)
├── adapter-nextjs/          # Next.js adapter
└── adapter-serverless/      # Serverless adapter
```

## Development Workflow

### Making Changes

1. **Create a feature branch:**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** in the appropriate package(s)

3. **Run type checking:**

```bash
npm run type-check
```

4. **Test your changes** by linking to a local Sanity project:

```bash
cd packages/core
npm link

cd /path/to/your/sanity/project
npm link sanity-plugin-gemini-ai-images
```

### Building

Build all packages:
```bash
npm run build
```

Build in watch mode during development:
```bash
npm run dev
```

## Pull Request Process

1. **Update documentation** if needed (README.md, package READMEs)
2. **Ensure type checking passes:** `npm run type-check`
3. **Commit your changes** with clear, descriptive messages
4. **Push to your fork** and create a pull request
5. **Describe your changes** in the PR description

### Commit Message Guidelines

Use clear, descriptive commit messages:

- `feat: add new feature`
- `fix: resolve bug in X`
- `docs: update README`
- `refactor: improve code structure`
- `chore: update dependencies`

## Code Style

- Use TypeScript for all code
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

## Adding New Features

### New Prompt Templates

Add to `packages/core/src/lib/prompt-templates.ts`:

```typescript
export const promptTemplates: Record<string, PromptTemplate> = {
  // ... existing templates
  yourNewTemplate: {
    name: 'Your Template Name',
    description: 'Description of what it does',
    prompt: (input: string) => `Your prompt text with ${input}`,
    aspectRatio: '1:1',
    category: 'product', // or 'lifestyle', 'hero', etc.
  },
}
```

### New Adapter

Create a new package in `packages/adapter-yourplatform/`:

1. Copy structure from `adapter-nextjs` or `adapter-serverless`
2. Implement platform-specific handler
3. Add documentation in README.md
4. Update main README with installation instructions

## Testing

Currently there are no automated tests. When adding features:

1. Test manually in a real Sanity project
2. Test different scenarios (generation, error handling, etc.)
3. Document any edge cases

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about contributing

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
