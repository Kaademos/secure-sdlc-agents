import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Detect the technology stack from a project directory.
 * Returns a stack profile name used to load appropriate security guidance.
 */
export function detectStack(projectRoot) {
  const has = (file) => existsSync(join(projectRoot, file));

  // Node / JavaScript / TypeScript
  if (has("package.json")) {
    const pkg = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf-8"));
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (deps["next"])         return { name: "nextjs",    display: "Next.js",     language: "TypeScript/JavaScript" };
    if (deps["nuxt"])         return { name: "nuxt",      display: "Nuxt.js",     language: "TypeScript/JavaScript" };
    if (deps["@remix-run/node"]) return { name: "remix",  display: "Remix",       language: "TypeScript/JavaScript" };
    if (deps["astro"])        return { name: "astro",     display: "Astro",       language: "TypeScript/JavaScript" };
    if (deps["express"])      return { name: "express",   display: "Express.js",  language: "JavaScript" };
    if (deps["fastify"])      return { name: "fastify",   display: "Fastify",     language: "TypeScript/JavaScript" };
    if (deps["@nestjs/core"]) return { name: "nestjs",    display: "NestJS",      language: "TypeScript" };
    if (deps["hono"])         return { name: "hono",      display: "Hono",        language: "TypeScript" };

    return { name: "nodejs",  display: "Node.js",      language: "JavaScript/TypeScript" };
  }

  // Python
  if (has("pyproject.toml") || has("requirements.txt") || has("setup.py") || has("Pipfile")) {
    const pyfiles = ["pyproject.toml", "requirements.txt", "Pipfile"].map(f =>
      has(f) ? readFileSync(join(projectRoot, f), "utf-8") : ""
    ).join("\n");

    if (pyfiles.includes("fastapi"))  return { name: "fastapi", display: "FastAPI",  language: "Python" };
    if (pyfiles.includes("django"))   return { name: "django",  display: "Django",   language: "Python" };
    if (pyfiles.includes("flask"))    return { name: "flask",   display: "Flask",    language: "Python" };
    if (pyfiles.includes("litestar")) return { name: "litestar",display: "Litestar", language: "Python" };

    return { name: "python",  display: "Python",     language: "Python" };
  }

  // Ruby
  if (has("Gemfile")) {
    const gemfile = readFileSync(join(projectRoot, "Gemfile"), "utf-8");
    if (gemfile.includes("rails")) return { name: "rails", display: "Ruby on Rails", language: "Ruby" };
    if (gemfile.includes("sinatra")) return { name: "sinatra", display: "Sinatra", language: "Ruby" };
    return { name: "ruby", display: "Ruby", language: "Ruby" };
  }

  // Go
  if (has("go.mod")) {
    const gomod = readFileSync(join(projectRoot, "go.mod"), "utf-8");
    if (gomod.includes("gin-gonic/gin"))   return { name: "gin",   display: "Gin (Go)",  language: "Go" };
    if (gomod.includes("labstack/echo"))   return { name: "echo",  display: "Echo (Go)", language: "Go" };
    if (gomod.includes("gofiber/fiber"))   return { name: "fiber", display: "Fiber (Go)",language: "Go" };
    return { name: "golang", display: "Go", language: "Go" };
  }

  // Java / Kotlin / JVM
  if (has("pom.xml")) {
    const pom = readFileSync(join(projectRoot, "pom.xml"), "utf-8");
    if (pom.includes("spring-boot")) return { name: "spring-boot", display: "Spring Boot", language: "Java/Kotlin" };
    return { name: "java", display: "Java", language: "Java" };
  }
  if (has("build.gradle") || has("build.gradle.kts")) {
    return { name: "java", display: "Gradle/JVM", language: "Java/Kotlin" };
  }

  // Rust
  if (has("Cargo.toml")) return { name: "rust", display: "Rust", language: "Rust" };

  // Infrastructure-only
  if (has("main.tf") || has("terraform.tf")) return { name: "terraform", display: "Terraform", language: "HCL" };
  if (has("Chart.yaml")) return { name: "helm", display: "Helm Chart", language: "YAML" };

  return { name: "unknown", display: "Unknown", language: "Unknown" };
}

/**
 * Returns the top security considerations for a given stack.
 */
export function getStackSecurityNotes(stackName) {
  const notes = {
    nextjs: [
      "Review Server Actions for CSRF and authorisation — they're POST endpoints by default",
      "Ensure API routes in app/api/ validate auth on every request — no route-level middleware by default",
      "Use next/headers to read cookies server-side — avoid exposing auth tokens to client components",
      "Review CORS config in next.config.js — wildcard origins are dangerous on API routes",
      "Server Components can access secrets but ensure no secrets leak into Client Component props",
      "Validate Zod schemas server-side on all Server Action inputs, even if validated client-side",
    ],
    express: [
      "Use helmet middleware for security headers (CSP, HSTS, X-Frame-Options)",
      "Never trust req.body without validation — use express-validator or zod",
      "Avoid req.body[key] concatenation in queries — always use parameterised queries",
      "Set trust proxy correctly if behind a load balancer (affects rate limiting by IP)",
      "Disable X-Powered-By: Express header (helmet does this)",
    ],
    django: [
      "Use Django's built-in CSRF middleware — never disable it for API endpoints without CORS-based protection",
      "Use Django ORM querysets — avoid .raw() without parameterisation",
      "DEBUG must be False in production; ALLOWED_HOSTS must be explicitly set",
      "Use django-environ or similar for secrets — never commit SECRET_KEY to source",
      "SECURE_SSL_REDIRECT, SECURE_HSTS_SECONDS, SESSION_COOKIE_SECURE must be True in production",
    ],
    fastapi: [
      "Use Depends() for auth on every endpoint — there is no global auth middleware by default",
      "Validate all path and query parameters with Pydantic — FastAPI does this if types are annotated",
      "Never use 'response_model=None' to bypass output filtering on sensitive endpoints",
      "Use OAuth2PasswordBearer with proper scope checking — not just token presence",
      "CORS: set allow_origins explicitly, never use '*' for authenticated APIs",
    ],
    rails: [
      "Rails has CSRF protection by default — never use protect_from_forgery :null_session on non-API controllers",
      "Use strong parameters everywhere — never pass params directly to model methods",
      "Rails 7+ uses encrypted credentials — use rails credentials:edit, never ENV vars for secrets in production",
      "Audit before_action filters for auth — ensure every controller action is covered",
      "Brakeman is the standard Rails SAST tool — run on every PR",
    ],
    terraform: [
      "Pin provider versions with ~> constraints, not latest",
      "Use terraform-aws-modules/terraform-google-modules — don't write IAM from scratch",
      "Never use wildcard permissions (actions = ['*'])",
      "Use tfsec or Checkov in CI for IaC scanning",
      "Store state in encrypted remote backends — never commit .tfstate to git",
    ],
  };

  return notes[stackName] || [
    "Apply OWASP ASVS L2 as the baseline security requirements",
    "Validate all inputs server-side — never trust client-supplied data",
    "Use parameterised queries — never string-concatenate user input into queries",
    "Store secrets in a secrets manager, not in code or environment files committed to git",
  ];
}
