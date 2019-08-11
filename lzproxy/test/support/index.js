const assert = require('assert')
const path = require('path')

const lzproxy = require('../..')
const normalizeConfig = require('../../src/config').normalize

exports.ProducerConsumerBuffer = require('./producer-consumer-buffer')
exports.startWithDiagnosticTarget = startWithDiagnosticTarget
exports.startSingleWithDiagnosticTarget = startSingleWithDiagnosticTarget
exports.waitForStop = waitForStop

function getTargetPath(targetName) {
  return path.join(__dirname, '..', 'targets', targetName)
}

const targetPaths = {
  crash: getTargetPath('crash.js'),
  crashSlowly: getTargetPath('crash-slowly.js'),
  diagnostic: getTargetPath('diagnostic.js'),
  hang: getTargetPath('hang.js'),
  neverReady: getTargetPath('never-ready.js')
}

const targetDefaultDefaultOptions = {
  readinessProbePath: '/status',
  readinessRetryDelayMs: 500,
  port: 8080
}

const targetDefaultOptions = {
  crash: {
    ...targetDefaultDefaultOptions,
    command: ['node', targetPaths.crash]
  },
  crashSlowly: {
    ...targetDefaultDefaultOptions,
    command: ['node', targetPaths.crashSlowly]
  },
  diagnostic: {
    ...targetDefaultDefaultOptions,
    command: ['node', targetPaths.diagnostic]
  },
  hang: {
    ...targetDefaultDefaultOptions,
    command: ['node', targetPaths.hang],
    readinessMaxTries: 2,
    readinessTimeoutMs: 1000
  },
  neverReady: {
    ...targetDefaultDefaultOptions,
    command: ['node', targetPaths.neverReady],
    readinessMaxTries: 2
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
