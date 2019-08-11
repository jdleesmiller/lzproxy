//
// Buffer with blocking shift so caller can wait for a new event. Should
// probably be a ring buffer.
//
class ProducerConsumerBuffer {
  constructor() {
    this.items = []
    this.consumers = []
  }

  push(item) {
    if (this.consumers.length > 0) {
      const resolve = this.consumers.shift()
      resolve(item)
    } else {
      this.items.push(item)
    }
  }

  shift() {
    return new Promise((resolve, reject) => {
      if (this.items.length > 0) {
        resolve(this.items.shift())
      } else {
        this.consumers.push(resolve)
      }
    })
  }
}

module.exports = ProducerConsumerBuffer
