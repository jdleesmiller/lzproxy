const path = require('path')

module.exports = require('yargs') //
  .usage('$0 [options]')
  .env('LZPROXY')
  .option('config', {
    default: path.join(process.cwd(), 'package.json'),
    description: 'path to file with configuration',
    requiresArg: true
  }).argv
