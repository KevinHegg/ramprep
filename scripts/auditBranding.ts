import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const forbidden = ['RampRep', 'RAMPREP', 'Ramprep', 'RamPrep']
const scanRoots = ['README.md', 'index.html', 'vite.config.ts', '.github', 'src', 'public', 'docs/reports']
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
])

const ignoredPathPatterns = [
  /^docs\/reports\/RampRep-[^/]+\.pdf$/,
  /^docs\/reports\/assets\//,
  /^dist\//,
  /^node_modules\//,
]

const extensionFor = (path: string) => {
  const match = path.match(/(\.[^.]+)$/)
  return match?.[1] ?? ''
}

const walk = (path: string): string[] => {
  const absolutePath = join(root, path)
  const relativePath = relative(root, absolutePath).replaceAll('\\', '/')

  if (ignoredPathPatterns.some((pattern) => pattern.test(relativePath))) {
    return []
  }

  const stat = statSync(absolutePath)
  if (stat.isDirectory()) {
    return readdirSync(absolutePath).flatMap((child) => walk(join(path, child)))
  }

  if (!textExtensions.has(extensionFor(absolutePath))) {
    return []
  }

  return [absolutePath]
}

const hits = scanRoots
  .flatMap(walk)
  .flatMap((absolutePath) => {
    const relativePath = relative(root, absolutePath).replaceAll('\\', '/')
    return readFileSync(absolutePath, 'utf8')
      .split(/\r?\n/)
      .flatMap((line, index) =>
        forbidden
          .filter((variant) => line.includes(variant))
          .map((variant) => `${relativePath}:${index + 1}: found ${variant}: ${line.trim()}`),
      )
  })

if (hits.length) {
  console.error(`Brand audit failed. Use RAMprep for user-facing product names.\n${hits.join('\n')}`)
  process.exit(1)
}

console.log('Brand audit passed: user-facing product names use RAMprep.')
