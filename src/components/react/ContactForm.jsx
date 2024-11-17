
import React, { useState } from 'react';
import { CONTACT_INFO } from '#utils/site-config.js';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    botField: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Submit form
      const form = e.target;
      form.submit();
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your full name';
      isValid = false;
    }
    if (!formData.email.trim() || !isValidEmail(formData.email)) {
      newErrors.email = 'We need your email to get back to you';
      isValid = false;
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Your phone number does not appear to be valid';
      isValid = false;
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'We need a subject to help us respond';
      isValid = false;
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Please enter your message here';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone) => /^[\d\s-()]{7,}$/.test(phone);

  return (
    <form
      action={CONTACT_INFO.url}
      method="post"
      data-netlify={CONTACT_INFO.isNetlify}
      id="contact-us"
      name="contact-us"
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
    >
      {CONTACT_INFO.isNetlify && (
        <p className="hidden">
          <label>
            Don’t fill this out if you’re human: <input name="bot-field" onChange={handleChange} />
          </label>
        </p>
      )}

      <div>
        <label htmlFor="name">Name</label>
        <input type="text" id="name" name="name" required onChange={handleChange} />
        {errors.name && <p className="error-msg">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" required onChange={handleChange} />
        {errors.email && <p className="error-msg">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone">Phone</label>
        <input type="tel" id="phone" name="phone" onChange={handleChange} />
        {errors.phone && <p className="error-msg">{errors.phone}</p>}
      </div>
      <div>
        <label htmlFor="subject">Subject</label>
        <input type="text" id="subject" name="subject" required onChange={handleChange} />
        {errors.subject && <p className="error-msg">{errors.subject}</p>}
      </div>
      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows="7" required onChange={handleChange}></textarea>
        {errors.message && <div className="error-msg">{errors.message}</div>}
      </div>
      <button type="submit" data-btn="pill"><b>Send Message</b></button>
    </form>
  );
};

export default ContactForm;