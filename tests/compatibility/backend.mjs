// Real installed Next.js consumers of packed adapters; no live provider calls.
import {execFileSync} from 'node:child_process'
import {mkdtempSync, writeFileSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const work = mkdtempSync(join(tmpdir(), 'gemini-next-compat-')),
  npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const packs = JSON.parse(
  execFileSync(
    npm,
    [
      'pack',
      '--json',
      '--workspace=packages/contracts',
      '--workspace=packages/engine',
      '--workspace=packages/adapter-nextjs',
      `--pack-destination=${work}`,
      `--cache=${join(work, 'cache')}`,
    ],
    {encoding: 'utf8'},
  ),
)
const selected = process.argv[2] ? [process.argv[2]] : ['14', '15', '16']
for (const major of selected) {
  if (!['14', '15', '16'].includes(major))
    throw new Error('Unsupported Next major')
  const dir = mkdtempSync(join(work, `next-${major}-`)),
    react = major === '14' ? '18' : '19'
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({type: 'module', private: true}),
  )
  execFileSync(
    npm,
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      `--cache=${join(work, 'cache')}`,
      ...packs.map((pack) => join(work, pack.filename)),
      `next@${major}`,
      `react@${react}`,
      `react-dom@${react}`,
      `@types/react@${react}`,
      'typescript@6.0.3',
    ],
    {cwd: dir, stdio: 'inherit'},
  )
  writeFileSync(
    join(dir, 'route.ts'),
    `import {NextRequest} from 'next/server.js';\nimport {createNextHandlers} from 'sanity-plugin-gemini-ai-images-nextjs';\nconst handlers=createNextHandlers({providers:{},authorize:async()=>({id:'fixture'})});\nexport const POST:(request:NextRequest)=>Promise<Response>=handlers.POST;\nexport const OPTIONS=handlers.OPTIONS;\n`,
  )
  execFileSync(
    npm,
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
      'route.ts',
    ],
    {cwd: dir, stdio: 'inherit'},
  )
  writeFileSync(
    join(dir, 'smoke.mjs'),
    `import assert from 'node:assert/strict';\nimport {NextRequest} from 'next/server.js';\nimport {createNextHandlers} from 'sanity-plugin-gemini-ai-images-nextjs';\nconst generate=async request=>({imageData:'YQ==',mimeType:'image/png',model:request.model});\nconst {POST}=createNextHandlers({providers:{gemini:{generate}},authorize:async()=>({id:'fixture'})});\nconst result=await POST(new NextRequest('https://example.test/api/ai',{method:'POST',body:JSON.stringify({prompt:'fixture',model:'gemini-3-pro-image'})}));\nassert.equal(result.status,200);assert.equal((await result.json()).model,'gemini-3-pro-image');\n`,
  )
  execFileSync(process.execPath, ['smoke.mjs'], {cwd: dir, stdio: 'inherit'})
  const version = JSON.parse(
    readFileSync(join(dir, 'node_modules/next/package.json'), 'utf8'),
  ).version
  console.log(
    `Next ${version}: consumer route types and authenticated NextRequest handler passed`,
  )
}
console.log(`Backend compatibility fixtures saved in ${work}`)
