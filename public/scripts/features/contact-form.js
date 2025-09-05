/**
 * Contact Form Handler
 * Manages form submission for the message-us page
 */
import { postForm } from '../modules/api.js'
import { showMessage, clearMessage, toggleButtonLoading, safeQuerySelector } from '../modules/ui.js'

/**
 * Initializes the contact form functionality
 */
export function initContactForm() {
  const form = safeQuerySelector('#contact-form')
  if (!form) return

  const formMessage = safeQuerySelector('#form-message', form)
  const submitButton = safeQuerySelector('button[type="submit"]', form)

  if (!formMessage || !submitButton) {
    console.warn('Contact form missing required elements')
    return
  }

  form.addEventListener('submit', handleFormSubmit)

  async function handleFormSubmit(event) {
    event.preventDefault()

    // Clear previous messages
    clearMessage(formMessage)

    // Show loading state
    toggleButtonLoading(submitButton, true, 'Sending...', 'Send Message')

    // Get form data
    const formData = new FormData(form)

    try {
      const { data, error, success, rateLimited, retryAfter } = await postForm(
        '/api/message-us',
        formData
      )

      if (success && data) {
        showMessage(
          formMessage,
          data.message || 'Your message has been sent successfully!',
          'success'
        )
        form.reset()
      } else if (rateLimited) {
        // Handle rate limiting with countdown
        const retryMessage = retryAfter
          ? `Too many submissions. Please wait ${retryAfter} seconds before trying again.`
          : error || 'Too many submissions. Please wait before trying again.'

        showMessage(formMessage, retryMessage, 'error')

        // Disable the form temporarily if we have retry time
        if (retryAfter && retryAfter > 0) {
          disableFormTemporarily(retryAfter)
        }
      } else {
        showMessage(formMessage, error || 'Something went wrong. Please try again.', 'error')
      }
    } catch (err) {
      showMessage(
        formMessage,
        'Network error. Please check your connection and try again.',
        'error'
      )
      console.error('Form submission error:', err)
    } finally {
      toggleButtonLoading(submitButton, false, 'Sending...', 'Send Message')
    }
  }

  /**
   * Temporarily disable the form with countdown
   * @param {number} seconds - Number of seconds to disable
   */
  function disableFormTemporarily(seconds) {
    let remainingTime = seconds

    // Disable the submit button
    submitButton.disabled = true

    // Update button text with countdown
    const originalText = submitButton.textContent || 'Send Message'

    const updateCountdown = () => {
      if (remainingTime > 0) {
        submitButton.textContent = `Wait ${remainingTime}s`
        remainingTime--
        setTimeout(updateCountdown, 1000)
      } else {
        // Re-enable the form
        submitButton.disabled = false
        submitButton.textContent = originalText
      }
    }

    updateCountdown()
  }
}
