import { NextFunction, Request, Response } from 'express';

const suspiciousPatterns: RegExp[] = [
  /\bunion\b\s+\bselect\b/i,
  /\bdrop\b\s+\btable\b/i,
  /<\s*script\b/i,
  /javascript\s*:/i,
  /\.{2}\/|\.\.\\/i,
  /\b(or|and)\b\s+\d+\s*=\s*\d+/i,
];

function flattenPayload(value: unknown, depth = 0): string {
  if (depth > 4) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenPayload(item, depth + 1)).join(' ');
  }

  if (value && typeof value === 'object') {
    return Object.values(value).map((item) => flattenPayload(item, depth + 1)).join(' ');
  }

  return '';
}

export function basicWafMiddleware(request: Request, response: Response, next: NextFunction): void {
  const source = [
    request.originalUrl,
    flattenPayload(request.params),
    flattenPayload(request.query),
    flattenPayload(request.body),
  ]
    .join(' ')
    .slice(0, 8000);

  const matches = suspiciousPatterns.some((pattern) => pattern.test(source));
  if (matches) {
    response.status(403).json({
      message: 'Solicitud bloqueada por la politica de seguridad WAF.',
    });
    return;
  }

  next();
}
