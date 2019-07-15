const express = require('express')
const app = express()

const port = parseInt(process.env.PORT)
if (!port) throw new Error('no port given')

app.get('/status', (req, res) => res.sendStatus(200))
app.get('/api/tasks', (req, res) =>
  res.json({ tasks: [{ id: 1, text: 'TASK 1' }, { id: 2, text: 'TASK 2' }] })
)

app.listen(port, () => console.log(`Listening on port ${port}`))
