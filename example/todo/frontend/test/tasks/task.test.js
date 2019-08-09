import React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import td from 'testdouble'

import Task from '../../src/tasks/task'
import TASK_STORE from '../../src/tasks/task_store'

describe('Task', function() {
  let taskStoreComplete
  beforeEach(() => {
    taskStoreComplete = td.replace(TASK_STORE, 'complete')
  })
  afterEach(() => td.reset())

  afterEach(cleanup)

  it('can be completed', () => {
    const { getByText } = render(<Task id={1} description="foo" />)
    fireEvent.click(getByText('✓'))
    td.verify(taskStoreComplete(1))
  })
})
