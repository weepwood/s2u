import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyPaths } from '../scripts/ci-scope.mjs'
test('仅文档变更允许省略浏览器回归',()=>{
  assert.equal(classifyPaths(['README.md','docs/device-qa.md']),'docs')
  assert.equal(classifyPaths(['docs/index.html']),'full')
})
test('CSS 与文档混合使用视觉冒烟',()=>{
  assert.equal(classifyPaths(['src/styles/theme.css','DESIGN.md']),'visual')
})
test('业务、安全、依赖、CI 和未知路径一律完整回归',()=>{
  for (const path of ['src/components/SettingsPanel.vue','src/domain/linkCodec.js','src/composables/useCloudSync.js','package-lock.json','.github/workflows/ci.yml','AGENTS.md','public/_headers','scripts/ci-scope.mjs','e2e/smoke.spec.js']) {
    assert.equal(classifyPaths(['src/styles/theme.css',path]),'full',path)
  }
  assert.equal(classifyPaths([]),'full')
})
