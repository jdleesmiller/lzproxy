const assert = require('assert')
const fetch = require('node-fetch')

const cleanup = require('storage/test/support/cleanup')
const fixtures = require('storage/test/support/fixtures')

const BASE_URL = `http://search:${process.env.PORT}`

describe('search', () => {
  beforeEach(cleanup.database)
  beforeEach(fixtures.create)

  it('search tasks', async () => {
    const response = await fetch(new URL('/api/tasks?q=foo', BASE_URL), {
      method: 'GET',
      headers: jsonHeaders()
    })
    assert(response.ok)
    const body = await response.json()
    assert.strictEqual(body.tasks.length, 2) // from fixtures
    assert.strictEqual(body.tasks[0].description, 'foo')
    assert.strictEqual(body.tasks[1].description, 'foo bar')
  })
})

function jsonHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}
