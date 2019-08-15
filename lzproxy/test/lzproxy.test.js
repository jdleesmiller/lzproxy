const assert = require('assert')
const getPort = require('get-port')
const fetch = require('node-fetch')

describe('lzproxy Proxy', function() {
  it('should start and stop cleanly without any requests', async function() {
    const proxy = this.startProxyWithDiagnosticTarget()
    await this.stopAndWait(proxy)
  })

  it('should start a single proxy and handle a request', async function() {
    const proxy = this.startProxyWithDiagnosticTarget()
    try {
      const response = await fetch(this.testUrl)
      assert(response.ok)

      const body = await response.json()
      assert.strictEqual(body.port, proxy.target.port)
    } finally {
      await this.stopAndWait(proxy)
    }
  })

  it('should start a two proxies and handle requests', async function() {
    const otherPort = await getPort()
    const { proxies } = this.startProxies({
      lzproxy: {
        options: this.targetDefaultOptions.diagnostic,
        proxies: [{}, { port: otherPort }]
      }
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

  it('should handle readiness probe without starting target', async function() {
    const proxy = this.startProxyWithOptions({
      ...this.targetDefaultOptions.neverReady,
      readinessMaxTries: 20 // make sure we time out if the target starts
    })

    const response = await fetch(new URL('/status', this.testUrl))
    assert(response.ok)
    await this.stopAndWait(proxy)
  })
})
