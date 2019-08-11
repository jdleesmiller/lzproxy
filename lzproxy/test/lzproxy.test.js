const assert = require('assert')
const fetch = require('node-fetch')

const {
  startSingleWithDiagnosticTarget,
  startWithDiagnosticTarget,
  waitForStop
} = require('./support')

describe('lzproxy Proxy', function() {
  it('should start and stop cleanly without any requests', async () => {
    const proxy = startSingleWithDiagnosticTarget()
    proxy.stop()
    await waitForStop(proxy)
  })

  it('should start a single proxy and handle a request', async () => {
    const proxy = startSingleWithDiagnosticTarget()
    try {
      const response = await fetch('http://localhost:8080/')
      assert(response.ok)

      const body = await response.json()
      assert.strictEqual(body.port, proxy.target.port)
    } finally {
      await waitForStop(proxy)
    }
  })

  it('should start a two proxies and handle requests', async () => {
    const { proxies } = startWithDiagnosticTarget({
      proxies: [{}, { port: 18080 }]
    })
    try {
      let response = await fetch('http://localhost:8080/')
      assert(response.ok)
      let body = await response.json()
      assert.strictEqual(body.port, proxies[0].target.port)

      response = await fetch('http://localhost:18080/')
      assert(response.ok)
      body = await response.json()
      assert.strictEqual(body.port, proxies[1].target.port)
    } finally {
      await waitForStop(proxies[0])
      await waitForStop(proxies[1])
    }
  })
})
