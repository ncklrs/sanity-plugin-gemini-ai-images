# Publishing Guide

This guide covers how to publish the Sanity Gemini AI Images plugin to npm.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm Login**: Run `npm login` in your terminal
3. **GitHub Repository**: Create a public repository at https://github.com/ncklrs/sanity-plugin-gemini-ai-images

## Pre-Publishing Checklist

- [ ] `npm test` passes
- [ ] `npm run type-check` and `npm run build` pass
- [ ] CI compat jobs pass (Sanity 3, 5, 6)
- [ ] Manual Studio smoke test (see the release plan in the PR)
- [ ] Version numbers updated in all package.json files
- [ ] README files are complete and accurate
- [ ] CHANGELOG.md updated

## Publishing Steps

### 1. Automated Publish (recommended)

Publishing runs from `.github/workflows/publish.yml` when a GitHub release is published:

1. Merge the release PR to `main`
2. Create a GitHub release with tag `vX.Y.Z` (use the core package version)
3. The workflow type-checks, tests, builds, and publishes with npm provenance
4. Packages whose version is already on npm are skipped

The `NPM_TOKEN` repository secret must be an npm automation token with publish rights.

### 2. Manual Publish

Publish in dependency order (the Next.js adapter depends on the serverless adapter):

```bash
npm ci && npm run type-check && npm test && npm run build
npm publish ./packages/adapter-serverless --access public
npm publish ./packages/core --access public
npm publish ./packages/adapter-nextjs --access public
```

### 3. Verify Published Packages

Check that packages are available:
- https://www.npmjs.com/package/sanity-plugin-gemini-ai-images
- https://www.npmjs.com/package/sanity-plugin-gemini-ai-images-nextjs
- https://www.npmjs.com/package/sanity-plugin-gemini-ai-images-serverless

### 4. Test Installation

Create a test project and verify installation works:

```bash
npm install sanity-plugin-gemini-ai-images sanity-plugin-gemini-ai-images-nextjs
```

### 5. Submit to Sanity Plugin Directory

1. Go to https://www.sanity.io/plugins/submit
2. Submit `sanity-plugin-gemini-ai-images`
3. Fill out the submission form
4. Wait for approval

## Version Updates

When releasing new versions:

1. **Update Version Numbers** in all package.json files:
   ```bash
   # Use npm version to update automatically
   cd packages/core
   npm version patch  # or minor, or major

   cd ../adapter-nextjs
   npm version patch

   cd ../adapter-serverless
   npm version patch
   ```

2. **Update CHANGELOG.md** with changes

3. **Commit and Tag:**
   ```bash
   git add .
   git commit -m "Release v1.5.0"
   git tag v1.5.0
   git push origin main --tags
   ```

4. **Publish:** create a GitHub release for the tag, which triggers the publish workflow.

## npm Package Names

- **Core**: `sanity-plugin-gemini-ai-images`
- **Next.js Adapter**: `sanity-plugin-gemini-ai-images-nextjs`
- **Serverless Adapter**: `sanity-plugin-gemini-ai-images-serverless`

## Useful Commands

```bash
# Check what will be published (dry run)
npm publish --dry-run

# View package contents
npm pack
tar -xvzf *.tgz
rm -rf package *.tgz

# Unpublish (only works within 72 hours)
npm unpublish sanity-plugin-gemini-ai-images@1.0.0

# Deprecate a version
npm deprecate sanity-plugin-gemini-ai-images@1.0.0 "Use version 1.0.1 instead"
```

## Troubleshooting

### "You do not have permission to publish"
- Verify you're logged in: `npm whoami`
- Check package name isn't taken: Search on npmjs.com
- Ensure `--access public` flag is used for scoped packages

### "Package name too similar to existing package"
- npm may reject names too similar to popular packages
- Choose a more unique name if needed

### Build Errors
- Run `npm run build` before publishing
- Fix any TypeScript errors
- Ensure all dependencies are installed

## Post-Publication

1. **Create GitHub Release**: Tag the release on GitHub
2. **Announce**: Share on social media, Sanity community, etc.
3. **Monitor**: Watch for issues and bug reports
4. **Document**: Keep README and docs updated

## Support

If you encounter issues:
- Check npm documentation: https://docs.npmjs.com/
- Sanity plugin guide: https://www.sanity.io/docs/creating-plugins
