/* Public browser configuration.
   Use only a Supabase anon/public key here—never a service_role key or email-provider secret. */
window.ESTABRAQ_CONFIG = Object.freeze({
  supabaseUrl: "",
  supabaseAnonKey: "",
  inquiriesTable: "project_inquiries",
  emailFunctionName: "send-booking-email",
  gumroadBaseUrl: "https://auralabs.gumroad.com/l",
  productSlugs: {
    auraai: "auraai",
    nexusgrowth: "nexusgrowth",
    vibecraft: "vibecraft",
    novasync: "novasync",
    auraestate: "auraestate",
    auratask: "auratask",
    aurapay: "aurapay",
    aurafolio: "aurafolio",
    auracv: "auracv",
    auraconsult: "auraconsult",
  },
  socialLinks: {
    github: "https://github.com/your-github-handle",
    linkedin: "https://www.linkedin.com/in/your-linkedin-profile",
    twitter: "https://x.com/your-x-handle",
    email: "mailto:hello@example.com",
  },
});
