# Ruby on Rails Security Profile

**Framework:** Ruby on Rails 7.x / 8.x
**Language:** Ruby 3.x
**ASVS Baseline:** L2

---

## Rails Security Defaults — Preserve Them

Rails ships with strong security defaults. The most common vulnerabilities come from
disabling or incorrectly configuring built-in protections.

---

## Authentication — Don't Roll Your Own

Use **Devise** (or Rails 8's built-in authentication generator) rather than building auth from scratch:

```bash
# Rails 8 built-in generator
rails generate authentication
```

```ruby
# Devise — most common Rails auth solution
# Gemfile
gem 'devise'
gem 'devise-two-factor'  # Add TOTP MFA

# In User model
class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :lockable,           # Account lockout after N failed attempts
         :timeoutable,        # Session timeout after inactivity
         :trackable           # Track login timestamps and IP
         
  # Lockout configuration
  # devise.rb initializer:
  # config.maximum_attempts = 5
  # config.unlock_strategy = :time
  # config.unlock_in = 15.minutes
end
```

---

## Strong Parameters — Always

Rails 4+ requires strong parameters. Never skip them:

```ruby
# ✗ Mass assignment vulnerability — any field can be set
@user = User.new(params[:user])

# ✓ Strong parameters
class UsersController < ApplicationController
  def create
    @user = User.new(user_params)
    ...
  end
  
  private
  
  def user_params
    # Only permit the fields you expect
    params.require(:user).permit(:name, :email, :password, :password_confirmation)
    # ✗ Never: params.require(:user).permit!  — permits ALL attributes
  end
end
```

---

## CSRF Protection

Rails includes CSRF protection by default. Don't disable it:

```ruby
# ✓ Default — keep this in ApplicationController
class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception  # Raises on CSRF failure
  # OR: :null_session — resets session (use only for API endpoints)
  # OR: :reset_session — resets session
end

# For API-only controllers that use Bearer token auth (not cookies):
class Api::V1::BaseController < ActionController::API
  # ActionController::API does NOT include CSRF protection by default
  # Token-based auth (Authorization: Bearer) is CSRF-safe by design
  # ✗ Never include protect_from_forgery :null_session on API controllers
  # that are already protected by Bearer token validation
end
```

---

## Access Control — Pundit or CanCanCan

Authorisation is not built into Rails. Use a policy library:

```ruby
# Pundit
class PostPolicy < ApplicationPolicy
  def show?
    record.author == user  # ✓ Object-level auth
  end
  
  def update?
    record.author == user
  end
  
  def destroy?
    record.author == user || user.admin?
  end
end

class PostsController < ApplicationController
  before_action :authenticate_user!  # Devise: ensure user is logged in
  
  def show
    @post = Post.find(params[:id])
    authorize @post  # ✓ Will call PostPolicy#show? — raises Pundit::NotAuthorizedError if fails
    render json: @post
  end
  
  # ✓ Add this to catch missing authorization calls
  after_action :verify_authorized
end
```

**Common mistake:** Forget `authorize @resource` in a controller action. `after_action :verify_authorized`
will catch this and raise an error in development, preventing it reaching production.

---

## SQL Injection

Rails ActiveRecord is safe by default. Injection is only possible with:

```ruby
# ✓ Safe — ActiveRecord parameterises automatically
User.where(email: params[:email])
User.where(id: params[:id])

# ✗ Unsafe — string interpolation in where clause
User.where("email = '#{params[:email]}'")  # SQL injection

# ✓ Safe — use ? or named params with raw where
User.where("email = ?", params[:email])
User.where("email = :email", email: params[:email])

# ✗ Unsafe — order() clause injection is less obvious
User.order(params[:sort_column])  # ✗ Attacker controls SQL ORDER BY

# ✓ Safe — whitelist sort columns
ALLOWED_SORT_COLUMNS = %w[name email created_at].freeze
sort_col = ALLOWED_SORT_COLUMNS.include?(params[:sort]) ? params[:sort] : 'created_at'
User.order(sort_col)
```

---

## XSS — ERB Auto-Escaping

Rails ERB templates auto-escape HTML output. The risk is explicitly disabling it:

```erb
<!-- ✓ Safe — auto-escaped -->
<%= @user.name %>

<!-- ✗ Unsafe — disables escaping -->
<%= raw @user.bio %>
<%== @user.bio %>  # Also disables escaping

<!-- ✓ Safe HTML rendering — use sanitize for user-provided HTML -->
<%= sanitize @user.bio, tags: %w[p strong em a], attributes: %w[href] %>
```

---

## Secrets Management — Rails Credentials

```bash
# Rails 7+ encrypted credentials
rails credentials:edit

# Access in code
Rails.application.credentials.dig(:aws, :access_key_id)
Rails.application.credentials.secret_key_base

# ✓ Master key in .gitignore (already there by default)
# ✗ Never commit config/master.key
```

For team environments, use per-environment credentials:

```bash
rails credentials:edit --environment production
# Creates config/credentials/production.yml.enc + config/credentials/production.key
# Commit the .enc file, keep .key in your secrets manager
```

---

## Brakeman — Rails SAST Tool

Run Brakeman on every PR. It understands Rails-specific patterns:

```bash
gem install brakeman
brakeman --no-pager --format json > brakeman.json

# In CI (block on high confidence findings)
brakeman --exit-on-warn --confidence-level 2
```

Brakeman detects: SQL injection, XSS, CSRF bypass, mass assignment, redirect injection,
session fixation, and many other Rails-specific issues.

---

## ASVS Controls for Rails Projects

| ASVS Ref | Control | Rails Implementation |
|----------|---------|---------------------|
| V2.1.1 | Password complexity | Devise validates :password strength |
| V2.2.1 | Account lockout | Devise :lockable |
| V4.1.1 | Auth on all actions | `before_action :authenticate_user!` |
| V4.2.1 | Object-level auth | Pundit policies with `authorize @resource` |
| V5.3.4 | No SQL injection | ActiveRecord ORM; never string-interpolate in where() |
| V14.4.5 | CSRF | `protect_from_forgery` (default) |

---

## Recommended Tools

| Category | Tool |
|----------|------|
| Auth | Devise, Rodauth |
| Authorisation | Pundit, CanCanCan |
| SAST | Brakeman |
| Dependency scan | bundler-audit |
| 2FA | devise-two-factor |
| Rate limiting | rack-attack |
| Secrets | Rails credentials, Doppler |
