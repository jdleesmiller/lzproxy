const express = require('express')
const http = require('http')

const app = express()
const server = http.createServer(app)

const port = parseInt(process.env.PORT, 10)

app.get('/status', (req, res) => res.sendStatus(204))

app.get('/', (req, res) => {
  res.json({ port, pid: process.pid, env: process.env })
})

app.post('/stop', (req, res) => {
  if (req.query.code) process.exitCode = parseInt(req.query.code, 10)
  res.sendStatus(204)
  setTimeout(() => {
    server.close()
  }, 0)
})

server.listen(port)

process.on('SIGTERM', function () {
  server.close()
})
