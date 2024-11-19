import React, { type ChangeEvent, type FormEvent, useCallback } from 'react';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  botField: string;
}

interface Errors {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

interface ContactFormViewProps {
  formData: FormData;
  errors: Errors; 
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  CONTACT_INFO: { url: string; isNetlify: boolean };
}

const ContactFormView: React.FC<ContactFormViewProps> = ({
  formData,
  errors,
  handleChange,
  handleSubmit,
  CONTACT_INFO
}) => {
  const onFormSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(e);
  }, [handleSubmit]);

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleChange(e);
  }, [handleChange]);

  return (
    <form
      action={CONTACT_INFO.url}
      method="post"
      data-netlify={CONTACT_INFO.isNetlify}
      id="contact-us"
      name="contact-us"
      data-netlify-honeypot="bot-field"
      onSubmit={onFormSubmit}
    >
      {CONTACT_INFO.isNetlify && (
        <p className="hidden">
          <label>
            Don’t fill this out if you’re human: <input name="bot-field" onChange={onInputChange} />
          </label>
        </p>
      )}

      <div>
        <label htmlFor="name">Name</label>
        <input type="text" id="name" name="name" required onChange={onInputChange} />
        {errors.name && <p className="error-msg">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" required onChange={onInputChange} />
        {errors.email && <p className="error-msg">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone">Phone</label>
        <input type="tel" id="phone" name="phone" onChange={onInputChange} />
        {errors.phone && <p className="error-msg">{errors.phone}</p>}
      </div>
      <div>
        <label htmlFor="subject">Subject</label>
        <input type="text" id="subject" name="subject" required onChange={onInputChange} />
        {errors.subject && <p className="error-msg">{errors.subject}</p>}
      </div>
      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={7} required onChange={onInputChange}></textarea>
        {errors.message && <div className="error-msg">{errors.message}</div>}
      </div>
      <button type="submit" data-btn="pill"><b>Send Message</b></button>
    </form>
  );
};

export default ContactFormView;