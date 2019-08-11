const assert = require('assert')
const path = require('path')

const lzproxy = require('../..')
const normalizeConfig = require('../../src/config').normalize

exports.ProducerConsumerBuffer = require('./producer-consumer-buffer')
exports.startWithDiagnosticTarget = startWithDiagnosticTarget
exports.startSingleWithDiagnosticTarget = startSingleWithDiagnosticTarget
exports.waitForStop = waitForStop

const targetPaths = {
  crash: path.join(__dirname, '..', 'targets', 'crash.js'),
  crashSlowly: path.join(__dirname, '..', 'targets', 'crash-slowly.js'),
  diagnostic: path.join(__dirname, '..', 'targets', 'diagnostic.js')
}

const targetDefaultOptions = {
  crash: {
    command: ['node', targetPaths.crash],
    readinessProbePath: '/status',
    readinessRetryDelayMs: 500,
    port: 8080
  },
  crashSlowly: {
    command: ['node', targetPaths.crashSlowly],
    readinessProbePath: '/status',
    readinessRetryDelayMs: 500,
    port: 8080
  },
  diagnostic: {
    command: ['node', targetPaths.diagnostic],
    readinessProbePath: '/status',
    readinessRetryDelayMs: 500,
    port: 8080
  }
}
exports.targetDefaultOptions = targetDefaultOptions

function normalizeTargetOptions(options) {
  return normalizeConfig({ lzproxy: { options } })[0]
}
exports.normalizeTargetOptions = normalizeTargetOptions

function startWithDiagnosticTarget(lzproxyConfig = {}) {
  const stdout = []
  const stderr = []
  const proxies = lzproxy.start(
    normalizeConfig({
      lzproxy: {
        options: targetDefaultOptions.diagnostic,
        ...lzproxyConfig
      }
    }),
    line => stdout.push(line),
    line => stderr.push(line)
  )
  return { proxies, stdout, stderr }
}

function startSingleWithDiagnosticTarget(lzproxyConfig = {}) {
  const { proxies } = startWithDiagnosticTarget(lzproxyConfig)
  assert.strictEqual(proxies.length, 1)
  return proxies[0]
}

async function waitForStop(proxy) {
  proxy.stop()
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (proxy.isStopped()) resolve()
      clearInterval(interval)
    }, 100)
  })
}
