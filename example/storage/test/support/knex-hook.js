const { knex } = require('../..')

// Tear down the connection pool after all the tests have run, so the process
// can exit.
after(() => knex.destroy())