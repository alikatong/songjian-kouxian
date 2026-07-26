const env = require('../config/env')

function assetUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//.test(value)) return value
  // Only the generated WebP portraits are bundled in the mini program.
  // Legacy PNG fallbacks still live on the web asset server.
  if (value.startsWith('/assets/portraits/') && value.endsWith('.webp')) return value
  return `${env.ASSET_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`
}

module.exports = { assetUrl }
