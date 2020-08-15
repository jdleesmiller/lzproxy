const assert = require('assert')
const getPort = require('get-port')
const fetch = require('node-fetch')

const delay = require('../src/delay')

describe('lzproxy Proxy', function () {
  this.timeout(10000)

  it('starts and stops cleanly without any requests', async function () {
    const { proxy } = this.startProxyWithDiagnosticTarget()
    await this.stopAndWait(proxy)
  })

  it('starts a single proxy and handles a request', async function () {
    const { proxy } = this.startProxyWithDiagnosticTarget()
    try {
      const response = await fetch(this.testUrl)
      assert(response.ok)

      const body = await response.json()
      assert.strictEqual(body.port, proxy.target.port)
    } finally {
      await this.stopAndWait(proxy)
    }
  })

  it('starts two proxies and handles requests', async function () {
    const otherPort = await getPort()
    const { proxies } = this.startProxies({
      lzproxy: {
        options: this.targetDefaultOptions.diagnostic,
        proxies: [{}, { port: otherPort }],
      },
    })
    try {
      let response = await fetch(this.testUrl)
      assert(response.ok)
      let body = await response.json()
      assert.strictEqual(body.port, proxies[0].target.port)

      response = await fetch(`http://localhost:${otherPort}/`)
      assert(response.ok)
      body = await response.json()
      assert.strictEqual(body.port, proxies[1].target.port)
    } finally {
      await this.stopAndWait(proxies[0])
      await this.stopAndWait(proxies[1])
    }
  })

  it('responds to readiness probe without starting target', async function () {
    const { proxy } = this.startProxyWithOptions({
      ...this.targetDefaultOptions.neverReady,
      readinessMaxTries: 20, // make sure we time out if the target starts
    })

    try {
      const response = await fetch(new URL('/status', this.testUrl))
      assert(response.ok)
    } finally {
      await this.stopAndWait(proxy)
    }
  })

  it('idles out after a period of inactivity', async function () {
    const { proxy } = this.startProxyWithOptions({
      ...this.targetDefaultOptions.diagnostic,
      idleTimeoutMs: 1000, // make sure we time out if the target starts
    })

    try {
      let response = await fetch(this.testUrl)
      assert(response.ok)
      let body = await response.json()
      const originalPid = body.pid

      await delay(2000)

      response = await fetch(this.testUrl)
      assert(response.ok)
      body = await response.json()
      const newPid = body.pid

      // Here we assume the OS does not recycle pids extremely quickly.
      assert.notStrictEqual(originalPid, newPid)
    } finally {
      await this.stopAndWait(proxy)
    }
  })

  it('handles a crashing request', async function () {
    const { proxy, log } = this.startProxyWithOptions(
      this.targetDefaultOptions.crashOnRequest
    )
    try {
      const response = await fetch(this.testUrl)
      assert(!response.ok)
      assert.strictEqual(response.status, 502) // Bad Gateway

      assert.strictEqual(log.length, 1)
      assert(/ECONNRESET/.test(log[0]))
      assert(/on GET \//.test(log[0]))
    } finally {
      await this.stopAndWait(proxy)
    }
  })

  it('handles a client hangup', async function () {
    // Setting the incoming timeout shorter than the request duration is the
    // only way I've found to trigger http-proxy's econnreset event, but I don't
    // think that's how these usually arise 'in the wild'.
    const { proxy, log } = this.startProxyWithOptions({
      ...this.targetDefaultOptions.slowRequest,
      proxyIncomingTimeoutMs: 500,
    })
    try {
      await fetch(this.testUrl)
      assert(false)
    } catch (error) {
      assert.strictEqual(error.code, 'ECONNRESET')

      // It takes a few ticks for the log message to land.
      for (;;) {
        if (log.length > 0) break
        await delay(100)
      }

      assert.strictEqual(log.length, 1)
      assert(/warning: client ECONNRESET/.test(log[0]))
    } finally {
      await this.stopAndWait(proxy)
    }
  })
})
