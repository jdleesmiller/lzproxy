// make sure we don't delete the wrong data by accident
if (process.env.NODE_ENV !== 'test') {
  throw new Error('cleanup can only be loaded in a test environment')
}

const { knex } = require('../..')

require('./knex-hook')

exports.database = database

async function database() {
  const tables = ['tasks']
  for (const table of tables) {
    await knex(table).del()
  }
}
