require('jsdom-global')('', {
  // We rely on window.location.origin, which is null with the default
  // about:blank url.
  url: 'http://example.com'
})

global.fetch = require('whatwg-fetch').fetch
