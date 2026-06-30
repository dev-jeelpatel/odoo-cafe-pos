// ── Regex patterns ────────────────────────────────────────────────────────────
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{10}$/;

export const isValidEmail = (email: string) => EMAIL_REGEX.test(email.trim());
export const isValidPhone = (phone: string) => PHONE_REGEX.test(phone.trim());
export const digitsOnly = (value: string, maxLength = 10) => value.replace(/\D/g, '').slice(0, maxLength);

// ── Client-side XSS sanitizer ─────────────────────────────────────────────────
// Strips script tags and HTML from user input before sending to the backend.
// The backend also sanitizes, but defense-in-depth is good practice.

const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<[^>]+on\w+\s*=\s*["'][^"']*["'][^>]*>/gi, // inline event handlers: onclick=, onerror=
  /javascript\s*:/gi,                           // javascript: URLs
  /data\s*:\s*text\/html/gi,                   // data:text/html URIs
  /vbscript\s*:/gi,
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
];

export function sanitizeInput(value: string): string {
  let clean = value;
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  return clean.trim();
}

// Sanitize an entire form data object before submit
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const cleaned = {} as T;
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string') {
      (cleaned as any)[key] = sanitizeInput(val);
    } else {
      (cleaned as any)[key] = val;
    }
  }
  return cleaned;
}

// ── Password strength ─────────────────────────────────────────────────────────
export function passwordStrength(pwd: string): 'weak' | 'fair' | 'strong' {
  if (pwd.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNum = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
  if (score >= 3 && pwd.length >= 10) return 'strong';
  if (score >= 2) return 'fair';
  return 'weak';
}
