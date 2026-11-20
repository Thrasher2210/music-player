import { parseAppOrigins } from "./origins";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const APP_ORIGINS = parseAppOrigins(env?.VITE_APP_ORIGINS);
