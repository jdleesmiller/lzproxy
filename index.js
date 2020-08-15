const Proxy = require('./src/proxy')
const Target = require('./src/target')

/**
 * Start proxy or proxies from config.
 *
 * @param {Object} proxyConfigs
 * @param {?function} onTargetStdout called when target writes to stdout
 * @param {?function} onTargetStderr called when target writes to stderr
 * @param {?function} log called when proxy logs (errors / warnings)
 * @return {Array.<Proxy>}
 */
function start(proxyConfigs, onTargetStdout, onTargetStderr, log) {
  return proxyConfigs.map(
    (proxyConfig) => new Proxy(proxyConfig, onTargetStdout, onTargetStderr, log)
  )
}

exports.start = start
exports.Proxy = Proxy
exports.Target = Target
