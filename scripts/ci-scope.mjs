import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// 仅允许明确安全的路径进入快速通道；未知路径一律完整回归。
export function classifyPaths(paths) {
  if (!paths.length) return 'full'
  const docs = path => /^(?:README\.md|DESIGN\.md|CHANGELOG\.md|docs\/[^\0]+\.md)$/.test(path)
  const css = path => /^src\/styles\/[a-z-]+\.css$/.test(path)
  if (paths.every(docs)) return 'docs'
  if (paths.every(path => docs(path) || css(path))) return 'visual'
  return 'full'
}
function run() {
  let scope = 'full'
  if (process.env.GITHUB_EVENT_NAME === 'pull_request' && /^[a-f0-9]{40}$/i.test(process.env.CI_BASE_SHA || '')) {
    try {
      const changes = execFileSync('git',['diff','--no-renames','--name-only','-z',process.env.CI_BASE_SHA,'HEAD'],{encoding:'utf8'})
      scope = classifyPaths(changes.split('\0').filter(Boolean))
    } catch { /* 无法确认差异时完整回归 */ }
  }
  console.log('CI scope: ' + scope)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,'scope=' + scope + '\n')
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run()
