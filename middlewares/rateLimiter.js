// Chan Cheuk Hong John, A0253435H
// Middleware to limit login attempts by email
// Generated with help from Claude

// Store login attempts in memory
const loginAttempts = new Map();

// Clean up old entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > 15 * 60 * 1000) {
      loginAttempts.delete(key);
    }
  }
}, 15 * 60 * 1000);

export const loginRateLimiter = (req, res, next) => {
  // Use IP address as identifier
  const identifier = req.ip || req.connection.remoteAddress;
  
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 20;

  // Get or create attempt record
  let attempts = loginAttempts.get(identifier);

  if (!attempts) {
    // First attempt from this IP
    attempts = {
      count: 1,
      firstAttempt: now,
    };
    loginAttempts.set(identifier, attempts);
    return next();
  }

  // Check if window has expired
  if (now - attempts.firstAttempt > windowMs) {
    // Reset the window
    attempts.count = 1;
    attempts.firstAttempt = now;
    loginAttempts.set(identifier, attempts);
    return next();
  }

  // Increment attempt count
  attempts.count += 1;

  // Check if limit exceeded
  if (attempts.count > maxAttempts) {
    const timeLeft = windowMs - (now - attempts.firstAttempt);
    const minutesLeft = Math.ceil(timeLeft / 60000);

    return res.status(429).send({
      success: false,
      message: `Too many login attempts. Please try again in ${minutesLeft} minutes.`,
      retryAfter: timeLeft,
    });
  }

  // Update attempts
  loginAttempts.set(identifier, attempts);
  next();
};