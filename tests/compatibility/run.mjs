// Isolated packed-package consumer checks, with real Studio/UI/React versions.
// Only the Sanity client/provider is stubbed for rendering; no Gemini calls.
import {execFileSync} from 'node:child_process'
import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const targets = {
  5: {sanity: '5.31.2', ui: '3.5.5', react: '19.2.3'},
  6: {sanity: '6.18.0', ui: '4.4.0', react: '19.3.0'},
}
const selected = process.argv[2] ? [process.argv[2]] : Object.keys(targets)
const work = mkdtempSync(join(tmpdir(), 'gemini-compat-'))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const run = (args, cwd) => execFileSync(npm, args, {cwd, stdio: 'inherit'})
const packs = JSON.parse(
  execFileSync(
    npm,
    [
      'pack',
      '--json',
      '--workspace=packages/contracts',
      '--workspace=packages/core',
      `--pack-destination=${work}`,
      `--cache=${join(work, 'cache')}`,
    ],
    {encoding: 'utf8'},
  ),
)
for (const major of selected) {
  const target = targets[major]
  if (!target) throw new Error(`Unknown Studio major: ${major}`)
  const dir = mkdtempSync(join(work, `studio-${major}-`))
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({private: true, type: 'module'}),
  )
  run(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      `--cache=${join(work, 'cache')}`,
      ...packs.map((pack) => join(work, pack.filename)),
      `sanity@${target.sanity}`,
      `@sanity/ui@${target.ui}`,
      `react@${target.react}`,
      `react-dom@${target.react}`,
      `react-is@${target.react}`,
      '@types/react@19',
      'typescript@6.0.3',
      'esbuild',
    ],
    dir,
  )
  // Refuse a fixture with unresolved upstream peer requirements.
  execFileSync(npm, ['ls', 'react', '--json'], {
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  // Verify published declarations against the consumer's real Sanity types.
  writeFileSync(
    join(dir, 'consumer.ts'),
    `import {defineConfig, defineType} from 'sanity';\nimport {geminiAIImages, ImageObjectInput, ImageGalleryInput, type GeminiImageModel} from 'sanity-plugin-gemini-ai-images';\ndefineType({name: 'photo', type: 'image', components: {input: ImageObjectInput}});\ndefineType({name:'gallery',type:'array',of:[{type:'photo'}],components:{input:ImageGalleryInput}});\nconst model: GeminiImageModel = 'gemini-3-pro-image';\ndefineConfig({projectId: 'test', dataset: 'test', plugins: [geminiAIImages({defaultModel: model})]});\n`,
  )
  run(
    [
      'exec',
      '--',
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--module',
      'nodenext',
      '--target',
      'es2022',
      'consumer.ts',
    ],
    dir,
  )
  // Loading the public package with real Sanity checks all static exports.
  writeFileSync(
    join(dir, 'imports.mjs'),
    `import assert from 'node:assert/strict';\nimport {geminiAIImages, imageModels} from 'sanity-plugin-gemini-ai-images';\nassert.ok(geminiAIImages({defaultModel: 'gemini-3-pro-image'}));\nassert.ok(imageModels.some(m => m.id === 'gemini-3-pro-image'));\n`,
  )
  execFileSync(process.execPath, ['imports.mjs'], {cwd: dir, stdio: 'inherit'})
  writeFileSync(
    join(dir, 'sanity-stub.js'),
    `export const definePlugin = fn => fn; export const defineType = value => value; export const defineField = value => value; export const insert = () => ({}); export const useClient = () => ({config: () => ({})}); export const ImageInput = () => null; export const set = () => ({}); export const setIfMissing = () => ({});`,
  )
  const legacy = major !== '6'
  writeFileSync(
    join(dir, 'render.jsx'),
    `import React from 'react'; import assert from 'node:assert/strict'; import {renderToString} from 'react-dom/server'; import {ThemeProvider, studioTheme${legacy ? ', ToastProvider' : ''}} from '@sanity/ui'; import {ImageGeneratorContent, InlineGenerator, SeriesPreview} from 'sanity-plugin-gemini-ai-images'; const content = <><ImageGeneratorContent defaultModel="gemini-3-pro-image" onImageGenerated={() => {}} /><InlineGenerator onImageGenerated={() => {}} /><SeriesPreview images={[{imageData:'YQ==', mimeType:'image/png',variation:'front',index:0}]} onUploadSelected={() => {}} uploading={false} /></>; const html = renderToString(<ThemeProvider theme={studioTheme}>${legacy ? '<ToastProvider>{content}</ToastProvider>' : '{content}'}</ThemeProvider>); assert.match(html, /gemini-3-pro-image/); assert.match(html, /Generate with AI/); assert.match(html, /data-ui="Grid"/); console.log('Studio ${target.sanity} / UI ${target.ui} / React ${target.react}: imports, consumer types and rendering passed');`,
  )
  writeFileSync(
    join(dir, 'build.mjs'),
    `import {build} from 'esbuild'; await build({entryPoints:['render.jsx'], outfile:'render.mjs', bundle:true, format:'esm', jsx:'automatic', platform:'node', external:['react','react/*','react-dom/*','@sanity/ui'], alias:{sanity:'./sanity-stub.js'}});`,
  )
  execFileSync(process.execPath, ['build.mjs'], {cwd: dir, stdio: 'inherit'})
  execFileSync(process.execPath, ['render.mjs'], {cwd: dir, stdio: 'inherit'})
}
console.log(`Compatibility fixtures saved in ${work}`)
