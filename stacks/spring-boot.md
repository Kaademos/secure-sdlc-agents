# Spring Boot Security Profile

**Frameworks:** Spring Boot 3.x, Spring Security 6.x
**Languages:** Java 17+ / Kotlin 1.9+
**ASVS Baseline:** L2

---

## Spring Security Is Secure Until You Opt Out

Add `spring-boot-starter-security` and every endpoint is authenticated, CSRF is on, and a
baseline set of security headers is sent. Almost every real Spring Boot finding comes from
*opting out* of that: widening Actuator exposure, adding `permitAll()` in the wrong order,
disabling CSRF while still using cookie sessions, dropping to `EntityManager.createQuery`
with string concatenation, or binding requests straight onto JPA entities. This profile
targets those opt-outs, plus the Spring-specific injection classes (SpEL, Thymeleaf) that
have no equivalent in other stacks.

---

## Actuator — The Most Exploited Spring Boot Misconfiguration

Spring Boot 3.x exposes only `/actuator/health` over HTTP by default. Widening that is the
single most common way Spring services leak credentials.

```yaml
# ✗ Critical — exposes heapdump, env, threaddump, mappings, loggers to anyone who can reach the port
management:
  endpoints:
    web:
      exposure:
        include: "*"
```

| Endpoint | What an attacker gets |
|----------|----------------------|
| `/actuator/heapdump` | Full heap image — DB passwords, session tokens, API keys in memory |
| `/actuator/env`, `/configprops` | Config values; masking is **key-pattern based** and misses custom names |
| `/actuator/mappings` | Complete route inventory, including endpoints not meant to be discoverable |
| `/actuator/loggers` | `POST` changes log levels at runtime — useful for hiding activity |
| `/actuator/threaddump` | Stack traces revealing internals and in-flight arguments |

```yaml
# ✓ Expose the minimum, and move management to an internal-only port
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized   # never "always" on an internet-facing service
  server:
    port: 9001
    address: 127.0.0.1                # not reachable from outside the host
```

```java
// ✓ If Actuator must share the main port, authorise it explicitly
http.authorizeHttpRequests(auth -> auth
    .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
    .requestMatchers(EndpointRequest.toAnyEndpoint()).hasRole("OPS")
    .anyRequest().authenticated());
```

---

## Authorisation — Order Matters, and `@PreAuthorize` Needs Enabling

Request matchers are evaluated **in declaration order and the first match wins**. A broad
rule placed early silently shadows every rule after it.

```java
// ✗ Unsafe — the /api/** rule matches first, so the admin rule is never reached
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .anyRequest().authenticated());

// ✓ Safe — most specific first, default-deny last
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/public/**").permitAll()
    .anyRequest().authenticated());   // never end with anyRequest().permitAll()
```

**`@PreAuthorize` is inert without `@EnableMethodSecurity`.** This is the highest-impact
trap in the framework: the annotations read as enforcement, compile fine, and do nothing.
Spring Security 6 replaced `@EnableGlobalMethodSecurity(prePostEnabled = true)` with:

```java
@Configuration
@EnableMethodSecurity   // ✓ required — prePost is enabled by default in Spring Security 6
public class SecurityConfig { }
```

`hasRole("ADMIN")` checks for the authority `ROLE_ADMIN`; `hasAuthority("ADMIN")` checks the
literal string. Mixing the two produces a check that can never pass — or a role that is
never enforced.

### Object-level authorisation (IDOR)

Authenticating the caller says nothing about whether this row is theirs. Spring Data's
`findById` will happily return another tenant's record.

```java
// ✗ IDOR — any authenticated user can read any invoice by guessing an id
@GetMapping("/invoices/{id}")
public Invoice get(@PathVariable Long id) {
    return repository.findById(id).orElseThrow();
}

// ✓ Scope the query to the principal — enforcement in the query, not after it
@GetMapping("/invoices/{id}")
public Invoice get(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
    return repository.findByIdAndOwnerUsername(id, user.getUsername())
        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND)); // 404, not 403
}
```

> `@AuthenticationPrincipal` is a Spring MVC argument resolver — it works on **controller**
> methods. On a service-layer method it resolves to `null`. Pass the principal down, or read
> `SecurityContextHolder.getContext().getAuthentication()` inside the service.

---

## CSRF — Disable It Only If No Cookie Carries Authentication

Spring Security enables CSRF protection by default using `HttpSessionCsrfTokenRepository`.

Disabling it is **legitimate** for a stateless API where every request is authenticated by
an `Authorization: Bearer` header, because browsers do not attach that automatically. It is
**not** legitimate if any session cookie still authenticates the user — that is the actual
vulnerability, and `.csrf(csrf -> csrf.disable())` copied from a JWT tutorial into a
cookie-session app is how it happens.

```java
// ✓ Stateless bearer-token API — no ambient credential, so no CSRF surface
http.csrf(AbstractHttpConfigurer::disable)
    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

// ✓ Cookie-session SPA — keep CSRF on, expose the token to JS
CsrfTokenRequestAttributeHandler handler = new CsrfTokenRequestAttributeHandler();
handler.setCsrfRequestAttributeName(null);  // opt out of deferred/BREACH-encoded lookup
http.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
    .csrfTokenRequestHandler(handler));
```

> Spring Security 6 defaults to `XorCsrfTokenRequestAttributeHandler` (BREACH mitigation),
> which is why SPAs that worked on Spring Security 5 start returning 403 after an upgrade.
> The handler above is the supported fix — do not "solve" it by disabling CSRF.

---

## SQL and JPQL Injection

Derived query methods and bound `@Query` parameters are safe. Injection enters through the
escape hatches, where the query is a runtime-built `String`.

```java
// ✓ Safe — derived from the method name, criteria built by Spring Data
Optional<User> findByEmailIgnoreCase(String email);

// ✓ Safe — named bind parameters (:email) and positional (?1) are both parameterised
@Query("SELECT u FROM User u WHERE u.email = :email")
Optional<User> lookup(@Param("email") String email);

// ✓ Safe — native query, still parameterised
@Query(value = "SELECT * FROM users WHERE email = :email", nativeQuery = true)
Optional<User> lookupNative(@Param("email") String email);
```

```java
// ✗ Injection — EntityManager with a concatenated string
em.createQuery("SELECT u FROM User u WHERE u.name = '" + name + "'").getResultList();
em.createNativeQuery("SELECT * FROM users WHERE name = '" + name + "'").getResultList();

// ✗ Injection — JdbcTemplate with the value inlined
jdbcTemplate.queryForObject("SELECT * FROM users WHERE id = " + id, mapper);

// ✓ Safe — placeholders, values passed separately
jdbcTemplate.queryForObject("SELECT * FROM users WHERE id = ?", mapper, id);
namedJdbcTemplate.queryForObject("SELECT * FROM users WHERE id = :id",
    Map.of("id", id), mapper);
```

**Sorting cannot be parameterised.** Spring Data validates `Sort` properties against the
entity for derived and JPQL queries, but with `nativeQuery = true` the `ORDER BY` clause is
appended to the SQL as supplied. Allow-list it:

```java
private static final Set<String> SORTABLE = Set.of("createdAt", "name");

String field = SORTABLE.contains(requested) ? requested : "createdAt";
```

---

## SpEL Injection — Spring-Specific, Reaches RCE

Evaluating a user-controlled Spring Expression Language string is remote code execution, not
a data leak. This is the class behind CVE-2018-1273 and repeated Spring Data CVEs.

```java
// ✗ RCE — T(java.lang.Runtime).getRuntime().exec("...") evaluates happily
Object result = new SpelExpressionParser().parseExpression(userInput).getValue();

// ✓ If expressions must be user-supplied, strip the dangerous surface
EvaluationContext ctx = SimpleEvaluationContext.forReadOnlyDataBinding().build();
Object result = new SpelExpressionParser()
    .parseExpression(userInput).getValue(ctx);   // no type refs, no method invocation
```

`SimpleEvaluationContext` removes Java type references, constructors, and bean lookups.
`StandardEvaluationContext` (the default) allows all three. Treat any user string that
reaches `parseExpression`, a `@Query` SpEL fragment (`?#{...}`), or a `MessageSource`
template as a code-execution sink.

---

## Mass Assignment — Never Bind a Request onto an Entity

```java
// ✗ Mass assignment — the client can POST role=ADMIN or enabled=true
@PostMapping("/users")
public User create(@ModelAttribute User user) {   // User is a JPA @Entity
    return repository.save(user);
}

// ✓ Bind to a DTO exposing only client-settable fields, then map explicitly
public record CreateUserRequest(
    @NotBlank @Size(max = 100) String name,
    @Email String email) { }

@PostMapping("/users")
public User create(@Valid @RequestBody CreateUserRequest req) {
    User user = new User(req.name(), req.email());
    user.setRole(Role.USER);          // server decides privileged fields
    return repository.save(user);
}
```

For Jackson-bound entities you cannot refactor yet, mark privileged fields
`@JsonProperty(access = Access.READ_ONLY)`, and set
`spring.jackson.deserialization.fail-on-unknown-properties=true` so unexpected fields fail
loudly instead of binding silently.

---

## Deserialisation

Jackson is safe until polymorphic typing is switched on globally — that turns any JSON body
into a gadget-chain sink.

```java
// ✗ Deserialisation RCE — attacker controls the target class via the type field
mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance,
    DefaultTyping.NON_FINAL);

// ✓ Allow-list the permitted subtypes instead
@JsonTypeInfo(use = Id.NAME, property = "type")
@JsonSubTypes({ @Type(value = CardPayment.class, name = "card"),
                @Type(value = BankPayment.class, name = "bank") })
public sealed interface Payment permits CardPayment, BankPayment { }
```

Never deserialise untrusted bytes with `java.io.ObjectInputStream` — there is no safe
configuration for it. Use JSON with a declared target type.

---

## Input Validation — `@Valid` Does Not Cover Params

`@Valid` validates the annotated object (a `@RequestBody` DTO). Constraints placed directly
on `@RequestParam` or `@PathVariable` are only enforced if the **class** is `@Validated`.

```java
// ✓ Both forms of validation wired up
@RestController
@Validated                                    // required for the @Min below to run
public class SearchController {
    @GetMapping("/search")
    public List<Item> search(@RequestParam @Size(max = 100) String q,
                             @RequestParam @Min(1) int page) { ... }

    @PostMapping("/items")
    public Item create(@Valid @RequestBody ItemRequest req) { ... }
}
```

Handle both failure modes — `MethodArgumentNotValidException` (body) and
`ConstraintViolationException` (params) — in `@RestControllerAdvice`, returning a generic
message. Never echo the exception text: it leaks field names, SQL, and file paths.

> **Kotlin:** annotations on a constructor `val` default to the constructor *parameter*, so
> validation silently never runs. Use the `field:` use-site target:
> `data class Req(@field:NotBlank val name: String)`. Kotlin's null-safety checks presence,
> not content — it is not a substitute for constraints.

---

## XSS and Template Injection (Thymeleaf)

```html
<!-- ✓ th:text HTML-escapes -->
<p th:text="${user.bio}">bio</p>

<!-- ✗ th:utext writes raw markup — stored XSS on user input -->
<p th:utext="${user.bio}">bio</p>
```

Sanitise with OWASP Java HTML Sanitizer before using `th:utext`. Separately, never build a
**view name** from user input — Thymeleaf resolves fragment expressions in the view name,
making it a server-side template injection sink:

```java
// ✗ SSTI — a view name like "__${T(java.lang.Runtime)...}__::x" executes
return "user/" + request.getParameter("page");

// ✓ Map input to a fixed set of view names
return VIEWS.getOrDefault(request.getParameter("page"), "user/home");
```

---

## CORS and Security Headers

Spring 6 throws at startup on `allowedOrigins("*")` combined with `allowCredentials(true)`.
The trap is the workaround: `allowedOriginPatterns("*")` permits exactly that combination
and reflects every `Origin`.

```java
// ✗ Unsafe — reflects any origin back with credentials allowed
config.setAllowedOriginPatterns(List.of("*"));
config.setAllowCredentials(true);

// ✓ Safe — explicit origins
config.setAllowedOrigins(List.of("https://app.example.com"));
config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
config.setAllowCredentials(true);
```

Spring Security sends `X-Content-Type-Options`, `X-Frame-Options: DENY`, and `Cache-Control`
by default, and HSTS on HTTPS requests. **CSP is not set by default** — add it:

```java
http.headers(h -> h
    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
    .httpStrictTransportSecurity(hsts -> hsts
        .includeSubDomains(true).maxAgeInSeconds(63072000))
    .referrerPolicy(r -> r.policy(STRICT_ORIGIN_WHEN_CROSS_ORIGIN)));
```

---

## Passwords and Secrets

```java
// ✓ DelegatingPasswordEncoder stores a {bcrypt} prefix, enabling algorithm migration
@Bean
PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
}

// ✓ Explicit strength (default is 10) — or Argon2PasswordEncoder
@Bean
PasswordEncoder bcrypt() { return new BCryptPasswordEncoder(12); }

// ✗ Never — NoOpPasswordEncoder stores plaintext; deprecated for exactly this reason
NoOpPasswordEncoder.getInstance();
```

Hardcoded credentials in `application.yml` are not only committed to git — they are also
readable through `/actuator/env` and `/configprops` if Actuator is exposed. Resolve secrets
from the environment or a secrets manager:

```yaml
# ✓ application.yml holds a reference, never the value
spring:
  datasource:
    password: ${DB_PASSWORD}          # fails fast at startup if unset
  cloud:
    vault:
      host: vault.internal.example.com   # host and port are separate properties
      port: 8200
      scheme: https
      authentication: KUBERNETES
```

---

## Path Traversal and SSRF

```java
// ✓ Normalise, then confirm the resolved path is still inside the base directory
Path base = Paths.get("/srv/uploads").toAbsolutePath().normalize();
Path target = base.resolve(userFilename).normalize();
if (!target.startsWith(base)) throw new AccessDeniedException("path traversal");

// ✗ SSRF — a user-supplied URL reaches internal services and cloud metadata
restTemplate.getForObject(userSuppliedUrl, String.class);
// ✓ Allow-list the host and block private/link-local ranges (169.254.169.254, 10/8, 127/8, ::1)
```

---

## ASVS Controls for Spring Boot Projects

| ASVS Ref | Control | Spring Implementation |
|----------|---------|-----------------------|
| V8.3.1 | Auth on all endpoints | Filter chain ending `.anyRequest().authenticated()` |
| V8.2.2 | Object-level authorisation | Ownership scoped into the repository query |
| V2.2.1 | Input validation | `@Valid` on DTOs; `@Validated` on the class for params |
| V1.2.4 | No SQL injection | Derived queries / bound `@Query` params; never concatenate |
| V1.3.1 | Output encoding (XSS) | Thymeleaf `th:text`; sanitise before `th:utext` |
| V11.4.2 | Password storage | `DelegatingPasswordEncoder` → BCrypt (strength ≥ 12) or Argon2 |
| V3.5.1 | CSRF | Enabled by default; `CookieCsrfTokenRepository` for SPAs |
| V4.1.1 | Security headers | `HeadersConfigurer` — CSP must be added explicitly |
| V14.1.1 | Don't confirm resource existence | Return 404, not 403, for records the caller can't see |
| V16.3.1 | Auth event logging | `AuthenticationSuccess`/`FailureEvent` listeners |

---

## Recommended Security Tooling (2026)

| Category | Tool |
|----------|------|
| SAST | SpotBugs + `find-sec-bugs`, Semgrep (Java/Kotlin rules) |
| Vulnerable dependencies | OWASP Dependency-Check, Snyk, `gradle dependencyCheckAnalyze` |
| Dependency currency | Keep `spring-boot-starter-parent` / the Spring BOM current — it pins transitive versions |
| Secret scanning | gitleaks |
| Kotlin lint | detekt (with the `detekt-rules` security ruleset) |
| HTML sanitisation | OWASP Java HTML Sanitizer |
| Password hashing | `BCryptPasswordEncoder`, `Argon2PasswordEncoder` (needs BouncyCastle) |
| Runtime hardening | Actuator on an internal-only management port |
