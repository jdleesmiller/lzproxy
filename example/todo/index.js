const express = require('express')
const httpProxy = require('http-proxy')

const app = express()

// Internal port to run this service on.
const PORT = parseInt(process.env.PORT)
if (!PORT) throw new Error('no port given')

// We also assume that other internal services are running on this port.
const TASKS_TARGET = `http://tasks:${PORT}`
const SEARCH_TARGET = `http://search:${PORT}`

//
// Proxy internal APIs
//

const apiProxy = httpProxy.createProxyServer({})

apiProxy.on('error', function(err, req, res, target) {
  // The upstream server failed.
  console.error(err)
  res.sendStatus(502)
})

apiProxy.on('econnreset', function(_err, req, res, target) {
  // The client reset the socket. This is probably not our fault.
  console.log('proxy econnreset on %s %s', target.toString(), req.url)
})

app.get('/api/tasks', (req, res) => {
  // If there is a search, proxy to the search service; otherwise proxy
  // to the tasks service.
  const target = req.query.q ? SEARCH_TARGET : TASKS_TARGET
  apiProxy.web(req, res, { target })
})

app.all('/api/tasks', (req, res) => {
  apiProxy.web(req, res, { target: TASKS_TARGET })
})

//
// Serve the frontend
//

const config = require('./webpack.config.js')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(config.output.path))
} else {
  const webpack = require('webpack')
  const webpackDevMiddleware = require('webpack-dev-middleware')
  const compiler = webpack(config)

  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath
    })
  )
}

app.listen(PORT, function() {
  console.log(`todo: listening on ${PORT}`)
})
