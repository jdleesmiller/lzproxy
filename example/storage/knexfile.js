module.exports = {
  client: 'postgresql',
  debug: true,
  connection:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres/postgres'
}
