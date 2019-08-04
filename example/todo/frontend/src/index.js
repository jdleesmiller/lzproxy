// Load polyfills
import 'whatwg-fetch'
import 'core-js/stable'
import 'regenerator-runtime/runtime'

// https://getbootstrap.com/docs/4.0/getting-started/webpack/#importing-compiled-css
import 'bootstrap/dist/css/bootstrap.min.css'

import React from 'react'
import ReactDOM from 'react-dom'

import TaskList from './tasks/task_list'

const Index = () => {
  return (
    <div className="container">
      <div className="row">
        <div className="col">
          <h1 className="mt-5 mb-3 text-center">TO DO</h1>
        </div>
      </div>
      <TaskList />
    </div>
  )
}

ReactDOM.render(<Index />, document.getElementById('index'))
