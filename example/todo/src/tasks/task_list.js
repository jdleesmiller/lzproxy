import React, { useState } from 'react'

import Search from './search'
import Task from './task'
import TASK_STORE from './task_store'

const TaskList = () => {
  const [tasks, setTasks] = useState(null)

  TASK_STORE.listener = () => {
    setTasks(TASK_STORE.tasks)
  }

  let taskList
  if (tasks) {
    taskList = (
      <ul className="list-group">
        {tasks.map(({ id, text }) => (
          <Task id={id} text={text} key={id} />
        ))}
        <Task id={null} text={''} />
      </ul>
    )
  } else {
    TASK_STORE.list()
    taskList = <p>Loading...</p>
  }

  return (
    <React.Fragment>
      <div className="row">
        <div className="col">
          <Search />
        </div>
      </div>
      <div className="row">
        <div className="col">{taskList}</div>
      </div>
    </React.Fragment>
  )
}

export default TaskList
