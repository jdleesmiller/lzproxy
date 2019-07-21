const assert = require('assert')
const path = require('path')

const lzproxy = require('../..')
const normalizeConfig = require('../../src/config').normalize

exports.startWithDiagnosticTarget = startWithDiagnosticTarget
exports.startSingleWithDiagnosticTarget = startSingleWithDiagnosticTarget
exports.stopWithSigterm = stopWithSigterm

const targetPaths = {
  diagnostic: path.join(__dirname, '..', 'targets', 'diagnostic.js')
}

function startWithDiagnosticTarget(lzproxyConfig = {}) {
  return lzproxy.start(
    normalizeConfig({
      lzproxy: {
        options: {
          command: ['node', targetPaths.diagnostic],
          livenessProbePath: '/status',
          livenessRetryDelayMs: 100,
          port: 8080
        },
        ...lzproxyConfig
      }
    })
  )
}

function startSingleWithDiagnosticTarget(lzproxyConfig = {}) {
  const proxies = startWithDiagnosticTarget(lzproxyConfig)
  assert.strictEqual(proxies.length, 1)
  return proxies[0]
}

async function stopWithSigterm(proxy) {
  const { code, signal } = await proxy.stop()
  assert.strictEqual(code, null)
  assert.strictEqual(signal, 'SIGTERM')
}
