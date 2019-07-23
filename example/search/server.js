const express = require('express')
const app = express()

const { Task } = require('storage')

app.get('/status', (req, res) => res.sendStatus(204))

app.get('/api/tasks', async (req, res, next) => {
  try {
    const tasks = await Task.query()
      .whereRaw(
        'to_tsvector(tasks.description) @@ plainto_tsquery(?)',
        req.query.q || ''
      )
      .orderBy('id')
    res.json({ tasks })
  } catch (error) {
    next(error)
  }
})

const port = parseInt(process.env.PORT)
if (!port) throw new Error('no port given')
app.listen(port, () => console.log(`Listening on port ${port}`))
