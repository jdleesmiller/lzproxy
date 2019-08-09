require('jsdom-global')('', {
  // We rely on window.location.origin, which is null with the default
  // about:blank url.
  url: 'http://example.com',
  // Work around missing window.Date
  // https://github.com/testing-library/dom-testing-library/issues/194
  runScripts: 'outside-only'
})

global.fetch = require('whatwg-fetch').fetch
