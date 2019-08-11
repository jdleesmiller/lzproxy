const debug = require('debug')('lzproxy:proxy')
const http = require('http')
const httpProxy = require('http-proxy')

const Target = require('./target')

//
// State machine
//
// STARTING - in constructor, server not yet up
// - request -> TARGET_STARTING
// - sigterm -> SHUTTING_DOWN
// - idleTimeout -> ignore
//
// UP - proxy server up, no target
// - request -> TARGET_STARTING (queue request)
// - sigterm -> SHUTTING_DOWN
// - idleTimeout -> ignore
//
// TARGET_STARTING - proxy server up, waiting for target ready
// - request -> TARGET_STARTING (queue request)
// - targetExit -> UP (return 500s on all queued requests)
//   - or we could retry here, but I think it's OK to just fail
// - sigterm -> TARGET_STOPPING_SHUTDOWN (pass on the sigterm)
// - targetReadySuccess -> TARGET_UP
// - targetReadyFail -> UP (return 503s on all queued requests)
// - idleTimeout -> TARGET_STOPPING (send sigterm)
//
// TARGET_UP - proxy server up, target up
// - request -> TARGET_UP (proxy request)
// - targetExit -> UP
// - sigterm -> TARGET_STOPPING_SHUTDOWN (pass on the sigterm)
// - idleTimeout -> TARGET_STOPPING (send sigterm)
//
// TARGET_STOPPING - proxy server up, waiting for target to exit
// - request -> TARGET_RESTARTING (queue request)
// - targetExit -> UP
// - sigterm -> TARGET_STOPPING_SHUTDOWN (pass on the sigterm)
// - idleTimeout -> ignore
//
// TARGET_STOPPING_FOR_RESTART - proxy server up, when target exits, reboot it
// - request -> TARGET_STOPPING_FOR_RESTART (queue request)
// - targetExit -> TARGET_STARTING
// - sigterm -> TARGET_STOPPING_SHUTDOWN (abort the restart)
// - idleTimeout -> ignore
//
// TARGET_STOPPING_FOR_SHUTDOWN - stop target and then shut down the proxy
// - request -> TARGET_STOPPING_SHUTDOWN (return a 503)
// - targetExit -> SHUTTING_DOWN
// - sigterm -> ignore
// - idleTimeout -> ignore
//
// SHUTTING_DOWN - proxy server shutting down, target stopped
// - request -> SHUTTING_DOWN (return a 503)
// - targetExit -> SHUTTING_DOWN (ignore)
// - serverStopped -> SHUT_DOWN
// - sigterm -> ignore
// - idleTimeout -> ignore
//
// SHUT_DOWN - proxy process is exiting
// - request -> SHUT_DOWN (return a 503)
// - targetExit -> ignore
// - sigterm -> ignore
// - idleTimeout -> ignore
//

const STATE_NAMES = [
  'starting',
  'up',
  'target-starting',
  'target-up',
  'target-stopping',
  'target-stopping-for-restart',
  'target-stopping-for-shutdown',
  'shutting-down',
  'shut-down'
]

const STATE_STARTING = 0
const STATE_UP = 1
const STATE_TARGET_STARTING = 2
const STATE_TARGET_UP = 3
const STATE_TARGET_STOPPING = 4
const STATE_TARGET_STOPPING_FOR_RESTART = 5
const STATE_TARGET_STOPPING_FOR_SHUTDOWN = 6
const STATE_SHUTTING_DOWN = 7
const STATE_SHUT_DOWN = 8

class Proxy {
  constructor(config, onTargetStdout, onTargetStderr) {
    this.config = config
    this.state = STATE_STARTING

    this.target = new Target(
      config,
      this._handleTargetReady.bind(this),
      this._handleTargetExit.bind(this),
      onTargetStdout,
      onTargetStderr
    )

    this.proxy = httpProxy.createProxyServer({})
    this.proxy.on('error', (err, req, res, target) => {
      console.log('proxy err')
      console.log(err)
      res.writeHead(500) // TODO: 503?
      res.end()
    })

    // Promise that resolves when the server is listening.
    this._up = new Promise((resolve, reject) => {
      this._upResolve = resolve
      this._upReject = reject
    })

    // Promise that resolves when the target is ready for requests.
    this._targetReady = null

    this.server = http.createServer(this._handleProxyRequest.bind(this))
    this.server.on('error', this._handleServerError.bind(this))
    this.server.listen(config.port, this._handleServerListening.bind(this))
  }

  stop() {
    debug('stopping')
    switch (this.state) {
      case STATE_STARTING:
      case STATE_UP:
        this.state = STATE_SHUTTING_DOWN
        this._closeServer()
        return
      case STATE_TARGET_STARTING:
      case STATE_TARGET_UP:
      case STATE_TARGET_STOPPING:
      case STATE_TARGET_STOPPING_FOR_RESTART:
        this.state = STATE_TARGET_STOPPING_FOR_SHUTDOWN
        this.target.stop()
        return
      case STATE_TARGET_STOPPING_FOR_SHUTDOWN:
      case STATE_SHUTTING_DOWN:
      case STATE_SHUT_DOWN:
        return // ignore
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  isStopped() {
    return this.state === STATE_SHUT_DOWN
  }

  _handleServerListening() {
    debug('_handleServerListening')
    switch (this.state) {
      case STATE_STARTING:
        this.state = STATE_UP
        this._upResolve()
        return
      case STATE_UP:
      case STATE_TARGET_STARTING:
      case STATE_TARGET_UP:
      case STATE_TARGET_STOPPING:
      case STATE_TARGET_STOPPING_FOR_RESTART:
      case STATE_TARGET_STOPPING_FOR_SHUTDOWN:
      case STATE_SHUTTING_DOWN:
      case STATE_SHUT_DOWN:
        throw new Error(`${this}: proxy server listening unexpectedly`)
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  _handleServerError(error) {
    throw error // just crash
  }

  _handleServerClosed() {
    switch (this.state) {
      case STATE_STARTING:
      case STATE_UP:
      case STATE_TARGET_STARTING:
      case STATE_TARGET_UP:
      case STATE_TARGET_STOPPING:
      case STATE_TARGET_STOPPING_FOR_RESTART:
      case STATE_TARGET_STOPPING_FOR_SHUTDOWN:
      case STATE_SHUT_DOWN:
        throw new Error(`${this}: proxy server closed unexpectedly`)
      case STATE_SHUTTING_DOWN:
        this.state = STATE_SHUT_DOWN
        return
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  async _handleProxyRequest(req, res) {
    debug('_handleProxyRequest')
    try {
      switch (this.state) {
        case STATE_STARTING:
          await this._up
          await this._handleProxyRequest(req, res)
          return
        case STATE_UP:
          this.state = STATE_TARGET_STARTING
          this._startTarget()
        // fall through
        case STATE_TARGET_STARTING:
          await this._targetReady
          await this._handleProxyRequest(req, res)
          return
        case STATE_TARGET_UP:
          this.proxy.web(req, res, {
            target: this.target.getUrl()
          })
          return
        case STATE_TARGET_STOPPING:
          this.state = STATE_TARGET_STOPPING_FOR_RESTART
          this._startTarget()
        // fall through
        case STATE_TARGET_STOPPING_FOR_RESTART:
          await this._targetReady
          await this._handleProxyRequest(req, res)
          return
        case STATE_TARGET_STOPPING_FOR_SHUTDOWN:
        case STATE_SHUTTING_DOWN:
        case STATE_SHUT_DOWN:
          res.writeHead(503)
          res.end()
          return
        default:
          throw new Error(`${this}: bad state`)
      }
    } catch (error) {
      console.error(error)
      res.writeHead(503)
      res.end()
    }
  }

  _startTarget() {
    if (this._targetReady) return
    this._targetReady = new Promise((resolve, reject) => {
      this._targetReadyResolve = resolve
      this._targetReadyReject = reject
    })
    this.target.start()
  }

  _handleTargetReady() {
    switch (this.state) {
      case STATE_TARGET_STARTING:
        this.state = STATE_TARGET_UP
        this._targetReadyResolve()
        this._targetReady = null
        return
      case STATE_STARTING:
      case STATE_UP:
      case STATE_TARGET_UP:
      case STATE_TARGET_STOPPING:
      case STATE_TARGET_STOPPING_FOR_RESTART:
      case STATE_TARGET_STOPPING_FOR_SHUTDOWN:
      case STATE_SHUTTING_DOWN:
      case STATE_SHUT_DOWN:
        throw new Error(`${this}: unexpected target ready`)
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  _handleTargetExit({ error, code, signal }) {
    debug('_handleTargetExit')
    if (error) console.error(error)
    switch (this.state) {
      case STATE_TARGET_STARTING:
        if (error) {
          this._targetReadyReject(error)
        } else {
          this._targetReadyReject(
            new Error(
              `${this}: target exited with code ${code} / signal ${signal}`
            )
          )
        }
        this._targetReady = null
        return
      case STATE_TARGET_UP:
      case STATE_TARGET_STOPPING:
        this.state = STATE_UP
        return
      case STATE_TARGET_STOPPING_FOR_RESTART:
        this.state = STATE_TARGET_STARTING
        this._startTarget()
        return
      case STATE_TARGET_STOPPING_FOR_SHUTDOWN:
        this.state = STATE_SHUTTING_DOWN
        this._closeServer()
        return
      case STATE_STARTING:
      case STATE_UP:
      case STATE_SHUTTING_DOWN:
      case STATE_SHUT_DOWN:
        throw new Error(`${this}: unexpected target exit`)
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  _closeServer() {
    this.server.close(this._handleServerClosed.bind(this))
  }

  toString() {
    const state = STATE_NAMES[this.state] || this.state
    return `lzproxy ${this.config.name} (${state})`
  }
}

module.exports = Proxy
