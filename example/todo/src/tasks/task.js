import classNames from 'classnames'
import PropTypes from 'prop-types'
import React, { useState } from 'react'

import TASK_STORE from './task_store'

const ACTION_ICONS = {
  complete: '✓',
  create: '＋',
  update: '↻'
}

const ACTION_CLASSES = {
  complete: 'btn-success',
  create: 'btn-primary',
  update: 'btn-secondary'
}

const delay = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))

const Task = ({ id, text }) => {
  const [editing, setEditing] = useState(false)
  const [working, setWorking] = useState(false)

  let action
  if (!id) {
    action = 'create'
  } else if (editing) {
    action = 'update'
  } else {
    action = 'complete'
  }

  async function doAction() {
    setWorking(true)
    try {
      await delay(1000)
      await TASK_STORE[action](id, text)
    } catch (err) {
      alert(err.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <li className="list-group-item">
      <form
        onSubmit={e => {
          doAction()
          e.preventDefault()
        }}
      >
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            defaultValue={text}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            disabled={working}
          />
          <div className="input-group-append">
            <button
              className={classNames('btn', ACTION_CLASSES[action])}
              type="submit"
              style={{ minWidth: '3em' }}
              disabled={working}
              aria-label={action}
            >
              {ACTION_ICONS[action]}
            </button>
          </div>
        </div>
      </form>
    </li>
  )
}

Task.propTypes = {
  id: PropTypes.number,
  text: PropTypes.string
}

export default Task
