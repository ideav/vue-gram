export function parseIntegramDateValue(value) {
  if (!value) return value
  if (value instanceof Date) return value
  if (typeof value !== 'string') return value
  if (value.startsWith('[')) return value

  const trimmed = value.trim()

  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})(?:[T\s]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (isoMatch) {
    const [, year, month, day, hours = '00', minutes = '00', seconds = '00'] = isoMatch
    return buildValidDate(year, month, day, hours, minutes, seconds, value)
  }

  const ruMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (ruMatch) {
    const [, day, month, year, hours = '00', minutes = '00', seconds = '00'] = ruMatch
    return buildValidDate(year, month, day, hours, minutes, seconds, value)
  }

  return value
}

function buildValidDate(year, month, day, hours, minutes, seconds, fallback) {
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  )

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hours) ||
    date.getMinutes() !== Number(minutes) ||
    date.getSeconds() !== Number(seconds)
  ) {
    return fallback
  }

  return date
}
