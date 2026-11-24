import test from 'node:test'
import assert from 'node:assert/strict'
import { appIcon, appInitials } from '../src/domain/appIcons.js'

test('本地图标适配子路径，拒绝远程和 SVG 图标', () => {
  assert.equal(appIcon({ target: 'OBSIDIAN://open' }, '/s2u/'), '/s2u/icons/common-obsidian.png')
  assert.equal(appIcon({ target: 'weixin://' }, '/'), '/icons/common-weixin.png')
  assert.equal(appIcon({ target: 'https://example.com', icon: 'https://example.com/icon.png' }, '/'), '')
  assert.equal(appIcon({ target: 'https://example.com', icon: 'data:image/svg+xml;base64,AAAA' }, '/'), '')
  assert.equal(appIcon({ target: 'https://example.com', icon: 'data:image/png;base64,AAAA' }, '/'), 'data:image/png;base64,AAAA')
  assert.equal(appInitials('Visual Studio Code', 'vscode://'), 'VS')
})
