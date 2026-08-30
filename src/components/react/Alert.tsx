import React from 'react'

interface AlertProps {
  type: 'error' | 'success' | 'info'
  children: React.ReactNode
}

/**
 * Inline status message, announced by assistive technology as soon as it appears.
 *
 * Render it only when the message should already be on screen — it has no
 * dismiss or fade-in behaviour of its own.
 *
 * @component Alert
 * @param {AlertProps} props - Component properties
 * @returns {JSX.Element} A `role="alert"` region styled for the given type
 *
 * @example
 * ```tsx
 * <Alert type="error">We could not reach the server.</Alert>
 *
 * <Alert type="error">
 *   <h6>Please correct the following errors</h6>
 *   <ul data-list="unstyled">
 *     <li><a href="#email">Please enter a valid email address</a></li>
 *   </ul>
 * </Alert>
 * ```
 *
 * @accessibility Uses `role="alert"`, so the content is announced on insertion.
 */
const Alert: React.FC<AlertProps> = ({ type, children }) => {
  return (
    // data-visible is required, not decorative: @fpkit/acss v6 ships
    // `[role="alert"]:not([data-visible="true"]) { opacity: 0 }` for its own
    // dismissible Alert, and that selector outranks this project's `.alert` rules.
    // Without it the alert renders fully transparent. See tests/components/alert-visibility.
    <div className={`alert alert-${type} `} role="alert" data-visible="true">
      {children}
    </div>
  )
}

export default Alert
