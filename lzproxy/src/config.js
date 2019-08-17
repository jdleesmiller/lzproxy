const fs = require('fs')

function read(pathname) {
  try {
    const configData = JSON.parse(fs.readFileSync(pathname, 'utf8'))
    return normalize(configData)
  } catch (error) {
    throw new Error(`lzproxy: failed to read config: ${error.message}`)
  }
}

function normalize(configData) {
  const config = configData.lzproxy || {}

  if (!config.options) config.options = {}

  const defaultOptions = {
    command: ['npm', 'start'],
    environment: {},
    host: '127.0.0.1',
    idleTimeoutMs: null,
    proxyIncomingTimeoutMs: null,
    proxyOutgoingTimeoutMs: null,
    port: parseInt(process.env.PORT, 10) || 0,
    name: process.env.PORT || '',
    readinessMaxTries: 20,
    readinessProbePath: '/',
    readinessProbePathRegExp: null,
    readinessProbeResponseStatusCode: 200,
    readinessProbeResponseBody: null,
    readinessRetryDelayMs: 1000,
    readinessTimeoutMs: 2000,
    targetPort: null,
    targetPortEnvironmentVariable: 'PORT',
    targetTerminationSignal: 'SIGTERM'
  }

  config.options = { ...defaultOptions, ...config.options }
  normalizeOptions(config.options)

  if (!config.proxies || config.proxies.length === 0) {
    config.proxies = [{}]
  }

  return config.proxies.map(proxyConfig => ({
    ...config.options,
    ...proxyConfig
  }))
}

function normalizeOptions(options) {
  if (!options.readinessProbePathRegExp) {
    options.readinessProbePathRegExp = new RegExp(
      `^${options.readinessProbePath}$`
    )
  }
  return options
}

exports.read = read
exports.normalize = normalize
