export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{10}$/;

export const isValidEmail = (email: string) => EMAIL_REGEX.test(email.trim());
export const isValidPhone = (phone: string) => PHONE_REGEX.test(phone.trim());

export const digitsOnly = (value: string, maxLength = 10) => value.replace(/\D/g, '').slice(0, maxLength);
