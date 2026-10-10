import assert from 'node:assert/strict'

for (const name of [
  'sanity-plugin-gemini-ai-images-contracts',
  'sanity-plugin-gemini-ai-images-engine',
  'sanity-plugin-gemini-ai-images',
  'sanity-plugin-gemini-ai-images-nextjs',
  'sanity-plugin-gemini-ai-images-nextjs/route',
  'sanity-plugin-gemini-ai-images-serverless',
]) {
  const module = await import(name)
  assert.ok(
    Object.keys(module).length > 0,
    `${name} must expose its public API`,
  )
  console.log(`Imported ${name}`)
}
