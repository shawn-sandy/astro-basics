import React, { useState } from 'react';
import Alert from "./Alert";

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
    setErrors(prevErrors => ({ ...prevErrors, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (validateForm()) {
      // Allow the form to submit naturally
      (e.target as HTMLFormElement).submit();
      setIsSubmitted(true);
    } else {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Please enter your full name';
    if (!formData.email.trim()) newErrors.email = 'We need your email to get back to you';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (formData.phone.trim() && !isValidPhone(formData.phone)) newErrors.phone = 'Your phone number does not appear to be valid';
    if (!formData.subject.trim()) newErrors.subject = 'We need a subject to help us respond';
    if (!formData.message.trim()) newErrors.message = 'Please enter your message here';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    return /^[\d\s-()]{7,}$/.test(phone);
  };

  if (isSubmitted) {
    return <Alert type="success">Thank you for your message. We will get back to you soon!</Alert>;
  }

  return (
    <section>
      {Object.keys(errors).length > 0 && (
        <Alert type="error">
          <h6>Please correct the following errors</h6>
          <ul data-list="unstyled">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`}>{message}</a>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <form
        name="contact-us"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Contact us"
      >
        <input type="hidden" name="form-name" value="contact-us" />
        <div hidden className="hidden">
          <input name="bot-field" />
        </div>

        <div>
          <label htmlFor="name">Your Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && <p id="name-error" className="error-msg">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email">Your current email address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && <p id="email-error" className="error-msg">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone">Your full number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && <p id="phone-error" className="error-msg">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="subject">The subject of your message</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            required
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? "subject-error" : undefined}
          />
          {errors.subject && <p id="subject-error" className="error-msg">{errors.subject}</p>}
        </div>

        <div>
          <label htmlFor="message">Please enter your message here</label>
          <textarea
            id="message"
            name="message"
            rows={7}
            value={formData.message}
            onChange={handleInputChange}
            required
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "message-error" : undefined}
          ></textarea>
          {errors.message && <p id="message-error" className="error-msg">{errors.message}</p>}
        </div>

        <button type="submit" data-btn="pill" disabled={isSubmitting}>
          <b>{isSubmitting ? 'Sending...' : 'Send Message'}</b>
        </button>
      </form>
    </section>
  );
};

export default ContactForm;