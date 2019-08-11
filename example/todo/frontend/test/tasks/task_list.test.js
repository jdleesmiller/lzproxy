import assert from 'assert'
import React from 'react'
import {
  cleanup,
  render,
  waitForElementToBeRemoved
} from '@testing-library/react'
import td from 'testdouble'

import TaskList from '../../src/tasks/task_list'

describe('TaskList', function() {
  let windowFetch
  beforeEach(function() {
    windowFetch = td.replace(global, 'fetch')
  })
  afterEach(function() {
    return td.reset()
  })

  afterEach(cleanup)

  it('can be completed', async function() {
    const json = td.function()
    td.when(
      windowFetch(
        td.matchers.argThat(url => url.toString().endsWith('/api/tasks?q=')),
        td.matchers.contains({ method: 'GET' })
      )
    ).thenResolve({ ok: true, json })
    td.when(json()).thenResolve({
      tasks: [{ id: 1, description: 'foo' }, { id: 2, description: 'bar' }]
    })
    const { getByText } = render(<TaskList />)

    await waitForElementToBeRemoved(() => getByText(/loading/i))
    assert(getByText('foo'))
    assert(getByText('bar'))
  })
})
