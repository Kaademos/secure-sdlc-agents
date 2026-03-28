# FastAPI Security Profile

**Framework:** FastAPI
**Language:** Python 3.10+
**ASVS Baseline:** L2

---

## Critical Security Areas for FastAPI

### Authentication — Dependency Injection

FastAPI has **no global auth middleware by default**. Every endpoint must declare an auth dependency:

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await get_user(user_id)
    if user is None:
        raise credentials_exception
    return user

# ✓ Every protected endpoint must declare the dependency
@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ✗ Missing Depends — this is public even if you think it isn't
@app.get("/admin/users")
async def list_all_users():
    return await db.users.find_many()
```

### Object-Level Authorisation (IDOR Prevention)

```python
# ✗ IDOR vulnerability — any authenticated user can get any post
@app.get("/posts/{post_id}")
async def get_post(post_id: int, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_unique(where={"id": post_id})
    if not post:
        raise HTTPException(status_code=404)
    return post  # ✗ Returns any user's post

# ✓ Check ownership
@app.get("/posts/{post_id}")
async def get_post(post_id: int, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_unique(where={"id": post_id})
    if not post:
        raise HTTPException(status_code=404)
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403)
    return post
```

### Input Validation with Pydantic

FastAPI's Pydantic integration is excellent — use it fully:

```python
from pydantic import BaseModel, Field, field_validator
import re

class CreateUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Use email-validator library for proper validation
        from email_validator import validate_email, EmailNotValidError
        try:
            info = validate_email(v, check_deliverability=False)
            return info.normalized
        except EmailNotValidError:
            raise ValueError('Invalid email address')
    
    @field_validator('password')
    @classmethod  
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain a number')
        return v

# Using response_model prevents accidental data leakage
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    # password_hash is NOT in the response model — it won't be returned

@app.post("/users", response_model=UserResponse)
async def create_user(request: CreateUserRequest):
    ...
```

**Never use `response_model=None`** on endpoints that handle sensitive data. Pydantic response models
are your last-line-of-defence against accidentally returning internal fields.

### CORS — Never Use Wildcard for Authenticated APIs

```python
from fastapi.middleware.cors import CORSMiddleware

# ✗ Wildcard — any origin can make authenticated requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # ✗ CRITICAL: credentials + wildcard is forbidden by spec but some browsers allow it
)

# ✓ Explicit origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.yourdomain.com",
        "https://admin.yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### Error Handling — No Internal State Leakage

```python
from fastapi import Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

# ✓ Global exception handler — generic response to client, detailed log server-side
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        extra={
            "path": request.url.path,
            "method": request.method,
            "user_id": getattr(request.state, "user_id", "anonymous"),
        }
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred"}  # No stack trace
    )

# ✗ Default exception behaviour in debug mode exposes internals
# NEVER set debug=True in production
app = FastAPI(debug=False)
```

### Rate Limiting

FastAPI has no built-in rate limiting. Add it:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/auth/login")
@limiter.limit("5/minute")  # 5 attempts per minute per IP
async def login(request: Request, credentials: LoginRequest):
    ...
```

---

## Secrets Management

```python
# ✗ Never do this
SECRET_KEY = "my-super-secret-key-that-is-in-git"

# ✓ Use pydantic-settings for typed, validated config
from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    secret_key: SecretStr          # SecretStr prevents accidental logging
    database_url: SecretStr
    allowed_origins: list[str] = []
    
    class Config:
        env_file = ".env"           # For local dev only — never commit .env

settings = Settings()
# Access: settings.secret_key.get_secret_value()
```

---

## ASVS Controls for FastAPI Projects

| ASVS Ref | Control | FastAPI Implementation |
|----------|---------|----------------------|
| V4.1.1 | Auth on all endpoints | `Depends(get_current_user)` on every protected endpoint |
| V4.2.1 | Object-level authorisation | `resource.owner_id == current_user.id` check |
| V5.1.3 | Input validation | Pydantic models with `Field` constraints |
| V8.3.4 | Don't confirm resource existence | Return 404 (not 403) for resources the user can't see |
| V13.2.5 | Rate limiting | slowapi or similar |
| V14.4.1 | Security headers | Add `SecurityHeadersMiddleware` |

---

## Recommended Security Stack (2026)

| Category | Recommended |
|----------|-------------|
| Auth | python-jose + passlib, or Authlib |
| Input validation | Pydantic v2 (built-in) |
| Rate limiting | slowapi, fastapi-limiter (Redis-backed) |
| Security headers | secure (adds headers middleware) |
| Password hashing | passlib[bcrypt] or argon2-cffi |
| Secrets | pydantic-settings + AWS SM / Vault |
| ORM (injection-safe) | SQLAlchemy 2.0, Tortoise ORM |
| Secret scanning CI | gitleaks, detect-secrets |
