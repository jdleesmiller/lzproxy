const common = {
  client: 'postgresql',
  connection: process.env.DATABASE_URL
}

module.exports = {
  development: {
    ...common,
    connection: 'postgres://postgres:postgres@postgres/development'
  },
  production: common,
  test: {
    ...common,
    connection: 'postgres://postgres:postgres@postgres/test'
  }
}
