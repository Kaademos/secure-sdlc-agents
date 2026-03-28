# Next.js Security Profile

**Framework:** Next.js (App Router + Pages Router)
**Language:** TypeScript / JavaScript
**ASVS Baseline:** L2

---

## Critical Security Areas for Next.js

### Server Actions

Server Actions are POST endpoints. They share the same attack surface as API routes:

```typescript
// ✗ Missing auth check — any user can invoke this action
'use server'
export async function deletePost(postId: string) {
  await db.posts.delete({ where: { id: postId } });
}

// ✓ Correct — validate session and ownership
'use server'
export async function deletePost(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorized');
  
  const post = await db.posts.findUnique({ where: { id: postId } });
  if (post?.authorId !== session.user.id) throw new Error('Forbidden');
  
  await db.posts.delete({ where: { id: postId } });
}
```

**CSRF on Server Actions:** Next.js 14+ includes CSRF protection for Server Actions by default
via `Origin` header validation. Do not disable this. If using custom fetch with `cache: 'force-cache'`,
be aware that CSRF protection may not apply.

### API Routes — App Router

```typescript
// ✗ No authentication
export async function GET(request: Request) {
  const data = await db.users.findMany();
  return Response.json(data);
}

// ✓ Authenticate every API route handler
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });
  
  // IDOR check: only return the requesting user's data
  const data = await db.users.findUnique({ where: { id: session.user.id } });
  return Response.json(data);
}
```

There is **no middleware-level auth applied to all API routes by default** in Next.js.
Every route handler must explicitly authenticate.

### Middleware — Correct and Incorrect Use

```typescript
// next/middleware.ts

// ✓ Use middleware for: redirect to login, edge auth checks, rate limiting
export function middleware(request: NextRequest) {
  const token = request.cookies.get('next-auth.session-token');
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// ✗ Do NOT rely on middleware as your ONLY auth check — it runs at the edge
// and can be bypassed. Always validate auth in your route handlers too.
```

### Server Components vs Client Components — Secret Leakage

```typescript
// ✗ CRITICAL: Secrets passed to Client Components are sent to the browser
async function Page() {
  const apiKey = process.env.EXTERNAL_API_KEY; // This is fine as a server-side value
  return <ClientComponent apiKey={apiKey} />; // ✗ Now it's in the browser
}

// ✓ Fetch server-side, pass only the result
async function Page() {
  const data = await fetchWithApiKey(process.env.EXTERNAL_API_KEY);
  return <ClientComponent data={data} />; // ✓ Only the result goes to client
}
```

**Rule:** `NEXT_PUBLIC_` prefix exposes variables to the browser. Never put secrets there.

### next.config.js — Security Headers

Add security headers. Without these, browsers have no CSP, HSTS, or clickjacking protection:

```javascript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'nonce-{NONCE}'",   // Use nonces for inline scripts
      "style-src 'self' 'unsafe-inline'",     // Tighten if possible
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://your-api.com",
    ].join('; ')
  }
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};
```

### Input Validation with Zod

**Validate Server Action and API route inputs with Zod** — client-side validation is UX, not security:

```typescript
import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  slug: z.string().regex(/^[a-z0-9-]+$/),  // Allowlist pattern
});

'use server'
export async function createPost(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  
  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    slug: formData.get('slug'),
  });
  
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }
  
  await db.posts.create({ data: { ...parsed.data, authorId: session.user.id } });
}
```

---

## ASVS Controls for Next.js Projects

| ASVS Ref | Control | Next.js Implementation |
|----------|---------|----------------------|
| V4.1.1 | Authentication on all endpoints | `getServerSession()` in every route handler and Server Action |
| V4.2.1 | Object-level authorisation | Check `resource.userId === session.user.id` before returning/modifying |
| V5.1.3 | Input validation | Zod schemas on all Server Action inputs |
| V7.1.1 | Log security events | Log auth events in NextAuth callbacks |
| V9.1.1 | TLS everywhere | Enforced by Vercel/host; add HSTS header |
| V14.4.1 | Security headers | `securityHeaders` in next.config.js |

---

## Common Next.js Vulnerabilities (2026)

1. **Missing auth on Server Actions** — the most common finding in Next.js apps
2. **IDOR via ID in URL params** — `/api/users/[id]` without ownership check
3. **Secrets leaked to Client Components** — passed as props or in `getServerSideProps` return
4. **No rate limiting on Server Actions** — can be abused for enumeration or spam
5. **Unsafe redirect in Next.js redirects** — `redirect(userSuppliedUrl)` allows open redirect
6. **Environment variables in client bundle** — `NEXT_PUBLIC_` prefix used for secrets

---

## Recommended Security Stack (2026)

| Category | Recommended |
|----------|-------------|
| Authentication | NextAuth.js v5 / Auth.js, Clerk, Lucia |
| Input validation | Zod, Valibot |
| Rate limiting | Upstash Ratelimit, @arcjet/next |
| Security headers | next-safe (generates CSP automatically) |
| CSRF | Built-in for Server Actions; csrf-csrf for API routes |
| Secrets | Vercel Environment Variables, Doppler, Infisical |
| ORM (injection-safe) | Prisma, Drizzle ORM |
| Image upload validation | sharp + file-type |
