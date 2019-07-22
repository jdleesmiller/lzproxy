// make sure we don't create data in the wrong place by accident
if (process.env.NODE_ENV !== 'test') {
  throw new Error('fixtures can only be loaded in a test environment')
}

const { knex } = require('../..')
var fixtures = require('../fixtures')

require('./knex-hook')

module.exports = {
  create,
  ...fixtures
}

async function create() {
  await knex('tasks').insert(Object.values(fixtures.tasks))
}
