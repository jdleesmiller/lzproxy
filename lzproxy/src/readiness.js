const fetch = require('node-fetch')

class ProbeError extends Error {}

async function probe(url, timeout) {
  try {
    const response = await fetch(url, { timeout })
    if (response.ok) return
    throw new ProbeError(`readiness probe status: ${response.status}`)
  } catch (error) {
    if (error instanceof fetch.FetchError) throw new ProbeError(error.message)
    throw error
  }
}

exports.probe = probe
exports.ProbeError = ProbeError
