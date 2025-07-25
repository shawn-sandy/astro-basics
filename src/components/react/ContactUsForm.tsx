import React, { useState, type ChangeEvent } from 'react'
import type { FormEvent } from 'react'

import { CONTACT_INFO } from '#utils/site-config.js'

import ContactFormView from './view/ContactFormView'

interface FormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  botField: string
}

interface Errors {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
}

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    botField: '',
  })

  const [errors, setErrors] = useState<Errors>({})

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (validateForm()) {
      const form = e.target as HTMLFormElement
      form.submit()
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Errors = {}
    let isValid = true

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your full name'
      isValid = false
    }
    if (!formData.email.trim() || !isValidEmail(formData.email)) {
      newErrors.email = 'We need your email to get back to you'
      isValid = false
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Your phone number does not appear to be valid'
      isValid = false
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'We need a subject to help us respond'
      isValid = false
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Please enter your message here'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isValidPhone = (phone: string): boolean => /^[\d\s-()]{7,}$/.test(phone)

  return (
    <ContactFormView
      formData={formData}
      errors={errors}
      handleChange={handleChange}
      handleSubmit={handleSubmit}
      CONTACT_INFO={CONTACT_INFO}
    />
  )
}

export default ContactForm
