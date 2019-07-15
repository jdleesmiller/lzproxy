import React from 'react'

import TASK_STORE from './task_store'

const Search = () => {
  const textRef = React.createRef()

  return (
    <form
      onSubmit={e => {
        console.log(textRef.current.value)
        TASK_STORE.search(textRef.current.value)
        e.preventDefault()
      }}
    >
      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          aria-label="Search"
          ref={textRef}
        />
        <div className="input-group-append">
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </div>
      </div>
    </form>
  )
}

export default Search
