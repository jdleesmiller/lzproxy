const express = require('express')

const app = express()

const port = parseInt(process.env.PORT, 10)

app.get('/status', (req, res) => res.sendStatus(204))

app.get('/', (req, res) => {
  res.json({ port, env: process.env })
})

app.listen(port)
