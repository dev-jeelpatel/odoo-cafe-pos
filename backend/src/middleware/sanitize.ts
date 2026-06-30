import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

// ── XSS-safe string cleaner ───────────────────────────────────────────────────
// Strips all HTML tags and dangerous attributes.
// Prisma already uses parameterized queries so SQL injection via ORM is not
// possible, but we still sanitize to prevent stored-XSS attacks where
// user-supplied text is later rendered in the frontend without escaping.
const xssOptions = {
  whiteList: {}, // allow NO HTML tags at all
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

function cleanString(value: string): string {
  // 1. Strip HTML/script via xss library
  let clean = xss(value, xssOptions);
  // 2. Trim leading/trailing whitespace
  clean = clean.trim();
  return clean;
}

// Recursively sanitize an arbitrary value (object/array/string/number)
function sanitize(value: unknown): unknown {
  if (typeof value === 'string') return cleanString(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Sanitize the key too, in case of prototype pollution attempts
      const safeKey = cleanString(String(k));
      // Block prototype pollution keys
      if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') continue;
      cleaned[safeKey] = sanitize(v);
    }
    return cleaned;
  }
  return value;
}

/**
 * Express middleware: sanitizes req.body, req.query, and req.params
 * against XSS, stored HTML injection, and prototype pollution.
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) {
    // query values can be string | string[] | ParsedQs
    for (const key of Object.keys(req.query)) {
      const val = req.query[key];
      if (typeof val === 'string') {
        req.query[key] = cleanString(val);
      }
    }
  }
  if (req.params) {
    for (const key of Object.keys(req.params)) {
      req.params[key] = cleanString(req.params[key]);
    }
  }
  next();
}

/**
 * Validates that a value is a safe numeric ID (cuid / uuid / numeric string).
 * Returns false if it contains path traversal or injection patterns.
 */
export function isSafeId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  // cuid: starts with 'c', 25 chars; uuid: 36 chars with hyphens; or simple alphanumeric
  return /^[a-zA-Z0-9_\-]{1,50}$/.test(id);
}
