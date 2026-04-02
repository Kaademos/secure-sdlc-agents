# Django Security Profile

**Framework:** Django (4.x / 5.x)
**Language:** Python 3.10+
**ASVS Baseline:** L2

---

## Django's Built-In Security — Don't Disable It

Django ships with more security defaults than most frameworks. The most common vulnerability
pattern in Django apps is **disabling or misconfiguring built-in protections**, not missing them.

### Never disable these:

```python
# settings.py — NEVER set these to False in production

# CSRF protection
MIDDLEWARE = [
    ...
    'django.middleware.csrf.CsrfViewMiddleware',  # Never remove
    ...
]

# Clickjacking protection
X_FRAME_OPTIONS = 'DENY'  # Default; never change to 'ALLOWALL'

# Secure cookies
SESSION_COOKIE_SECURE = True   # HTTPS only
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True  # Prevents JS access to session cookie
```

### Production Settings Checklist

```python
# settings.py — required for production

DEBUG = False                          # Non-negotiable
ALLOWED_HOSTS = ['yourdomain.com']     # Explicit, never ['*']
SECRET_KEY = env('SECRET_KEY')         # From environment, never in code

# HTTPS enforcement
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 63072000         # 2 years
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # If behind load balancer

# Session
SESSION_COOKIE_AGE = 3600              # 1 hour default; set appropriately
SESSION_EXPIRE_AT_BROWSER_CLOSE = True  # Optional but good for sensitive apps

# Content security
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True  # Deprecated in modern browsers but harmless
```

---

## Authentication

Django's built-in auth is solid. Common mistakes:

### Password Storage (Already Handled by Django)

Django uses PBKDF2 by default. For higher assurance, switch to Argon2:

```python
# settings.py
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',  # Best
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',  # Good
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',  # Default — acceptable
]

# Minimum password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
```

---

## Access Control — Django Views and DRF

### Function-Based Views

```python
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied

@login_required  # Redirects unauthenticated users to LOGIN_URL
def my_view(request):
    # IDOR check: verify the requested object belongs to request.user
    post = get_object_or_404(Post, pk=pk)
    if post.author != request.user:
        raise PermissionDenied  # Returns 403
    ...
```

### Django REST Framework

```python
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

class PostDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        # ✓ Object-level permission check
        post = get_object_or_404(Post, pk=pk)
        if post.author != request.user:
            return Response(status=403)
        serializer = PostSerializer(post)
        return Response(serializer.data)

# Or using DRF object-level permissions:
class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.author == request.user
```

**Never use `DEFAULT_AUTHENTICATION_CLASSES = []`** or **`DEFAULT_PERMISSION_CLASSES = []`** in
production DRF settings — these remove authentication and permission checks globally.

---

## ORM — Avoiding the Rare Django SQL Injection

Django's ORM is safe by default. Injection is only possible when using `.raw()` or `extra()`:

```python
# ✓ Safe — ORM parameterises automatically
Post.objects.filter(title=user_input)

# ✗ Unsafe — direct string formatting in raw query
Post.objects.raw(f"SELECT * FROM posts WHERE title = '{user_input}'")

# ✓ Safe raw query — use %s parameterisation
Post.objects.raw("SELECT * FROM posts WHERE title = %s", [user_input])

# ✗ Unsafe extra()
Post.objects.extra(where=[f"title = '{user_input}'"])

# ✓ Safe extra()
Post.objects.extra(where=["title = %s"], params=[user_input])
```

---

## CSRF for APIs

If you're building a REST API consumed by non-browser clients, configure CSRF correctly:

```python
# For DRF APIs using session auth from a browser:
# Keep CSRF enabled — use CsrfExemptSessionAuthentication or the Django CSRF view decorator

# For DRF APIs using token auth (not cookies):
# CSRF protection is not needed — tokens in Authorization header are CSRF-safe by design

# For hybrid (some browser, some API clients):
# Exempt specific views using @csrf_exempt and compensate with other controls (CORS, Origin check)
```

---

## Secrets Management

```python
# ✗ Never
SECRET_KEY = 'hardcoded-secret-key'
DATABASE_URL = 'postgresql://user:password@localhost/db'

# ✓ Use django-environ or python-decouple
import environ
env = environ.Env()
environ.Env.read_env()  # Reads .env for local dev (never commit .env)

SECRET_KEY = env('SECRET_KEY')
DATABASE_URL = env('DATABASE_URL')
```

---

## ASVS Controls for Django Projects

| ASVS Ref | Control | Django Implementation |
|----------|---------|----------------------|
| V2.1.1 | Password complexity | `AUTH_PASSWORD_VALIDATORS` |
| V3.3.1 | Session invalidation on logout | `django.contrib.auth.logout()` clears session |
| V4.1.1 | Auth on endpoints | `@login_required` / `permission_classes` |
| V4.2.1 | Object-level auth | Explicit ownership checks before returning objects |
| V5.3.4 | No SQL injection | Use ORM; avoid `.raw()` with user input |
| V14.4.1 | Security headers | Django SecurityMiddleware |
| V14.4.5 | CSRF | CsrfViewMiddleware (enabled by default) |

---

## Recommended Tools

| Category | Tool |
|----------|------|
| SAST | Bandit, Semgrep (Django rules) |
| DAST | OWASP ZAP |
| Dependency scan | pip-audit, Safety |
| Secrets | python-decouple, django-environ |
| 2FA | django-two-factor-auth, django-otp |
| Rate limiting | django-ratelimit, django-axes (login lockout) |
