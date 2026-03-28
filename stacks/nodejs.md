# Node.js (generic) Security Profile

**Runtime:** Node.js 18+ (LTS recommended)
**ASVS Baseline:** L2

Use this profile when `package.json` exists but no specific framework (Next.js, Express, etc.)
was detected. Prefer a stack-specific profile from `stacks/` when you know your framework.

---

## Core practices

- Validate all inputs server-side; use **Zod**, **Joi**, or **express-validator** as appropriate.
- Use **parameterised queries** or an ORM (**Prisma**, **Drizzle**, **TypeORM**); never concatenate user input into SQL.
- Store secrets in environment variables loaded at runtime, or a secrets manager — never commit `.env` with real values.
- Use **bcrypt** (cost ≥ 12) or **Argon2id** for password hashing.
- Prefer **helmet** (Express) or framework-specific security middleware for headers.
- Run **npm audit** / **Snyk** / **Dependabot** on every PR.

---

## When to switch to a stack profile

| If you use | Read |
|---|---|
| Next.js | `stacks/nextjs.md` |
| Express | `stacks/express.md` |
| NestJS | Nest docs + OWASP ASVS; align with Express patterns for middleware |
