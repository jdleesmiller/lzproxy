const fs = require('fs')

const PROBE_DEFAULT = {
  maxTries: 30,
  path: '/healthz',
  pathRegExp: undefined, // set dynamically from the path
  responseStatusCode: 200,
  responseBody: '',
  retryDelayMs: 1000,
  timeoutMs: 2000,
}

const DEFAULT = {
  command: ['node', 'server.js'],
  environment: {},
  host: '::',
  idleTimeoutMs: undefined,
  name: undefined, // set from portEnvironmentVariable
  port: undefined, // set from portEnvironmentVariable
  portEnvironmentVariable: 'PORT',
  probes: [PROBE_DEFAULT],
  proxyIncomingTimeoutMs: undefined,
  proxyOutgoingTimeoutMs: undefined,
  targetPort: undefined,
  targetPortEnvironmentVariable: undefined, // set from portEnvironmentVariable
  targetTerminationSignal: 'SIGTERM',
}

/**
 * Read config from command line, which may include reading a config file.
 *
 * @param {Object} argv output from yargs
 * @return {Object} normalized configuration object
 */
function createFromCommandLineArguments(argv) {
  let config = {}
  if (argv.config) {
    try {
      config = JSON.parse(fs.readFileSync(argv.config, 'utf8'))
      if (config.lzproxy) config = config.lzproxy
    } catch (error) {
      throw new Error(`lzproxy: failed to read config: ${error.message}`)
    }
  }
  argv.command = argv._
  argv.probes = createProbesFromCommandLineArguments(argv)

  config.options = { ...config.options, ...argv }
  return normalize(config)
}

//
// The probe options we get from the CLI are separate arrays, e.g.
// { path: [path1, path2] }
// but we want
// [ {path: path1}, {path: path2} ]
//
// Either all the property arrays must be the same length, or they must all be
// unit length except for the paths, in which case the other property values
// will apply to all the probes.
//
function createProbesFromCommandLineArguments(argv) {
  const properties = {
    maxTries: 'readinessProbeMaxTries',
    path: 'readinessProbePath',
    responseStatusCode: 'readinessProbeResponseStatusCode',
    responseBody: 'readinessProbeResponseBody',
    retryDelayMs: 'readinessProbeRetryDelayMs',
    timeoutMs: 'readinessProbeTimeoutMs',
  }

  const numProbes = argv.readinessProbePath.length
  for (const property of Object.values(properties)) {
    if (argv[property].length !== 1 && argv[property].length !== numProbes)
      throw new Error(`lzproxy: must have 1 or ${numProbes} ${property} values`)
  }

  return [...Array(numProbes).keys()].map(expandProbe)

  function expandProbe(i) {
    const probe = {}
    for (const [destin, origin] of Object.entries(properties)) {
      if (argv[origin].length === 1) {
        probe[destin] = argv[origin][0]
      } else {
        probe[destin] = argv[origin][i]
      }
    }
    return probe
  }
}

function normalize(config) {
  if (!config.options) config.options = {}

  if (!config.proxies || config.proxies.length === 0) {
    config.proxies = [{}]
  }

  return config.proxies.map((proxyOptions) =>
    normalizeOptions({
      ...config.options,
      ...proxyOptions,
    })
  )
}

function normalizeOptions(options) {
  const result = keepOnlyTemplateKeys(DEFAULT, options)

  if (result.port == null)
    result.port = getPortFromEnvironmentVariable(result.portEnvironmentVariable)

  if (!result.name) result.name = (result.port || '').toString()

  if (result.targetPortEnvironmentVariable == null) {
    result.targetPortEnvironmentVariable = result.portEnvironmentVariable
  }
  if (!result.targetPortEnvironmentVariable)
    throw new Error('lzproxy: missing targetPortEnvironmentVariable')

  result.probes = result.probes.map((probe) => {
    const probeResult = keepOnlyTemplateKeys(PROBE_DEFAULT, probe)
    if (!probeResult.pathRegExp) {
      probeResult.pathRegExp = new RegExp(`^${probeResult.path}$`)
    }
    return probeResult
  })

  return result
}

function keepOnlyTemplateKeys(template, input) {
  const result = { ...template }
  for (const [key, value] of Object.entries(input)) {
    if (Object.prototype.hasOwnProperty.call(result, key)) result[key] = value
  }
  return result
}

function getPortFromEnvironmentVariable(name) {
  if (!name) throw new Error('lzproxy: no port environment variable name')

  const port = process.env[name]
  if (!port) throw new Error(`lzproxy: no port set by variable ${name}`)

  const portNumber = parseInt(port, 10)
  if (!isFinite(portNumber) || portNumber < 0)
    throw new Error(`lzproxy: bad port number ${port}`)

  return portNumber
}

exports.DEFAULT = DEFAULT
exports.PROBE_DEFAULT = PROBE_DEFAULT
exports.createFromCommandLineArguments = createFromCommandLineArguments
exports.normalize = normalize
