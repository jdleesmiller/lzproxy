const { spawn } = require('child_process')
const debug = require('debug')('lzproxy:target')
const getPort = require('get-port')
const readline = require('readline')

const readiness = require('./readiness')

//
// IDLE - not started
// start -> STARTING
// stop -> ignore
//
// STARTING
// start -> ignore
// stop -> STOPPING (send sigterm)
// readinessPass -> UP
// readinessFail -> STOPPING (send sigterm)
//
// UP
// start -> ignore
// stop -> STOPPING (send sigterm)
// exited -> IDLE
//
// STOPPING
// start -> RESTART
// stop -> ignore
// exited -> IDLE
//
// RESTART
// start -> ignore
// stop -> STOPPING (already stopping)
// exited -> STARTING
//

const STATE_NAMES = ['idle', 'starting', 'up', 'stopping', 'restarting']

const STATE_IDLE = 0
const STATE_STARTING = 1
const STATE_UP = 2
const STATE_STOPPING = 3
const STATE_RESTARTING = 4

class Target {
  constructor(config, onReady, onExit, onStdout, onStderr) {
    this.config = config
    this.onReady = onReady
    this.onExit = onExit
    this.onStdout = onStdout || (line => console.log(`${this}: ${line}`))
    this.onStderr = onStderr || (line => console.error(`${this}: ${line}`))
    this.state = STATE_IDLE

    this.port = null
    this.target = null
    this.readinessError = null
  }

  getUrl() {
    return this.port ? `http://127.0.0.1:${this.port}` : null
  }

  isIdle() {
    return this.state === STATE_IDLE
  }

  start() {
    debug('start')
    switch (this.state) {
      case STATE_IDLE:
        this.state = STATE_STARTING
        this._start()
        return
      case STATE_STARTING:
      case STATE_UP:
      case STATE_RESTARTING:
        return // ignore
      case STATE_STOPPING:
        this.state = STATE_RESTARTING
        return
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  stop() {
    debug('stop')
    switch (this.state) {
      case STATE_IDLE:
      case STATE_STOPPING:
        return // ignore
      case STATE_RESTARTING:
        this.state = STATE_STOPPING
        return
      case STATE_STARTING:
      case STATE_UP:
        this.state = STATE_STOPPING
        this._stop()
        return
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  _handleTargetClose(code, signal) {
    debug('_handleTargetClose')
    switch (this.state) {
      case STATE_IDLE:
        throw new Error(`${this}: unexpected target close ${code} / ${signal}`)
      case STATE_STARTING:
      case STATE_UP:
      case STATE_STOPPING:
      case STATE_RESTARTING:
        const error = this.readinessError
        this.onExit({ error, code, signal })
        this._restartOrIdle()
        return
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  _handleTargetError(error) {
    debug('_handleTargetError')
    switch (this.state) {
      case STATE_IDLE:
        throw new Error(`${this}: unexpected target error ${error}`)
      case STATE_STARTING:
      case STATE_UP:
      case STATE_STOPPING:
      case STATE_RESTARTING:
        this.onExit({ error })
        this._restartOrIdle()
        return
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  _restartOrIdle() {
    this.port = null
    this.target = null
    if (this.state === STATE_RESTARTING) {
      this.state = STATE_STARTING
      this._start()
    } else {
      this.state = STATE_IDLE
    }
  }

  _handleReadinessSuccess() {
    debug('_handleReadinessSuccess')
    switch (this.state) {
      case STATE_IDLE:
      case STATE_UP:
        return // ignore
      case STATE_STARTING:
        this.state = STATE_UP
        this.onReady()
        return
      case STATE_STOPPING:
      case STATE_RESTARTING:
        return // ignore
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  _handleReadinessFailure() {
    debug('_handleReadinessFailure')
    switch (this.state) {
      case STATE_IDLE:
      case STATE_UP:
        return // ignore
      case STATE_STARTING:
        this.state = STATE_STOPPING
        this._stop()
        return
      case STATE_STOPPING:
      case STATE_RESTARTING:
        return // ignore
      default:
        throw new Error(`${this}: bad state`)
    }
  }

  async _start() {
    const [command, ...args] = this.config.command
    debug(`target command ${this.config.command}`)
    this.port = await getPort({ host: '::' })
    debug(`target port ${this.port}`)
    this.readinessError = null
    this.target = spawn(command, args, {
      env: this._makeTargetEnv(),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    readline
      .createInterface({
        input: this.target.stdout,
        terminal: false
      })
      .on('line', this.onStdout)

    readline
      .createInterface({
        input: this.target.stderr,
        terminal: false
      })
      .on('line', this.onStderr)

    let errored = false // one or both of 'error' and 'close' can fire
    this.target.on('close', (code, signal) => {
      debug('target close')
      if (!errored) this._handleTargetClose(code, signal)
    })

    this.target.on('error', error => {
      debug('target error')
      errored = true
      this._handleTargetError(error)
    })

    this._waitForTargetReadinessProbe()
  }

  _makeTargetEnv() {
    const env = { ...process.env, ...this.config.environment }
    env[this.config.targetPortEnvironmentVariable] = this.port.toString()
    return env
  }

  _stop() {
    debug('_stop')
    this.target.kill(this.config.targetTerminationSignal)
    this.port = null
    this.target = null
  }

  async _waitForTargetReadinessProbe() {
    const probeUrl = new URL(this.config.readinessProbePath, this.getUrl())
    const maxTries = this.config.readinessMaxTries
    const retryDelayMs = this.config.readinessRetryDelayMs
    const timeoutMs = this.config.readinessTimeoutMs

    let tries = 0
    for (;;) {
      // Give up if we're no longer waiting for the process to start, e.g.
      // because it crashed on boot.
      if (this.state !== STATE_STARTING) return
      try {
        tries += 1
        await readiness.probe(probeUrl, timeoutMs)
        break
      } catch (error) {
        if (error instanceof readiness.ProbeError) {
          if (tries > maxTries) {
            this.readinessError = new readiness.ProbeError(
              `${this}: did not come up; last error: ${error.message}`
            )
            this._handleReadinessFailure()
            return
          } else {
            await delay(retryDelayMs)
          }
        } else {
          throw error
        }
      }
    }

    this._handleReadinessSuccess()
  }

  toString() {
    const state = STATE_NAMES[this.state] || this.state
    return `lzproxy: ${this.config.name} (t-${state})`
  }
}

function delay(ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

module.exports = Target
