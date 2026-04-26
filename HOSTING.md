# Hosting HomeEase (cPanel / static Apache)

This project is a **static site** (HTML, CSS, JS) with **Supabase** as the backend. There is no PHP or Node server required on the host.

## 1. Prepare `config.js`

1. Copy `assets/js/config.example.js` to `assets/js/config.js` (if you don’t have it yet).
2. Set your **Supabase project URL** and **anon (public) key** from [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings → API**.
3. **Do not commit** real keys to a public repository. Keep `config.js` out of git or use a private repo.

## 2. Supabase dashboard (production domain)

After you know your live URL (e.g. `https://yourdomain.com`):

1. **Authentication → URL configuration**
   - **Site URL**: `https://yourdomain.com` (or your main entry, e.g. `https://yourdomain.com/customer/`)
   - **Redirect URLs**: add the URLs users return to after login, e.g.  
     `https://yourdomain.com/customer/**`  
     `https://yourdomain.com/admin/**`  
     `https://yourdomain.com/provider/**`
2. **Storage**: if you use buckets for avatars/documents, ensure policies match your app (already in migrations).

## 3. Upload to cPanel

1. Open **File Manager** → `public_html` (or the subdomain’s document root).
2. Upload the project **contents** so the structure looks like:

   ```
   public_html/
     .htaccess
     index.html
     assets/
     customer/
     admin/
     provider/
   ```

3. **Do not** upload `supabase/` or `.git` to the server if you can avoid it (optional; `.htaccess` tries to block `/.git`).

4. Ensure **`assets/js/config.js`** exists on the server with production keys.

## 4. SSL (HTTPS)

In cPanel use **SSL/TLS** (Let’s Encrypt). After HTTPS works, uncomment the **HTTP → HTTPS** rules in `.htaccess` if you want to force SSL.

## 5. How the home page works

- **`index.html`** at the site root redirects visitors to **`customer/index.html`** (marketplace home).
- Internal links use paths like `customer/...`, `admin/...`, `provider/...` — keep that folder layout.

## 6. Troubleshooting

| Issue | What to check |
|--------|----------------|
| Blank page / 403 | `index.html` and `customer/index.html` exist; file permissions (folders `755`, files `644`). |
| Assets 404 | Paths are relative (`../assets/` from `customer/`); upload the whole `assets` folder. |
| Supabase errors in console | `config.js` URL/key; Supabase project not paused; RLS policies. |
| Auth redirect loops | **Redirect URLs** in Supabase Auth include your exact domain and paths. |
| `.htaccess` ignored | Some hosts need “Allow Override” — ask host; or rely on root `index.html` only. |

## 7. Optional: subdomain layout

You can point `app.yourdomain.com` to a folder that contains the same files, or use **Addon Domains** in cPanel with its own `public_html` subtree — same rules apply.

## 8. Subfolder installs (e.g. `yoursite.com/homeease/`)

If the site lives under a subpath, relative links like `../assets/` still work **as long as** the folder structure is unchanged. Update `index.html` at repo root to redirect to `homeease/customer/index.html` (or use a subdirectory copy of `index.html`). Easiest production setup is **document root = project root** (section 3).
