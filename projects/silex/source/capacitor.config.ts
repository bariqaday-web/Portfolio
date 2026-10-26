import type { CapacitorConfig } from "@capacitor/cli";

const configuredUrl = process.env.CAPACITOR_SERVER_URL;
if (!configuredUrl) {
  throw new Error("CAPACITOR_SERVER_URL must be set to the production HTTPS origin.");
}

const serverUrl = new URL(configuredUrl);
if (
  serverUrl.protocol !== "https:" ||
  serverUrl.username ||
  serverUrl.password ||
  serverUrl.pathname !== "/" ||
  serverUrl.search ||
  serverUrl.hash
) {
  throw new Error("CAPACITOR_SERVER_URL must be a bare HTTPS origin without credentials, path, query, or hash.");
}

const config: CapacitorConfig = {
  appId: "com.salix.marketplace",
  appName: "Salix",
  webDir: "mobile-web",
  server: {
    url: serverUrl.origin,
    cleartext: false,
    allowNavigation: [serverUrl.hostname],
  },
};

export default config;
