const express = require('express')
const http = require('http')

const app = express()
const server = http.createServer(app)

const port = parseInt(process.env.PORT, 10)

app.get('/status', (req, res) => {
  // do nothing; let the request hang
})

server.listen(port)

process.on('SIGTERM', function() {
  server.close()
})
