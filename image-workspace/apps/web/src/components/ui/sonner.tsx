import type * as React from 'react'
import { Toaster as Sonner } from 'sonner'

function Toaster() {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
    />
  )
}

export { Toaster }
