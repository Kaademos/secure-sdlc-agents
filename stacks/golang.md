# Go Security Profile

**Language:** Go 1.22+
**Frameworks:** net/http (stdlib), Gin, Echo, Fiber
**ASVS Baseline:** L2

---

## Go's Standard Library Is Safe — Until You Reach Around It

Go's stdlib gives you memory safety, `html/template` context-aware escaping, and
`database/sql` placeholders for free. Almost every Go web vulnerability comes from
*opting out* of these: using `text/template` for HTML, building SQL with `fmt.Sprintf`,
running shell strings through `exec.Command("sh", "-c", ...)`, or enabling a wildcard CORS
policy alongside credentials. This profile focuses on those opt-out traps.

---

## XSS — Use `html/template`, Never `text/template`, for HTML

`html/template` escapes output based on context (HTML body, attribute, JS, URL, CSS).
`text/template` performs **zero** escaping and must never render attacker-influenced HTML.

```go
import (
	"html/template" // ✓ context-aware auto-escaping
	// "text/template" // ✗ NO escaping — XSS if used for HTML
)

// ✓ Safe — html/template escapes .Name in HTML context
var tmpl = template.Must(template.New("p").Parse(`<p>Hello {{ .Name }}</p>`))
tmpl.Execute(w, map[string]string{"Name": userInput}) // <script> becomes &lt;script&gt;
```

```go
// ✗ Unsafe — template.HTML tells the engine "this is already safe", disabling escaping
tmpl.Execute(w, map[string]any{"Bio": template.HTML(user.Bio)}) // stored XSS

// ✓ Safe — sanitise untrusted HTML first, then mark trusted
import "github.com/microcosm-cc/bluemonday"

p := bluemonday.UGCPolicy()
safe := template.HTML(p.Sanitize(user.Bio)) // allow-list of tags/attrs only
```

**Other escaping bypasses to flag in review:** `template.JS`, `template.URL`,
`template.CSS`, `template.HTMLAttr` — each disables escaping for that context. They are
only safe with values your code fully controls, never with user input.

> Framework note: Gin's `c.HTML()`, Echo's `c.Render()`, and Fiber's `html/v2` engine all
> build on `html/template`, so context escaping applies. Setting `Content-Type: text/html`
> by hand and writing a `fmt.Sprintf`'d string with `c.String()`/`w.Write()` bypasses it.

---

## SQL Injection — Placeholders, Never `fmt.Sprintf`

### `database/sql`

```go
// ✗ SQL injection — string formatting builds the query
q := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)
rows, err := db.Query(q)

// ✓ Parameterised — driver sends value separately from SQL
rows, err := db.Query("SELECT * FROM users WHERE email = $1", email)        // pq / pgx
rows, err := db.Query("SELECT * FROM users WHERE email = ?", email)         // MySQL / SQLite
err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&id)
```

Identifiers (table/column names, `ORDER BY`) **cannot** be parameterised — allow-list them:

```go
// ✗ Unsafe — attacker controls the ORDER BY clause
db.Query("SELECT * FROM users ORDER BY " + r.URL.Query().Get("sort"))

// ✓ Safe — validate against a fixed set before interpolating
var allowedSort = map[string]string{"name": "name", "created": "created_at"}
col, ok := allowedSort[r.URL.Query().Get("sort")]
if !ok {
	col = "created_at"
}
db.Query("SELECT * FROM users ORDER BY " + col) // col is now a known-safe literal
```

### GORM

```go
// ✓ Safe — ? placeholders are escaped by GORM
db.Where("email = ?", email).First(&user)
db.Raw("SELECT * FROM users WHERE email = ?", email).Scan(&user)

// ✗ Unsafe — Sprintf into the condition string defeats GORM's escaping
db.Where(fmt.Sprintf("email = '%s'", email)).First(&user)

// ✗ Unsafe — user-controlled column name in a struct/map update can corrupt other fields
db.Model(&user).Updates(userControlledMap) // allow-list keys, or use a typed struct
```

---

## CORS — Never Wildcard Origin *with* Credentials

`Access-Control-Allow-Origin: *` combined with `Allow-Credentials: true` is rejected by
browsers, so the usual "fix" is reflecting the request `Origin` — which silently allows
**every** site. Always use an explicit allow-list.

```go
// stdlib via github.com/rs/cors
import "github.com/rs/cors"

// ✗ Unsafe — allows any origin to make credentialed requests
c := cors.New(cors.Options{
	AllowedOrigins:   []string{"*"},
	AllowCredentials: true,
})

// ✓ Safe — explicit origins, credentials only for those
c := cors.New(cors.Options{
	AllowedOrigins:   []string{"https://app.example.com"},
	AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
	AllowCredentials: true,
	MaxAge:           300,
})
handler := c.Handler(mux)
```

```go
// Gin — github.com/gin-contrib/cors
import "github.com/gin-contrib/cors"

// ✗ Unsafe — AllowAllOrigins + credentials reflects every Origin
r.Use(cors.New(cors.Config{AllowAllOrigins: true, AllowCredentials: true}))

// ✓ Safe — explicit list
r.Use(cors.New(cors.Config{
	AllowOrigins:     []string{"https://app.example.com"},
	AllowCredentials: true,
}))
```

```go
// Echo — middleware.CORSWithConfig (AllowOrigins) and
// Fiber — github.com/gofiber/fiber/v2/middleware/cors (AllowOrigins) follow the same rule:
// list real origins; never set AllowOrigins:"*" together with AllowCredentials:true.
```

---

## Security Headers — Stdlib Has None

`net/http` sends no security headers. Add them via middleware on every response.

```go
func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", "default-src 'self'")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}
// Or use github.com/unrolled/secure for a configurable equivalent.
// Gin: gin-contrib/secure · Echo: middleware.Secure() · Fiber: middleware/helmet
```

---

## Authentication & Passwords

```go
// ✓ Password hashing — bcrypt (cost ≥ 12) or argon2id
import "golang.org/x/crypto/bcrypt"

hash, err := bcrypt.GenerateFromPassword([]byte(pw), 12)
err = bcrypt.CompareHashAndPassword(hash, []byte(pw)) // constant-time

// ✗ Never — fast/unsalted hashes for passwords
sum := sha256.Sum256([]byte(pw)) // brute-forceable
```

```go
// ✓ Constant-time comparison for tokens/HMACs — avoid timing leaks
import "crypto/subtle"

if subtle.ConstantTimeCompare(got, want) == 1 { /* match */ }

// ✗ Unsafe — == short-circuits and leaks length/prefix via timing
if string(got) == string(want) { /* ... */ }
```

JWT: pin the expected algorithm in the keyfunc to defeat `alg: none` / algorithm-confusion:

```go
token, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) {
	if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok { // ✓ reject unexpected alg
		return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
	}
	return secret, nil
})
```

---

## Command Injection & SSRF

```go
import "os/exec"

// ✗ Command injection — user input in a shell string
exec.Command("sh", "-c", "convert "+userFile+" out.png").Run()

// ✓ Safe — pass args as a slice; no shell, no word-splitting
exec.Command("convert", userFile, "out.png").Run()
```

```go
// ✗ SSRF — fetching a user-supplied URL lets attackers hit internal services / metadata
http.Get(r.FormValue("url"))

// ✓ Resolve + validate the host against an allow-list and block private/link-local IPs
// before dialing (deny 169.254.169.254, 10/8, 127/8, ::1, etc.).
```

---

## Secrets & Config

```go
// ✓ Read secrets from the environment / a secrets manager — never hardcode
dsn := os.Getenv("DATABASE_URL")
if dsn == "" {
	log.Fatal("DATABASE_URL is required")
}

// ✗ Never commit credentials
const apiKey = "sk_live_8f2b..." // gitleaks/gosec will flag this
```

Run `gitleaks` in CI and keep `.env` out of git. Use `errors.Is`/`%w` and return generic
client errors — never write `err.Error()` (which can leak DSNs, paths, SQL) into responses.

---

## ASVS Controls for Go Projects

| ASVS Ref | Control | Go Implementation |
|----------|---------|-------------------|
| V2.2.1 | Input validation | `go-playground/validator` on bound structs |
| V1.3.1 | Output encoding (XSS) | `html/template`; sanitise with `bluemonday` |
| V1.2.4 | No SQL injection | `database/sql` placeholders; GORM `?` params |
| V1.2.5 | No OS command injection | `exec.Command` with arg slices, no `sh -c` |
| V11.4.2 | Password storage | `bcrypt` (cost ≥ 12) or `argon2id` |
| V3.5.1 | CSRF | `gorilla/csrf` for cookie-based sessions |
| V4.1.1 | Security headers | `unrolled/secure` middleware |

---

## Recommended Security Tooling (2026)

| Category | Tool |
|----------|------|
| SAST | `gosec` (`securego/gosec`) |
| Vulnerable dependencies | `govulncheck` (official, stdlib-aware) |
| Secret scanning | `gitleaks` |
| Input validation | `go-playground/validator` |
| HTML sanitisation | `bluemonday` |
| Security headers | `unrolled/secure` |
| CSRF | `gorilla/csrf` |
| Password hashing | `golang.org/x/crypto/bcrypt`, `argon2` |
| CORS | `rs/cors`, `gin-contrib/cors` |
