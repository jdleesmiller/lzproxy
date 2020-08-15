const assert = require('assert')
const yargs = require('yargs/yargs')

const cli = require('../src/cli')
const config = require('../src/config')

describe('lzproxy config', function () {
  beforeEach(function () {
    process.env.TEST_PORT = 1234
  })

  afterEach(function () {
    delete process.env.TEST_PORT
  })

  it('takes port environment variable from the command line', function () {
    const proxies = getConfigFromCommandLine([
      '--port-environment-variable',
      'TEST_PORT',
    ])
    assert.strictEqual(proxies.length, 1)
    assert.strictEqual(proxies[0].port, 1234)
    const proxy = proxies[0]

    assert.strictEqual(proxy.probes.length, 1)
    assert.strictEqual(proxy.probes[0].path, '/healthz')
    assert.strictEqual(
      proxy.probes[0].pathRegExp.toString(),
      /^\/healthz$/.toString()
    )
  })

  it('supports multiple probes with shared settings', function () {
    const proxies = getConfigFromCommandLine([
      '--port-environment-variable',
      'TEST_PORT',
      '--readiness-probe-path',
      '/statusz',
      '--readiness-probe-path',
      '/healthz',
    ])
    assert(proxies.length === 1)
    const proxy = proxies[0]

    assert(proxy.probes.length === 2)
    assert.strictEqual(proxy.probes[0].path, '/statusz')
    assert.strictEqual(proxy.probes[1].path, '/healthz')
    assert.strictEqual(proxy.probes[0].maxTries, 30)
    assert.strictEqual(proxy.probes[1].maxTries, 30)
    assert.strictEqual(proxy.probes[0].retryDelayMs, 1000)
    assert.strictEqual(proxy.probes[1].retryDelayMs, 1000)
  })

  it('supports multiple probes with different settings', function () {
    const proxies = getConfigFromCommandLine([
      '--port-environment-variable',
      'TEST_PORT',
      '--readiness-probe-path',
      '/statusz',
      '--readiness-probe-retry-delay-ms',
      '5000',
      '--readiness-probe-path',
      '/healthz',
      '--readiness-probe-retry-delay-ms',
      '6000',
    ])
    assert(proxies.length === 1)
    const proxy = proxies[0]

    assert(proxy.probes.length === 2)
    assert.strictEqual(proxy.probes[0].path, '/statusz')
    assert.strictEqual(proxy.probes[1].path, '/healthz')
    assert.strictEqual(proxy.probes[0].maxTries, 30)
    assert.strictEqual(proxy.probes[1].maxTries, 30)
    assert.strictEqual(proxy.probes[0].retryDelayMs, 5000)
    assert.strictEqual(proxy.probes[1].retryDelayMs, 6000)
  })

  it('checks that probe property arrays have matching lengths', function () {
    assert.throws(
      () => {
        getConfigFromCommandLine([
          '--port-environment-variable',
          'TEST_PORT',
          '--readiness-probe-path',
          '/statusz',
          '--readiness-probe-retry-delay-ms',
          '5000',
          '--readiness-probe-path',
          '/healthz',
          '--readiness-probe-retry-delay-ms',
          '6000',
          '--readiness-probe-path',
          '/varz',
        ])
      },
      { message: /must have 1 or 3 readinessProbeRetryDelayMs values/ }
    )
  })
})

function getConfigFromCommandLine(argv) {
  return config.createFromCommandLineArguments(cli(yargs(argv)).argv)
}
