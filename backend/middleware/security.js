// Security Middleware for PNP-ITMS PAIS 2.0

/**
 * Standard HTTP Security Headers
 * Enforces clickjacking protection, MIME sniffing protection, and referrer policy.
 */
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Enforce HSTS over secure connections
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
};

/**
 * In-memory sliding-window Rate Limiter
 * Protects sensitive endpoints (e.g., authentication) against brute-force attacks.
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 15,
  message = 'Too many requests, please try again later.'
} = {}) => {
  const hits = new Map();

  // Periodic cleanup of expired records every 5 minutes
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of hits.entries()) {
      if (data.resetTime <= now) {
        hits.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();

  return (req, res, next) => {
    // Determine client IP (taking potential proxy headers into account)
    const rawForwarded = req.headers['x-forwarded-for'];
    const ip = (typeof rawForwarded === 'string' ? rawForwarded.split(',')[0].trim() : null) ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const now = Date.now();
    const record = hits.get(ip);

    if (!record || record.resetTime <= now) {
      hits.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds
      });
    }

    next();
  };
};
