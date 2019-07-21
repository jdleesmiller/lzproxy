const Proxy = require('./src/proxy')

function start(proxyConfigs) {
  return proxyConfigs.map(proxyConfig => new Proxy(proxyConfig))
}

exports.start = start
exports.Proxy = Proxy
