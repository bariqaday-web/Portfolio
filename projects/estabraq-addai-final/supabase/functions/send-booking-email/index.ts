// Deploy with: supabase functions deploy send-booking-email
// Configure Supabase Function secrets: RESEND_API_KEY, BOOKING_EMAIL, RESEND_FROM_EMAIL.
// Restrict ALLOWED_ORIGIN to the portfolio's production origin before launch.
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  try {
    const {
      name,
      client_email,
      service_needed,
      budget_range,
      project_description,
    } = await request.json();
    if (
      !name ||
      !client_email ||
      !service_needed ||
      !budget_range ||
      !project_description
    ) {
      return json({ error: "Missing required project inquiry fields." }, 400);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const bookingEmail = Deno.env.get("BOOKING_EMAIL");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    if (!apiKey || !bookingEmail || !fromEmail) {
      console.error("Email function secrets are not configured.");
      return json({ error: "Email delivery is not configured." }, 503);
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(client_email);
    const safeService = escapeHtml(service_needed);
    const safeBudget = escapeHtml(budget_range);
    const safeDescription = escapeHtml(project_description).replace(
      /\r?\n/g,
      "<br>",
    );
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [bookingEmail],
        reply_to: client_email,
        subject: `New project inquiry — ${String(name).slice(0, 100)}`,
        html: `<main style="font-family:Arial,sans-serif;color:#162033;line-height:1.65;max-width:640px;margin:auto"><p style="color:#0e7490;font-size:12px;font-weight:700;letter-spacing:1px">NEW PROJECT INQUIRY</p><h1 style="font-size:23px">${safeName}</h1><p><b>Client email:</b> ${safeEmail}</p><p><b>Service:</b> ${safeService}</p><p><b>Budget:</b> ${safeBudget}</p><hr style="border:0;border-top:1px solid #ddd;margin:22px 0"><h2 style="font-size:16px">Project description</h2><p>${safeDescription}</p></main>`,
      }),
    });
    if (!response.ok) {
      console.error(
        "Email provider returned a non-success status:",
        response.status,
      );
      return json(
        { error: "Email provider could not deliver the notification." },
        502,
      );
    }
    return json({ sent: true });
  } catch {
    return json({ error: "Unable to process this inquiry notification." }, 400);
  }
});
