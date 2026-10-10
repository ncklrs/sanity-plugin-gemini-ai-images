import {readFileSync} from 'node:fs'
import {expect, it} from 'vitest'

it('supports Studio 5 and 6 with their compatible React and UI peers', () => {
  const manifest = JSON.parse(
    readFileSync('packages/core/package.json', 'utf8'),
  )
  expect(manifest.peerDependencies.sanity).toBe('^5.0.0 || ^6.0.0')
  expect(manifest.peerDependencies.react).toBe('^19.2.3')
  expect(manifest.peerDependencies['@sanity/ui']).toBe('^3.0.0 || ^4.0.0')
})
