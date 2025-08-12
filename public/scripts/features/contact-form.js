/**
 * Contact Form Handler
 * Manages form submission for the message-us page
 */
import { postForm } from '../modules/api.js';
import { showMessage, clearMessage, toggleButtonLoading, safeQuerySelector } from '../modules/ui.js';

/**
 * Initializes the contact form functionality
 */
export function initContactForm() {
  const form = safeQuerySelector('#contact-form');
  if (!form) return;

  const formMessage = safeQuerySelector('#form-message', form);
  const submitButton = safeQuerySelector('button[type="submit"]', form);

  if (!formMessage || !submitButton) {
    console.warn('Contact form missing required elements');
    return;
  }

  form.addEventListener('submit', handleFormSubmit);

  async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Clear previous messages
    clearMessage(formMessage);
    
    // Show loading state
    toggleButtonLoading(submitButton, true, 'Sending...', 'Send Message');

    // Get form data
    const formData = new FormData(form);

    try {
      const { data, error, success } = await postForm('/api/message-us', formData);

      if (success && data) {
        showMessage(formMessage, data.message || 'Your message has been sent successfully!', 'success');
        form.reset();
      } else {
        showMessage(formMessage, error || 'Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      showMessage(formMessage, 'Network error. Please check your connection and try again.', 'error');
      console.error('Form submission error:', err);
    } finally {
      toggleButtonLoading(submitButton, false, 'Sending...', 'Send Message');
    }
  }
}