import test from 'node:test'
import assert from 'node:assert/strict'
import config from '../vite.config.js'

test('Vite 默认使用根路径，子路径使用公开 URL 的 pathname', () => {
  const previous = process.env.VITE_PUBLIC_BASE_URL
  try {
    delete process.env.VITE_PUBLIC_BASE_URL
    assert.equal(config({ mode: 'production' }).base, '/')
    process.env.VITE_PUBLIC_BASE_URL = 'https://example.com/s2u'
    assert.equal(config({ mode: 'production' }).base, '/s2u/')
    process.env.VITE_PUBLIC_BASE_URL = 'https://example.com/apps/s2u/'
    assert.equal(config({ mode: 'production' }).base, '/apps/s2u/')
  } finally {
    if (previous == null) delete process.env.VITE_PUBLIC_BASE_URL
    else process.env.VITE_PUBLIC_BASE_URL = previous
  }
})

test('Vite 拒绝不可信任的公开 URL 配置', () => {
  const previous = process.env.VITE_PUBLIC_BASE_URL
  try {
    for (const url of ['javascript:alert(1)', 'https://u:p@example.com/s2u/', 'https://example.com/s2u/?a=1']) {
      process.env.VITE_PUBLIC_BASE_URL = url
      assert.throws(() => config({ mode: 'production' }), /VITE_PUBLIC_BASE_URL/)
    }
  } finally {
    if (previous == null) delete process.env.VITE_PUBLIC_BASE_URL
    else process.env.VITE_PUBLIC_BASE_URL = previous
  }
})
