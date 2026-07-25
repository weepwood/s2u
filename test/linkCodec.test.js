import test from 'node:test'
import assert from 'node:assert/strict'

import {
  decodeShareTarget,
  encodeShareLink,
  getAppBaseUrl,
  normalizeTarget,
  validateTarget,
} from '../src/domain/linkCodec.js'

test('普通域名自动补全 https', () => {
  const result = normalizeTarget('example.com/path?q=1')

  assert.equal(result.ok, true)
  assert.equal(result.target, 'https://example.com/path?q=1')
})

test('允许常见自定义 URL Scheme', () => {
  const result = normalizeTarget('weixin://open?scene=1')

  assert.equal(result.ok, true)
  assert.equal(result.target, 'weixin://open?scene=1')
  assert.equal(result.protocol, 'weixin:')
})

test('拒绝可执行或本地资源协议', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'vbscript:msgbox(1)',
    'blob:https://example.com/id',
  ]) {
    assert.notEqual(validateTarget(value), '')
  }
})

test('目标地址中的 hash 和百分号可以完整往返', () => {
  const target = 'https://example.com/path?q=100%25#chapter-2'
  const shareLink = encodeShareLink('https://s2u.example/app', target)

  assert.equal(
    shareLink,
    'https://s2u.example/app/#target=https%3A%2F%2Fexample.com%2Fpath%3Fq%3D100%2525%23chapter-2',
  )
  assert.equal(decodeShareTarget(new URL(shareLink).hash), target)
})

test('兼容旧版直接写入 hash 的链接', () => {
  assert.equal(decodeShareTarget('#weixin://open?scene=1'), 'weixin://open?scene=1')
})

test('应用基础地址支持子路径部署', () => {
  assert.equal(getAppBaseUrl('https://example.com/s2u/page'), 'https://example.com')
  assert.equal(
    encodeShareLink('https://example.com/s2u', 'https://target.example/path'),
    'https://example.com/s2u/#target=https%3A%2F%2Ftarget.example%2Fpath',
  )
})
