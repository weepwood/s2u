import { readdir, readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { resolve, join } from 'node:path'

const root = resolve('dist')
const html = await readFile(join(root, 'index.html'), 'utf8')
const matches = [...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+\.(?:js|css))"/g)]
const entryPaths = [...new Set(matches.map((match) => match[1]))]
if (!entryPaths.some((entry) => entry.endsWith('.js')) ||
    !entryPaths.some((entry) => entry.endsWith('.css'))) {
  throw new Error('无法在 dist/index.html 找到入口 JS/CSS')
}

const assets = await readdir(join(root, 'assets'))
const rows = []
for (const file of assets.filter((name) => /\.(js|css)$/.test(name))) {
  const buffer = await readFile(join(root, 'assets', file))
  rows.push({ file, bytes: buffer.length, gzip: gzipSync(buffer, { level: 9 }).length })
}
const fmt = (bytes) => (bytes / 1024).toFixed(2) + ' KiB'
console.log('s2u production build asset report')
console.log('Resource                               Raw         Gzip')
for (const row of rows.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(row.file.padEnd(38) + fmt(row.bytes).padStart(11) + fmt(row.gzip).padStart(13))
}
const entry = rows.filter((row) => entryPaths.some((path) => path.endsWith('/' + row.file)))
const entryBytes = entry.reduce((sum, row) => sum + row.bytes, 0)
const entryGzip = entry.reduce((sum, row) => sum + row.gzip, 0)
console.log('Initial entry JS+CSS: ' + fmt(entryBytes) + ' raw / ' + fmt(entryGzip) + ' gzip')
const total = rows.reduce((sum, row) => sum + row.gzip, 0)
console.log('All emitted JS+CSS: ' + fmt(total) + ' gzip (includes deferred chunks)')
console.log('Off-initial chunks: ' + (rows.length - entry.length))
