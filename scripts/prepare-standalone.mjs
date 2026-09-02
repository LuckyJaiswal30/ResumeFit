import { cp, mkdir, access } from 'node:fs/promises'

const STANDALONE = '.next/standalone'

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

if (!(await exists(STANDALONE))) {
  console.log('standalone output not produced, nothing to prepare')
  process.exit(0)
}

await mkdir(`${STANDALONE}/.next`, { recursive: true })
await cp('.next/static', `${STANDALONE}/.next/static`, { recursive: true })

if (await exists('public')) {
  await cp('public', `${STANDALONE}/public`, { recursive: true })
}

console.log('standalone output ready to deploy')
