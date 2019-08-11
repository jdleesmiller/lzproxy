const assert = require('assert')
const fetch = require('node-fetch')

const { Target } = require('..')

const {
  normalizeTargetOptions,
  ProducerConsumerBuffer,
  targetDefaultOptions
} = require('./support')

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

describe('lzproxy Target', function() {
  this.timeout(15000)

  describe('with ready diagnostic target', function() {
    let target, events
    beforeEach(async () => {
      ;({ target, events } = createTarget(targetDefaultOptions.diagnostic))
      target.start()
      const result = await events.shift()
      assert(!result) // ready should finish first
    })

    it('starts a target and stops it with sigterm', async () => {
      target.stop()

      const { signal } = await events.shift()
      assert.strictEqual(signal, 'SIGTERM')
      assert(!target.port)
      assert(!target.target)
    })

    it('starts a target that exits cleanly', async () => {
      const stopUrl = new URL('/stop', target.getUrl())
      const response = await fetch(stopUrl, { method: 'POST' })
      assert(response.ok)

      const { code } = await events.shift()
      assert.strictEqual(code, 0)
      assert(!target.port)
      assert(!target.target)
    })

    it('starts a target that exits nonzero', async () => {
      const stopUrl = new URL('/stop?code=1', target.getUrl())
      const response = await fetch(stopUrl, { method: 'POST' })
      assert(response.ok)

      const { code } = await events.shift()
      assert.strictEqual(code, 1)
      assert(!target.port)
      assert(!target.target)
    })

    it('restarts and a target that stops', async () => {
      let stopUrl = new URL('/stop', target.getUrl())
      let response = await fetch(stopUrl, { method: 'POST' })
      assert(response.ok)

      let { code } = await events.shift()
      assert.strictEqual(code, 0) // exit
      assert(!target.port)
      assert(!target.target)

      target.start()

      const result = await events.shift()
      assert(!result) // ready

      stopUrl = new URL('/stop', target.getUrl())
      response = await fetch(stopUrl, { method: 'POST' })

      // wait for exit
      ;({ code } = await events.shift())
      assert.strictEqual(code, 0) // exit
      assert(!target.port)
      assert(!target.target)
    })
  })

  it('handles stopping when idle', async () => {
    const { target } = createTarget(targetDefaultOptions.crash)
    assert(target.isIdle())
    target.stop()
    assert(target.isIdle())
  })

  it('handles a target that crashes immediately', async () => {
    const { target, events, stdout, stderr } = createTarget(
      targetDefaultOptions.crash
    )
    target.start()
    const { code } = await events.shift()
    assert.strictEqual(code, 1) // exit
    assert.strictEqual(stdout.length, 0)
    assert(stderr.some(line => /I crash immediately/.test(line)))
    assert(!target.port)
    assert(!target.target)
  })

  it('handles a target that crashes slowly', async () => {
    const { target, events, stdout, stderr } = createTarget(
      targetDefaultOptions.crashSlowly
    )
    target.start()
    const { code } = await events.shift()
    assert.strictEqual(code, 1) // exit
    assert.strictEqual(stdout.length, 0)
    assert(stderr.some(line => /I crash after 1s/.test(line)))
    assert(!target.port)
    assert(!target.target)
  })

  it('sets the target environment variables', async () => {
    const { target, events } = createTarget({
      ...targetDefaultOptions.diagnostic,
      environment: {
        TEST_LZPROXY_ENV_VAR: 'foo'
      }
    })
    target.start()
    const result = await events.shift()
    assert(!result) // ready

    const response = await fetch(target.getUrl())
    assert(response.ok)

    const body = await response.json()
    assert.strictEqual(body.env.TEST_LZPROXY_ENV_VAR, 'foo')

    target.stop()
    const { signal } = await events.shift()
    assert.strictEqual(signal, 'SIGTERM') // exit
  })
})
