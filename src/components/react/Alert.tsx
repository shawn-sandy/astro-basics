import React from 'react'

interface AlertProps {
  type: 'error' | 'success' | 'info'
  children: React.ReactNode
}

/**
 * `data-visible="true"` is required, not decorative.
 *
 * `@fpkit/acss` v6 ships `[role="alert"]:not([data-visible="true"]) { opacity: 0 }`
 * so its own dismissible `<Alert>` can fade in. That selector outranks this
 * project's `.alert` rules on specificity, so any `role="alert"` element without
 * the attribute renders fully transparent. These alerts are mounted only when they
 * should already be on screen, so they declare themselves visible up front.
 */
const Alert: React.FC<AlertProps> = ({ type, children }) => {
  return (
    <div className={`alert alert-${type} `} role="alert" data-visible="true">
      {children}
    </div>
  )
}

export default Alert
