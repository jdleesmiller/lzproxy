const fetch = require('node-fetch')

exports.waitFor = waitFor

async function waitFor(url, { maxTries, retryDelayMs, timeoutMs }) {
  let tries = 0
  for (;;) {
    try {
      tries += 1
      await probe(url, timeoutMs)
      break
    } catch (error) {
      if (error instanceof ProbeError) {
        if (tries > maxTries) {
          throw new ProbeError(
            `lzproxy: target did not come up; last error: ${error.message}`
          )
        } else {
          await delay(retryDelayMs)
        }
      } else {
        throw error
      }
    }
  }
}

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

const delay = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
