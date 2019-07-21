import classNames from 'classnames'
import PropTypes from 'prop-types'
import React, { useState, useEffect } from 'react'

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

const Task = ({ id, description }) => {
  const descriptionRef = React.createRef()
  const [submitting, setSubmitting] = useState(false)
  const [refocusNeeded, setRefocusNeeded] = useState(false)
  const [currentDescription, setCurrentDescription] = useState(description)

  let action
  if (!id) {
    action = 'create'
  } else if (currentDescription !== description) {
    action = 'update'
  } else {
    action = 'complete'
  }

  useEffect(() => {
    // If the user updates the description so that it no longer matches the
    // current search, this component will be unmounted while the update is
    // still running; we use a cleanup function to detect this, in order to
    // avoid calling setState after being unmounted.
    let unmounted = false

    async function update() {
      try {
        await delay(100)
        if (action === 'create') {
          await TASK_STORE.create(currentDescription)
          if (!unmounted) {
            setCurrentDescription('')
            setRefocusNeeded(true)
          }
        } else if (action === 'update') {
          await TASK_STORE.update(id, currentDescription)
          if (!unmounted) setRefocusNeeded(true)
        } else if (action === 'complete') {
          await TASK_STORE.complete(id)
        }
      } catch (err) {
        alert(err.message)
      } finally {
        if (!unmounted) setSubmitting(false)
      }
    }
    if (submitting) update()

    return () => {
      unmounted = true
    }
  }, [submitting])

  // Refocus the input after a create or update completes.
  useEffect(() => {
    if (refocusNeeded && !descriptionRef.current.disabled) {
      descriptionRef.current.focus()
      setRefocusNeeded(false)
    }
  }, [refocusNeeded, submitting])

  return (
    <li className="list-group-item">
      <form
        onSubmit={e => {
          setSubmitting(true)
          e.preventDefault()
        }}
      >
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            ref={descriptionRef}
            value={currentDescription}
            disabled={submitting}
            onChange={() => setCurrentDescription(descriptionRef.current.value)}
          />
          <div className="input-group-append">
            <button
              className={classNames('btn', ACTION_CLASSES[action])}
              type="submit"
              style={{ minWidth: '3em' }}
              disabled={submitting}
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
  description: PropTypes.string
}

export default Task
