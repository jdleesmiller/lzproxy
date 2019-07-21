const knex = require('knex')
const { Model } = require('objection')

const knexfile = require('./knexfile')

// const nodeEnv = process.env.NODE_ENV || 'development'
Model.knex(knex(knexfile))

class Task extends Model {
  static get tableName() {
    return 'tasks'
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['description'],

      properties: {
        id: { type: 'integer' },
        description: { type: 'string', minLength: 1, maxLength: 255 }
      }
    }
  }
}

exports.Task = Task
