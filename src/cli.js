const { DEFAULT, PROBE_DEFAULT } = require('./config')

module.exports = function (yargs) {
  return yargs //
    .usage('$0 [options] -- [command to start target server]')
    .showHidden()
    .env('LZPROXY')
    .option('config', {
      description: 'path to configuration file',
      requiresArg: true,
    })
    .option('environment', {
      alias: 'e',
      array: true,
      description:
        'pass an environment variable to the target (format: --environment.FOO=bar)',
      requiresArg: true,
    })
    .option('host', {
      default: DEFAULT.host,
      description: 'hostname that the proxy should listen on',
      requiresArg: true,
    })
    .option('idle-timeout-ms', {
      default: DEFAULT.idleTimeoutMs,
      description: 'stop the target if it has been idle for this long',
      number: true,
      requiresArg: true,
    })
    .option('name', {
      description:
        'name of the proxy used in the logs; defaults to port number',
      hidden: true,
      requiresArg: true,
    })
    .option('port', {
      description: 'force proxy to run on the given port',
      hidden: true,
      number: true,
      requiresArg: true,
    })
    .option('port-environment-variable', {
      alias: 'o',
      default: DEFAULT.portEnvironmentVariable,
      description:
        'name of environment variable that sets the port number that the proxy (and target, by default) listens on',
      requiresArg: true,
    })
    .option('proxy-incoming-timeout-ms', {
      default: DEFAULT.proxyIncomingTimeoutMs,
      description: "see node-http-proxy's `timeout` property",
      hidden: true,
      requiresArg: true,
    })
    .option('proxy-outgoing-timeout-ms', {
      default: DEFAULT.proxyOutgoingTimeoutMs,
      description: "see node-http-proxy's `proxyTimeout` property",
      hidden: true,
      requiresArg: true,
    })
    .option('readiness-probe-max-tries', {
      alias: 't',
      array: true,
      default: PROBE_DEFAULT.maxTries,
      description:
        'probe the newly started target this many times before giving up',
      number: true,
      requiresArg: true,
    })
    .option('readiness-probe-path', {
      alias: 'p',
      array: true,
      default: PROBE_DEFAULT.path,
      description: 'path of status / health check endpoint to fake and probe',
      requiresArg: true,
    })
    .option('readiness-probe-response-status-code', {
      array: true,
      default: PROBE_DEFAULT.responseStatusCode,
      description:
        'HTTP response code of the fake status / health check endpoint',
      hidden: true,
      number: true,
      requiresArg: true,
    })
    .option('readiness-probe-response-body', {
      array: true,
      default: PROBE_DEFAULT.responseBody,
      description:
        'string to return in the body of the fake status / health check endpoint',
      hidden: true,
      requiresArg: true,
    })
    .option('readiness-probe-retry-delay-ms', {
      alias: 'd',
      array: true,
      default: PROBE_DEFAULT.retryDelayMs,
      description: 'wait this long between readiness probes',
      number: true,
      requiresArg: true,
    })
    .option('readiness-probe-timeout-ms', {
      array: true,
      default: PROBE_DEFAULT.timeoutMs,
      description: 'consider a readiness probe failed if it takes this long',
      hidden: true,
      number: true,
      requiresArg: true,
    })
    .option('target-port', {
      description:
        'start the target on the given port instead of a random port',
      hidden: true,
      number: true,
      requiresArg: true,
    })
    .option('target-port-environment-variable', {
      description:
        'name of environment variable with the port number passed to the target (defaults to port-environment-variable)',
      requiresArg: true,
    })
    .option('target-termination-signal', {
      default: 'SIGTERM',
      description: 'signal sent to the target to terminate',
      requiresArg: true,
    })
    .example('$0', 'run `node server.js` as the target')
    .example(
      '$0 -p /status -- nodemon server.js',
      'run server.js under nodemon using /status as its readiness probe endpoint'
    )
    .wrap(null)
    .strict()
}
