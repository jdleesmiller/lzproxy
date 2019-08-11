setTimeout(() => {
  throw new Error('I crash after 1s')
}, 1000)
