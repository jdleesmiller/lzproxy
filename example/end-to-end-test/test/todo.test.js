const puppeteer = require('puppeteer')
// const cleanup = require('storage/test/support/cleanup')
// const fixtures = require('storage/test/support/fixtures')

before(async () => {
  global.browser = await puppeteer.launch()
})

after(async () => {
  await global.browser.close()
})

describe('TO DO', function() {
  this.timeout(5000)

  it('loads', async () => {
    const page = await global.browser.newPage()
    await page.goto('http://todo:8080')
    await page.screenshot({ path: 'example.png' })
  })
})
