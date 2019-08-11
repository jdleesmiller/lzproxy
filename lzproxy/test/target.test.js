const assert = require('assert')
const fetch = require('node-fetch')

describe('lzproxy Target', function() {
  this.timeout(15000)

  describe('with ready diagnostic target', function() {
    let target, events
    beforeEach(async function() {
      ;({ target, events } = this.createTarget(
        this.targetDefaultOptions.diagnostic
      ))
      target.start()
      const result = await events.shift()
      assert(!result) // ready should finish first
    })

    it('starts a target and stops it with sigterm', async function() {
      target.stop()

      const { code } = await events.shift()
      assert.strictEqual(code, 0)
      assert(!target.port)
      assert(!target.target)
    })

    it('starts a target that exits cleanly', async function() {
      const stopUrl = new URL('/stop', target.getUrl())
      const response = await fetch(stopUrl, { method: 'POST' })
      assert(response.ok)

      const { code } = await events.shift()
      assert.strictEqual(code, 0)
      assert(!target.port)
      assert(!target.target)
    })

    it('starts a target that exits nonzero', async function() {
      const stopUrl = new URL('/stop?code=1', target.getUrl())
      const response = await fetch(stopUrl, { method: 'POST' })
      assert(response.ok)

      const { code } = await events.shift()
      assert.strictEqual(code, 1)
      assert(!target.port)
      assert(!target.target)
    })

    it('restarts and a target that stops', async function() {
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

  it('handles stopping when idle', async function() {
    const { target } = this.createTarget(this.targetDefaultOptions.crash)
    assert(target.isIdle())
    target.stop()
    assert(target.isIdle())
  })

  it('handles a target that crashes immediately', async function() {
    const { target, events, stdout, stderr } = this.createTarget(
      this.targetDefaultOptions.crash
    )
    target.start()
    const { code } = await events.shift()
    assert.strictEqual(code, 1) // exit
    assert.strictEqual(stdout.length, 0)
    assert(stderr.some(line => /I crash immediately/.test(line)))
    assert(!target.port)
    assert(!target.target)
  })

  it('handles a target that crashes slowly', async function() {
    const { target, events, stdout, stderr } = this.createTarget(
      this.targetDefaultOptions.crashSlowly
    )
    target.start()
    const { code } = await events.shift()
    assert.strictEqual(code, 1) // exit
    assert.strictEqual(stdout.length, 0)
    assert(stderr.some(line => /I crash after 1s/.test(line)))
    assert(!target.port)
    assert(!target.target)
  })

  it('handles a target that hangs on the health check', async function() {
    const { target, events } = this.createTarget(this.targetDefaultOptions.hang)
    target.start()
    const { error } = await events.shift()
    assert(error)
    assert(/did not come up/.test(error.message))

    assert(target.isIdle())
    assert(!target.port)
    assert(!target.target)
  })

  it('handles a target that never comes up', async function() {
    const { target, events } = this.createTarget(
      this.targetDefaultOptions.neverReady
    )
    target.start()
    const { error } = await events.shift()
    assert(error)
    assert(/did not come up/.test(error.message))

    assert(target.isIdle())
    assert(!target.port)
    assert(!target.target)
  })

  it('sets the target environment variables', async function() {
    const { target, events } = this.createTarget({
      ...this.targetDefaultOptions.diagnostic,
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
    const { code } = await events.shift()
    assert.strictEqual(code, 0)
  })
})
