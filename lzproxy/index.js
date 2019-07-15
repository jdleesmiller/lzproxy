const http = require('http')
const httpProxy = require('http-proxy')
const { spawn } = require('child_process')
const getPort = require('get-port')

module.exports = function lzproxy(options) {
  const proxy = httpProxy.createProxyServer({})
  const proxyServer = http.createServer(proxyHandler)
  proxyServer.listen(options.port, () => {
    console.log(`proxy listening on ${options.port}`)
  })

  proxy.on('error', (err, req, res, target) => {
    console.log('proxy err')
    console.log(err)
    res.writeHead(500) // TODO: 503?
    res.end()
  })

  let child = null
  let port = null
  async function proxyHandler(req, res) {
    try {
      console.log('incoming')
      if (!child) await startTarget()
      proxy.web(req, res, { target: `http://127.0.0.1:${port}` })
    } catch (err) {
      console.log(err)
      res.writeHead(500) // TODO: 503?
      res.end()
    }
  }

  async function startTarget() {
    const [command, ...args] = options._
    console.log('spawning: ' + command + ' ' + args)
    port = await getPort()
    child = spawn(command, args, {
      env: makeTargetEnv(),
      detached: true
    })

    child.stdout.on('data', data => {
      console.log(`stdout: ${data}`)
    })

    child.stderr.on('data', data => {
      console.log(`stderr: ${data}`)
    })

    child.on('close', code => {
      console.log(`child process exited with code ${code}`)
    })

    child.on('error', err => {
      console.log('Failed to start subprocess.')
      console.log(err)
    })

    await targetIsLive()

    console.log('target is live')
  }

  function makeTargetEnv() {
    const env = {}
    for (const key in process.env) {
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) continue
      env[key] = process.env[key]
    }
    env.PORT = port.toString()
    console.log(env)
    return env
  }

  const delay = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))

  async function targetIsLive() {
    let tries = 0
    for (;;) {
      try {
        tries += 1
        console.log(`probing ${tries}`)
        await probeTarget()
        break
      } catch (err) {
        if (tries > 5) throw new Error('child did not come up')
        await delay(1000)
      }
    }
  }

  async function probeTarget() {
    await new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: '/' // TODO: probably needs to be configurable
        },
        res => {
          const { statusCode } = res
          if (!statusCode || statusCode >= 400) {
            throw new Error(`bad status code ${statusCode}`)
          }
          res.resume() // discard the rest of the response
          resolve()
        }
      )

      req.on('error', reject)
      req.end()
    })
  }
}
