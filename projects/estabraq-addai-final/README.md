# Estabraq Addai — Portfolio

A responsive, single-page portfolio for **Estabraq Addai — Full-Stack Developer & UI/UX Specialist**. Built with semantic HTML5, Tailwind CSS utilities, custom CSS, vanilla JavaScript, and the Supabase JavaScript SDK loaded from a CDN.

## Run locally

No package install or build step is required. From this folder run:

```sh
python3 -m http.server 3001 --bind 127.0.0.1
```

Then visit `http://localhost:3001`. The page uses Google Fonts, Tailwind CDN and the Supabase CDN when an internet connection is available; local CSS and an SVG hero fallback are included. For production, compile/self-host Tailwind and the font files if your deployment requires a fully self-contained bundle.

## Files

- `index.html` — metadata and all portfolio sections
- `assets/styles.css` — responsive dark-cosmic design system, product preview artwork, form states and reduced-motion rules
- `assets/app.js` — mobile navigation, interactive stack badges, template filtering/previews, editable purchase links and Supabase-ready form submission
- `assets/config.js` — public site configuration for social links, product slugs and Supabase public connection details
- `assets/estabraq-hero.webp` — optimized hero artwork served by the page
- `assets/estabraq-hero.png` — full-resolution source artwork
- `assets/hero-fallback.svg` — lightweight local fallback artwork
- `supabase/schema.sql` — inquiry table with constraints and insert-only row-level security
- `supabase/functions/send-booking-email/index.ts` — optional Supabase Edge Function for email notification through Resend
- `manus-routes.json` — route declaration for the home page

## Connect Supabase

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor. It creates `public.project_inquiries`; anonymous visitors can insert a request but cannot read, edit or delete submitted rows.
2. In `assets/config.js`, set `supabaseUrl` and `supabaseAnonKey` using the project's URL and **anon/public key**. Never place a `service_role` key or email-provider secret in browser code.
3. The form uses the Supabase JS CDN client to insert the validated fields into the configured table. Without a project URL/key, it explicitly stays in preview mode and does not send or save submitted details.

Public anonymous writes can attract spam. Before accepting production leads, add CAPTCHA/rate limits or route inserts through a server-side Edge Function, restrict the email function's CORS origin, and review consent/privacy requirements for your jurisdiction.

## Email notifications (optional)

The form invokes the `send-booking-email` Supabase Edge Function after a successful database insert. Deploy it using the Supabase CLI and configure `RESEND_API_KEY`, `BOOKING_EMAIL`, `RESEND_FROM_EMAIL`, and a production `ALLOWED_ORIGIN` as **Supabase Function secrets**. Use a verified sender domain. Email secrets stay on the server; if the function is not deployed or configured, the form still reports whether the inquiry was saved, without claiming an email was sent.

## Purchase and social destinations

Product cards have direct Gumroad-style buy links. No actual product URLs or social handles were supplied, so the default `auralabs.gumroad.com/l` base, product slugs and profile/email values in `assets/config.js` are **editable placeholders**. Replace these values with verified live destinations before publishing or promoting the page.
