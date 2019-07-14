// based on https://stackoverflow.com/a/2821201
const ENVIRONMENT_VARIABLE_RX = /^([a-zA-Z_]+[a-zA-Z0-9_]*)=(.+)$/

module.exports = require('yargs') //
  .usage('$0 [options] command-to-proxy ...')
  .env('LZPROXY')
  .parserConfiguration({ 'halt-at-non-option': true })
  .option('port', {
    default: () => parseInt(process.env.PORT || 0),
    defaultDescription: 'process.env.PORT || 0',
    description: 'on which the lazy proxy listens',
    number: true,
    requiresArg: true
  })
  .option('env', {
    array: true,
    coerce: coerceEnvironmentVariableDeclarations,
    description: 'environment variable(s) to pass to the child (VAR=value)',
    requiresArg: true
  })
  .option('verbose', {
    default: false
  }).argv

function coerceEnvironmentVariableDeclarations(args) {
  return args.map(arg => {
    const match = arg.match(ENVIRONMENT_VARIABLE_RX)
    if (!match) throw new Error(`bad env var declaration: ${arg}`)
    return match.slice(1, 3)
  })
}
