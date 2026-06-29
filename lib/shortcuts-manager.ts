export interface Shortcut {
  id: string
  label: string
  defaultKey: string
  action: () => void
}

let shortcuts: Shortcut[] = []
let customKeys: Record<string, string> = {}

export function initShortcuts(initialShortcuts: Shortcut[]) {
  shortcuts = initialShortcuts
  try {
    const saved = localStorage.getItem('te.shortcuts')
    if (saved) customKeys = JSON.parse(saved)
  } catch {}

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    for (const sc of shortcuts) {
      const key = customKeys[sc.id] || sc.defaultKey
      const parts = key.toLowerCase().split('+')
      const targetKey = parts[parts.length - 1]
      
      const requiresCtrl = parts.includes('ctrl') || parts.includes('cmd')
      const requiresShift = parts.includes('shift')
      const requiresAlt = parts.includes('alt')

      const isCtrlMatch = requiresCtrl === (e.ctrlKey || e.metaKey)
      const isShiftMatch = requiresShift === e.shiftKey
      const isAltMatch = requiresAlt === e.altKey
      const isKeyMatch = e.key.toLowerCase() === targetKey

      if (isCtrlMatch && isShiftMatch && isAltMatch && isKeyMatch) {
        e.preventDefault()
        sc.action()
        return
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}

export function updateShortcut(id: string, newKey: string) {
  customKeys[id] = newKey
  localStorage.setItem('te.shortcuts', JSON.stringify(customKeys))
}

export function getCustomKeys() {
  return customKeys
}
