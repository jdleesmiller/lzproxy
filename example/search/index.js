const express = require('express')
const app = express()

const port = parseInt(process.env.PORT)
if (!port) throw new Error('no port given')

app.get('/status', (req, res) => res.sendStatus(200))
app.get('/', (req, res) => res.json({ widgets: [] }))

app.listen(port, () => console.log(`Listening on port ${port}`))
