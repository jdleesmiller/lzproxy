const assert = require('assert')
const puppeteer = require('puppeteer')
const cleanup = require('storage/test/support/cleanup')
const fixtures = require('storage/test/support/fixtures')

const BASE_URL =
  process.env.BASE_URL || `http://todo-frontend:${process.env.PORT}`

before(async () => {
  global.browser = await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false'
  })
})

after(async () => {
  await global.browser.close()
})

beforeEach(cleanup.database)

describe('TO DO', function() {
  this.timeout(10000)

  it('creates and completes a task', async () => {
    const page = await global.browser.newPage()
    await page.goto(BASE_URL)
    await page.waitForSelector('.todo-new-task')

    let tasks = await page.$$('.todo-task')
    assert.strictEqual(tasks.length, 0)

    await page.type('.todo-new-task input[type=text]', 'foo')
    await page.click('.todo-new-task button')
    await page.waitForSelector('.todo-task label')

    tasks = await page.$$('.todo-task')
    assert.strictEqual(tasks.length, 1)

    await page.click('.todo-task button')
    await page.waitForSelector('.todo-task label', { hidden: true })

    tasks = await page.$$('.todo-task')
    assert.strictEqual(tasks.length, 0)
  })

  describe('with existing tasks', function() {
    beforeEach(fixtures.create)

    it('can search for tasks', async () => {
      const page = await global.browser.newPage()
      await page.goto(BASE_URL)
      await page.waitForSelector('.todo-new-task')

      let tasks = await page.$$('.todo-task')
      assert.strictEqual(tasks.length, 3)

      // Search for 'foo' should match two tasks.
      await page.type('.todo-search input[type=text]', 'foo')
      await page.click('.todo-search button')
      await page.waitForFunction(
        'document.querySelectorAll(".todo-task").length < 3'
      )

      tasks = await page.$$('.todo-task')
      assert.strictEqual(tasks.length, 2)

      // Clear the search terms.
      await page.evaluate(
        'document.querySelector(".todo-search input[type=text]").value = ""'
      )
      await page.click('.todo-search button')

      await page.waitForFunction(
        'document.querySelectorAll(".todo-task").length === 3'
      )
    })
  })
})
