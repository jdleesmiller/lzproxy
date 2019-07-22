const assert = require('assert')
const fetch = require('node-fetch')

const cleanup = require('storage/test/support/cleanup')
const fixtures = require('storage/test/support/fixtures')

const BASE_URL = 'http://localhost:18080'

describe('tasks', () => {
  beforeEach(cleanup.database)
  beforeEach(fixtures.create)

  it('should list tasks', async () => {
    const response = await fetch(new URL('/api/tasks', BASE_URL), {
      method: 'GET',
      headers: jsonHeaders()
    })
    assert(response.ok)
    const body = await response.json()
    assert.strictEqual(body.tasks.length, 3) // from fixtures
    assert.strictEqual(body.tasks[0].description, 'foo')
  })

  it('should create a task', async () => {
    const response = await fetch(new URL('/api/tasks', BASE_URL), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ description: 'a' })
    })
    assert(response.ok)
    const body = await response.json()
    assert.strictEqual(body.task.description, 'a')
  })

  it('should complete a task', async () => {
    let response = await fetch(
      new URL(`/api/tasks/${fixtures.tasks.foo.id}`, BASE_URL),
      {
        method: 'DELETE',
        headers: jsonHeaders()
      }
    )
    assert(response.ok)
    let body = await response.text()
    assert.strictEqual(body, '')

    response = await fetch(new URL('/api/tasks', BASE_URL), {
      method: 'GET',
      headers: jsonHeaders()
    })
    assert(response.ok)
    body = await response.json()
    assert.strictEqual(body.tasks.length, 2)
  })
})

function jsonHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}
