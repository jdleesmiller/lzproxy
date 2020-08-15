const express = require('express')
const http = require('http')

const app = express()
const server = http.createServer(app)

const port = parseInt(process.env.PORT, 10)

app.get('/status', (req, res) => res.sendStatus(204))

app.get('/', (req, res) => {
  process.exit(1)
})

server.listen(port)

process.on('SIGTERM', function () {
  server.close()
})
