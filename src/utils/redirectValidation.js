/**
 * Redirect URL Validation Utility
 * Prevents open redirect and XSS vulnerabilities
 */

export function isValidRedirectUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('/')) return false
  if (url.startsWith('//')) return false
  if (url.includes(':')) return false
  return true
}

export function getSafeRedirectUrl(redirectParam, defaultUrl = '/my') {
  if (isValidRedirectUrl(redirectParam)) {
    return redirectParam
  }
  return defaultUrl
}
