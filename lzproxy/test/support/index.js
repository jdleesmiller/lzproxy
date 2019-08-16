const assert = require('assert')
const getPort = require('get-port')
const path = require('path')

const lzproxy = require('../..')
const Target = require('../../src/target')
const normalizeConfig = require('../../src/config').normalize

const ProducerConsumerBuffer = require('./producer-consumer-buffer')

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

// eslint-disable-next-line mocha/no-top-level-hooks,mocha/no-hooks-for-single-case
before(async function() {
  const testPort = await getPort()
  this.testPort = testPort
  this.testUrl = `http://localhost:${testPort}`

  const targetDefaultDefaultOptions = {
    idleTimeoutMs: 30000, // just set for coverage; it should not idle out
    readinessProbePath: '/status',
    readinessRetryDelayMs: 500,
    port: testPort
  }

  this.targetDefaultOptions = {
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

  function normalizeTargetOptions(options) {
    return normalizeConfig({ lzproxy: { options } })[0]
  }

  function createTarget(options) {
    const events = new ProducerConsumerBuffer()
    const stdout = []
    const stderr = []
    const target = new Target(
      normalizeTargetOptions(options),
      function onReady() {
        events.push()
      },
      function onExit(exit) {
        events.push(exit)
      },
      function onStdout(line) {
        stdout.push(line)
      },
      function onStderr(line) {
        stderr.push(line)
      }
    )
    return { target, events, stdout, stderr }
  }
  this.createTarget = createTarget

  function startProxies(config) {
    const stdout = []
    const stderr = []
    const proxies = lzproxy.start(
      normalizeConfig(config),
      line => stdout.push(line),
      line => stderr.push(line)
    )
    return { proxies, stdout, stderr }
  }
  this.startProxies = startProxies

  function startProxy(config) {
    const { proxies } = startProxies(config)
    assert.strictEqual(proxies.length, 1)
    return proxies[0]
  }
  this.startProxy = startProxy

  function startProxyWithOptions(options) {
    return this.startProxy({ lzproxy: { options } })
  }
  this.startProxyWithOptions = startProxyWithOptions

  function startProxyWithDiagnosticTarget() {
    return this.startProxyWithOptions(this.targetDefaultOptions.diagnostic)
  }
  this.startProxyWithDiagnosticTarget = startProxyWithDiagnosticTarget

  async function stopAndWait(proxy) {
    proxy.stop()
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (proxy.isStopped()) resolve()
        clearInterval(interval)
      }, 100)
    })
  }
  this.stopAndWait = stopAndWait
})
