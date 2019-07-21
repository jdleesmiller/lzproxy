const util = require('util')
const http = require('http')
const httpProxy = require('http-proxy')
const { spawn } = require('child_process')
const getPort = require('get-port')

const liveness = require('./liveness')

class Proxy {
  constructor(config) {
    this.config = config

    this.proxy = httpProxy.createProxyServer({})
    this.proxy.on('error', (err, req, res, target) => {
      console.log('proxy err')
      console.log(err)
      res.writeHead(500) // TODO: 503?
      res.end()
    })

    this.target = null
    this.targetPort = null
    this.targetResult = null

    this.server = http.createServer(this._handleProxyRequest.bind(this))
    this.server.listen(config.port, () => {
      console.log(`lzproxy: listening on ${this.config.port}`)
    })

    this._closeServer = util.promisify(this.server.close).bind(this.server)
  }

  async stop() {
    console.log('lzproxy: stopping')
    await this._closeServer()
    return this._stopTarget()
  }

  async waitForTargetLivenessProbe() {
    await liveness.waitFor(this.getLivenessProbeUrl(), {
      maxTries: this.config.livenessMaxTries,
      retryDelayMs: this.config.livenessRetryDelayMs,
      timeoutMs: this.config.livenessTimeoutMs
    })
  }

  getLivenessProbeUrl() {
    return new URL(this.config.livenessProbePath, this._getTarget())
  }

  async _handleProxyRequest(req, res) {
    try {
      console.log('incoming')
      if (!this.target) await this._startTarget()
      this.proxy.web(req, res, {
        target: this._getTarget()
      })
    } catch (err) {
      console.log(err)
      res.writeHead(500) // TODO: 503?
      res.end()
    }
  }

  _getTarget() {
    return `http://127.0.0.1:${this.targetPort}`
  }

  async _startTarget() {
    const [command, ...args] = this.config.command
    this.targetPort = await getPort()
    this.target = spawn(command, args, {
      env: this._makeTargetEnv(),
      detached: true
    })

    this.target.stdout.on('data', data => {
      console.log(`stdout: ${data}`)
    })

    this.target.stderr.on('data', data => {
      console.log(`stderr: ${data}`)
    })

    this.targetResult = new Promise((resolve, reject) => {
      this.target.on('close', (code, signal) => {
        resolve({ code, signal })
      })

      this.target.on('error', error => {
        reject(error)
      })
    })

    await this.waitForTargetLivenessProbe()

    console.log('target is live')
  }

  _makeTargetEnv() {
    const env = { ...process.env, ...this.config.environment }
    env[this.config.targetPortEnvironmentVariable] = this.targetPort.toString()
    return env
  }

  async _stopTarget() {
    if (!this.target) return
    this.target.kill('SIGTERM')
    return this.targetResult
  }
}

module.exports = Proxy
