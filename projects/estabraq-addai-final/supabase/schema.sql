-- AuraLabs / Estabraq portfolio inquiry form.
-- Public visitors may insert a request; anonymous users cannot read, edit or delete records.
create extension if not exists pgcrypto;

create table if not exists public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  client_email text not null check (char_length(client_email) <= 254 and client_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  service_needed text not null check (service_needed in (
    'Custom Landing Page Development',
    'API & Supabase Database Integration',
    'Full-Stack SaaS Development',
    'UI/UX Redesign',
    'Something else'
  )),
  budget_range text not null check (budget_range in (
    'Under $1,000', '$1,000–$5,000', '$5,000–$15,000', '$15,000+', 'Still defining scope'
  )),
  project_description text not null check (char_length(trim(project_description)) between 12 and 3000),
  created_at timestamptz not null default now()
);

alter table public.project_inquiries enable row level security;

-- Drop/recreate this named policy if you are re-applying the script.
drop policy if exists "Public can submit project inquiries" on public.project_inquiries;
create policy "Public can submit project inquiries"
  on public.project_inquiries
  for insert
  to anon
  with check (true);

revoke all on table public.project_inquiries from anon, authenticated;
grant insert on table public.project_inquiries to anon;

-- Production recommendation: put public submissions behind an Edge Function with
-- CAPTCHA/rate limiting and origin checks before enabling this anonymous insert flow.
