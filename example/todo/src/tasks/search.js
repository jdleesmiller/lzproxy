import React from 'react'

import TASK_STORE from './task_store'

const Search = () => {
  const queryRef = React.createRef()

  return (
    <form
      onSubmit={e => {
        TASK_STORE.search(queryRef.current.value)
        e.preventDefault()
      }}
    >
      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          aria-label="Search"
          ref={queryRef}
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
