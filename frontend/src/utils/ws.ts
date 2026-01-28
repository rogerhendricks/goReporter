export function buildWsUrl(path: string) {
  if (typeof window === 'undefined') {
    return path
  }

  const defaultProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const apiBase = import.meta.env.VITE_API_BASE as string | undefined

  if (apiBase && apiBase.startsWith('http')) {
    try {
      const url = new URL(apiBase)
      const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws'
      return `${wsProtocol}://${url.host}${path}`
    } catch (error) {
      console.warn('[ws] Failed to parse VITE_API_BASE, falling back to window location:', error)
    }
  }

  return `${defaultProtocol}://${window.location.host}${path}`
}
