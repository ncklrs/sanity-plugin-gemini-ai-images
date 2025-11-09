# Publishing Guide

This guide covers how to publish the Sanity Gemini AI Images plugin to npm.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm Login**: Run `npm login` in your terminal
3. **GitHub Repository**: Create a public repository at https://github.com/ncklrs/sanity-plugin-gemini-ai-images

## Pre-Publishing Checklist

- [ ] All tests pass (currently manual testing)
- [ ] TypeScript builds without errors (`npm run build`)
- [ ] Version numbers updated in all package.json files
- [ ] README files are complete and accurate
- [ ] CHANGELOG.md created (optional but recommended)
- [ ] GitHub repository created and pushed

## Publishing Steps

### 1. Create GitHub Repository

```bash
cd /Users/nickjensen/Dev2/sanity-plugin-gemini-ai-images
git init
git add .
git commit -m "Initial commit: Sanity Gemini AI Image Generator plugin"
git branch -M main
git remote add origin https://github.com/ncklrs/sanity-plugin-gemini-ai-images.git
git push -u origin main
```

### 2. Publish to npm

Publish packages in this order (dependencies first):

**Core Package:**
```bash
cd packages/core
npm publish --access public
```

**Next.js Adapter:**
```bash
cd ../adapter-nextjs
npm publish --access public
```

**Serverless Adapter:**
```bash
cd ../adapter-serverless
npm publish --access public
```

### 3. Verify Published Packages

Check that packages are available:
- https://www.npmjs.com/package/sanity-plugin-gemini-ai-images
- https://www.npmjs.com/package/sanity-plugin-gemini-ai-images-nextjs
- https://www.npmjs.com/package/sanity-plugin-gemini-ai-images-serverless

### 4. Test Installation

Create a test project and verify installation works:

```bash
npm install sanity-plugin-gemini-ai-images sanity-plugin-gemini-ai-images-nextjs @google/genai
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
   git commit -m "Release v1.0.1"
   git tag v1.0.1
   git push origin main --tags
   ```

4. **Publish Updated Packages:**
   ```bash
   cd packages/core && npm publish
   cd ../adapter-nextjs && npm publish
   cd ../adapter-serverless && npm publish
   ```

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
