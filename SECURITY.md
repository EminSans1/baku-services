# Security configuration

## Required environment variables (production)

The server refuses to start in `NODE_ENV=production` without these:

| Variable                | Purpose                                              | How to generate                                                    |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `JWT_SECRET`            | Signs user and admin JWTs                            | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CSRF_SECRET`           | (reserved for future signed-token CSRF)              | same as above                                                      |
| `ADMIN_PASSWORD`        | Step 1 of admin login                                | a long passphrase, stored in your secret manager                   |
| `ADMIN_TOTP_SECRET`     | Step 2 (RFC 6238 TOTP)                               | `node -e "console.log(require('otplib').authenticator.generateSecret())"` |
| `DATABASE_URL`          | Postgres connection string (or set `USE_SQLITE=true`) | provided by your managed Postgres                                 |

### Provisioning the admin TOTP

1. Generate `ADMIN_TOTP_SECRET` once and store it in your secret manager.
2. Create a provisioning URI:
   ```js
   require('otplib').authenticator.keyuri('admin@baku-services', 'BakuServices', 'YOUR_SECRET');
   ```
3. Render that URI as a QR code and scan it with Google Authenticator / 1Password / Aegis.
4. The 6-digit code from the app is what you enter as the 2FA code.

### Optional / legacy

| Variable                       | Default     | Notes |
| ------------------------------ | ----------- | ----- |
| `ADMIN_2FA_CODE`               | (none)      | Static fallback code. **Do not use in production.** |
| `PG_SSL_REJECT_UNAUTHORIZED`   | `true`      | Set to `false` only for managed Postgres without an exposed CA. Prefer providing `PG_CA_CERT`. |
| `PG_CA_CERT`                   | (none)      | PEM-encoded CA bundle for Postgres TLS. When set, certificate verification is enabled. |
| `CLIENT_ORIGIN`                | (none)      | Extra allowed CORS / CSRF origin (e.g. a staging domain). |
| `CLOUDINARY_URL`               | (none)      | If absent, uploads are stored locally under `uploads/`. |
| `UPLOAD_DIR`                   | `./uploads` | Override the local uploads directory. |
| `USE_SQLITE`                   | `false`     | Force SQLite even when `DATABASE_URL` is present. |

## Security model overview

- **Sessions**: JWTs stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies. JS in the
  browser cannot read them, so XSS cannot steal the session.
- **CSRF**: every state-changing request requires a matching `X-CSRF-Token` header
  and `bbs_csrf` cookie (double-submit pattern), plus a same-origin Origin/Referer
  check. Browsers can't be tricked into sending the header from an attacker's page.
- **Admin auth**: separate cookie with a short (1 h) JWT, role-scoped audience,
  protected by password + TOTP, with timing-safe comparisons and per-IP rate
  limits.
- **Account lockout**: after 6 failed login attempts in a short window the account
  is locked for 15 minutes. A constant-time bcrypt compare runs even for unknown
  emails to avoid timing oracles.
- **Token revocation**: each user has a `token_version`; bumping it invalidates
  every previously issued JWT (used by logout indirectly via cookie clear and
  reserved for future "log out everywhere"/password-reset flows).
- **PII protection**: the public `/api/listings/:id` endpoint never returns
  `email` or `phone`. Contacts are fetched via the authenticated, rate-limited
  `/api/listings/:id/contacts`.
- **Path traversal**: `/api/uploads/:filename` strictly validates the basename
  against an allowlist of extensions and characters and resolves under the
  configured upload root.
- **Headers**: Helmet sets a strict CSP (`script-src 'self'`, no `unsafe-inline`
  for scripts), HSTS in production, `frame-ancestors 'none'`, and a strict
  Referrer-Policy.

## Rotating compromised secrets

1. Generate a new `JWT_SECRET`. Restart the server. **All sessions are invalidated.**
2. Rotate `ADMIN_PASSWORD` and `ADMIN_TOTP_SECRET` together; redeploy.
3. If a user account is compromised, run `UPDATE users SET token_version = token_version + 1 WHERE id = <id>` to log them out everywhere.

## Operational notes

- Never commit `.env`, `db.sqlite`, or `uploads/` (already in `.gitignore`).
- The repository is configured to ship with `npm overrides` pinning the
  vulnerable transitive `uuid` dependency in `sequelize` to a patched version.
  Re-run `npm audit` after dependency upgrades.
- The CRA toolchain (`react-scripts`) carries known dev-only vulnerabilities
  (jsdom, postcss in `resolve-url-loader`, etc.) that do not ship to production.
  Long term, plan a migration to Vite.
