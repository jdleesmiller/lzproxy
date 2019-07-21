const TASKS_API_ROOT = '/api/tasks'

class TaskStore {
  constructor() {
    this.tasks = []
    this.query = ''
    this.listener = () => {}
  }

  async list() {
    const response = await fetch(this._listUrl(), {
      method: 'GET',
      headers: this._jsonHeaders()
    })
    if (!response.ok) throw new Error('failed to list')
    const body = await response.json()
    this.tasks = body.tasks
    this.listener()
  }

  async search(query) {
    this.query = query
    await this.list()
  }

  async create(description) {
    const response = await fetch(TASKS_API_ROOT, {
      method: 'POST',
      headers: this._jsonHeaders(),
      body: JSON.stringify({ description })
    })
    if (!response.ok) {
      await this._handleValidationError(response)
      throw new Error('failed to create')
    }
    await this.list()
  }

  async complete(id) {
    const response = await fetch(this._itemUrl(id), {
      method: 'DELETE',
      headers: this._jsonHeaders()
    })
    if (!response.ok) throw new Error(`failed to complete ${id}`)
    await response.text() // ignore
    await this.list()
  }

  _rootUrl() {
    return new URL(TASKS_API_ROOT, window.location.origin)
  }

  _listUrl() {
    const url = this._rootUrl()
    url.searchParams.set('q', this.query)
    return url
  }

  _itemUrl(id) {
    if (!id) throw new Error(`bad id: ${id}`)
    return new URL(id.toString(), `${this._rootUrl()}/`)
  }

  _jsonHeaders() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }

  async _handleValidationError(response) {
    if (response.status === 400) {
      const body = await response.json()
      throw new Error(body.error.message)
    }
  }
}

const TASK_STORE = new TaskStore()

export default TASK_STORE
