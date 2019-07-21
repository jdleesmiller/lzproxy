const assert = require('assert')
const fetch = require('node-fetch')

const {
  startSingleWithDiagnosticTarget,
  startWithDiagnosticTarget,
  stopWithSigterm
} = require('./support')

describe('lzproxy', () => {
  it('should start a single proxy', async () => {
    const proxy = startSingleWithDiagnosticTarget()
    try {
      const response = await fetch('http://localhost:8080/')
      assert(response.ok)

      const body = await response.json()
      assert.strictEqual(body.port, proxy.targetPort)
    } finally {
      await stopWithSigterm(proxy)
    }
  })

  it('should start a two proxies', async () => {
    const proxies = startWithDiagnosticTarget({
      proxies: [{}, { port: 18080 }]
    })
    try {
      let response = await fetch('http://localhost:8080/')
      assert(response.ok)
      let body = await response.json()
      assert.strictEqual(body.port, proxies[0].targetPort)

      response = await fetch('http://localhost:18080/')
      assert(response.ok)
      body = await response.json()
      assert.strictEqual(body.port, proxies[1].targetPort)
    } finally {
      await stopWithSigterm(proxies[0])
      await stopWithSigterm(proxies[1])
    }
  })

  it('should override the target environment', async () => {
    const proxy = startSingleWithDiagnosticTarget({
      proxies: [
        {
          environment: {
            TEST_LZPROXY_ENV_VAR: 'foo'
          }
        }
      ]
    })
    try {
      const response = await fetch('http://localhost:8080/')
      assert(response.ok)

      const body = await response.json()
      assert.strictEqual(body.env.TEST_LZPROXY_ENV_VAR, 'foo')
    } finally {
      await stopWithSigterm(proxy)
    }
  })
})
