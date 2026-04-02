# Express.js Security Profile

**Framework:** Express.js 4.x / 5.x
**Language:** JavaScript / TypeScript (Node.js)
**ASVS Baseline:** L2

---

## Express has No Security Defaults — You Must Add Everything

Express is minimal by design. Unlike Django or Rails, it ships with no security headers, no CSRF
protection, no input validation, and no rate limiting. Every security control must be explicitly added.

---

## Minimum Required Security Middleware

Add these to every new Express application:

```javascript
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import { doubleCsrf } from 'csrf-csrf';

const app = express();

// 1. Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
}));

// 2. Rate limiting — global baseline
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
app.use(globalLimiter);

// 3. Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // Only 10 login attempts per 15 minutes per IP
  skipSuccessfulRequests: true,
});
app.use('/auth', authLimiter);

// 4. CORS — explicit origins only
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// 5. CSRF protection (for session-based auth)
const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: { secure: true, sameSite: 'strict' },
});
app.use(doubleCsrfProtection);

// 6. Body parsing with size limits
app.use(express.json({ limit: '10kb' }));       // Prevent JSON body DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

---

## Authentication

Express has no built-in auth. Options:

```javascript
// Using passport.js with bcrypt
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) {
      // ✓ Same error for wrong username OR wrong password (user enumeration prevention)
      return done(null, false, { message: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return done(null, false, { message: 'Invalid credentials' });
    }
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Password hashing — minimum cost factor 12
const BCRYPT_ROUNDS = 12;
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

---

## Input Validation with Zod

`req.body`, `req.params`, and `req.query` are **completely untyped** in Express. Validate everything:

```typescript
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

const CreateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
});

// Reusable validation middleware factory
const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors  // Safe to return — no internal info
    });
  }
  req.body = result.data;  // Replace with validated/parsed data
  next();
};

router.post('/users', validate(CreateUserSchema), async (req, res) => {
  // req.body is now validated and typed
  const { username, email, password } = req.body;
  ...
});
```

---

## Error Handling — No Stack Trace Leakage

```javascript
// ✗ Express default error handler sends the full error in development
// ✗ Custom handler that leaks details
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack }); // Never in production
});

// ✓ Generic user response, detailed server-side logging
import { logger } from './logger';

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id ?? 'anonymous',
    requestId: req.id,
  });
  
  res.status(500).json({ error: 'An internal error occurred' });
});
```

---

## Database Queries — Never String Concatenate

```javascript
// Using pg (node-postgres)

// ✗ SQL injection
const user = await pool.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✓ Parameterised query
const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Using an ORM (Prisma, Drizzle) — safe by default
const user = await prisma.user.findUnique({ where: { id: userId } });
```

---

## ASVS Controls for Express Projects

| ASVS Ref | Control | Express Implementation |
|----------|---------|----------------------|
| V4.1.1 | Auth middleware | passport.js + per-route authentication middleware |
| V4.2.1 | Object-level auth | Ownership check in every route handler |
| V5.1.3 | Input validation | Zod validation middleware |
| V13.2.5 | Rate limiting | express-rate-limit per endpoint |
| V14.4.1 | Security headers | helmet() |
| V14.4.5 | CSRF | csrf-csrf or csurf |

---

## Recommended Security Stack (2026)

| Category | Recommended |
|----------|-------------|
| Security headers | helmet |
| Rate limiting | express-rate-limit |
| CSRF | csrf-csrf |
| Auth | passport.js, express-jwt |
| Input validation | zod, express-validator |
| Password hashing | bcrypt (min rounds: 12) |
| Session | express-session + connect-redis |
| ORM | Prisma, Drizzle ORM |
| Logging | pino (structured JSON) |
| Secrets | dotenv-vault, Doppler |
