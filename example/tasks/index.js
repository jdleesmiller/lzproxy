const bodyParser = require('body-parser')
const express = require('express')

const { Task } = require('storage')

const app = express()

app.use(bodyParser.json())

app.get('/status', (req, res) => res.sendStatus(200))

app.get('/api/tasks', async (req, res, next) => {
  try {
    // TODO move to search service
    const tasks = await Task.query()
      // .whereRaw('to_tsvector(tasks.description) @@ plainto_tsquery(?)', 'foo')
      .orderBy('id')
    res.json({ tasks })
  } catch (error) {
    next(error)
  }
})

app.post('/api/tasks', async (req, res, next) => {
  try {
    const task = await Task.query().insert({
      description: req.body.description
    })
    res.json({ task })
  } catch (error) {
    if (error instanceof Task.ValidationError) {
      res.status(400).json({ error: { message: error.message } })
    }
    next(error)
  }
})

app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    await Task.query().deleteById(req.params.id)
    res.sendStatus(204)
  } catch (error) {
    next(error)
  }
})

const port = parseInt(process.env.PORT)
if (!port) throw new Error('no port given')
app.listen(port, () => console.log(`Listening on port ${port}`))
