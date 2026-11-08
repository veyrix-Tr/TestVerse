import { useEffect, useState } from 'react'

/* Email, mobile-number and OTP helpers shared by /login and /signup. The server
   enforces the same resend cooldown (OTP_RESEND_SECONDS in backend/controllers/authController.js). */

export const OTP_RESEND_SECONDS = 30

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())

/* Indian mobile numbers: 10 digits starting 6-9. Accepts pasted +91 / 0 prefixes. */
export function cleanPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2)
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

export const isPhone = (d) => /^[6-9]\d{9}$/.test(d)

export const prettyPhone = (d) => (d.length > 5 ? d.slice(0, 5) + ' ' + d.slice(5) : d)

/* Seconds left before "Resend code" is allowed again. */
export function useResendTimer() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return undefined
    const id = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [left])
  return [left, () => setLeft(OTP_RESEND_SECONDS)]
}
