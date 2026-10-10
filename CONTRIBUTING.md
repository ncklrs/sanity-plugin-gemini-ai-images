# Contributing to Sanity Plugin: Gemini AI Images

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

### Prerequisites

- Node.js >= 22.22.2 (Node 24 LTS recommended)
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
├── adapter-serverless/      # Serverless adapter
├── contracts/               # Browser-safe types and capability validation
└── engine/                  # Providers, quotas, auth, durable Sanity jobs
```

## Development Workflow

### Making Changes

1. **Create a feature branch:**

```bash
git checkout -b codex/your-feature-name
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

Run `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:packages`. Tests use a mocked Gemini transport to avoid API charges, and exercise model routing, request validation, hook payloads, MIME handling, partial uploads, and Sanity patches. CI checks Node 22 and 24.

Before release, also smoke-test a real Studio against an authenticated backend and a disposable dataset. Verify the asset picker, standalone tool, custom field, and inline generator. Live generation is not part of CI.

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about contributing

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

To check older Studio consumers after a UI or peer dependency change, run `npm run build && npm run test:compatibility`. Use `npm run test:compatibility -- 5` (or 6) for one version. This installs isolated packed-package fixtures in the system temporary directory and requires registry access. CI runs both versions.

Use `npm run test:examples` for integration fixtures and `npm run test:compatibility` for packed Studio 5/6 consumers. Never use live provider credentials in unit tests. Read `docs/MIGRATION-V2.md` before changing authentication, quota state or reference permissions.
