const env = import.meta.env;

export const appName = String(env.APP_NAME || env.VITE_APP_NAME || "Vehicle Hub");
export const appTagline = String(
  env.APP_TAGLINE || env.VITE_APP_TAGLINE || "VEHICLE MANAGEMENT",
);
