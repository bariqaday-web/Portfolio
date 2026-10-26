# Estabraq Addai — Full-Stack Developer & UI/UX Specialist

A modern, responsive portfolio landing page built with semantic HTML5, Tailwind CSS via CDN, Inter typography, and progressive client-side logic for Supabase and email delivery.

## Run locally

```bash
python3 -m http.server 3000 --bind 0.0.0.0
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Create a `project_inquiries` table with columns matching `name`, `email`, `service`, `budget`, `description`, and `created_at`.
3. Add Row Level Security policies appropriate for your deployment.
4. Replace the `SUPABASE_URL` and `SUPABASE_ANON_KEY` placeholders in `index.html` or define `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY` before the inline logic.
5. Never use a Supabase service-role key in browser code.

## Email setup

Set `window.EMAIL_ENDPOINT` to your own secure serverless endpoint. The page sends a JSON `POST` with the inquiry payload. The endpoint can forward the message through Resend, Postmark, SendGrid, or another provider without exposing provider secrets in the browser.

## Included interactions

- Mobile navigation menu
- Interactive tech-stack badges
- Template category filters
- Template purchase links that prefill the inquiry form
- Client-side validation and async Supabase/email-ready submit handler
