import React, { useState } from 'react'

import NewTask from './new_task'
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
        <NewTask />
        {tasks.map(({ id, description }) => (
          <Task id={id} description={description} key={id} />
        ))}
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
