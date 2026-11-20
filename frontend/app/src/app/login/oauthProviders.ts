export const OAUTH_PROVIDER_IDS = ['google', 'github', 'apple', 'discord'] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDER_IDS)[number];

/** Parses a comma separated provider list. Unset means Google only, empty means none. */
export function parseOAuthProviders(raw: string | undefined): OAuthProvider[] {
  const wanted = (raw ?? 'google').split(',').map((id) => id.trim().toLowerCase());
  return OAUTH_PROVIDER_IDS.filter((id) => wanted.includes(id));
}

/** Providers configured on the API, set with NEXT_PUBLIC_OAUTH_PROVIDERS at build time. */
export const enabledOAuthProviders = parseOAuthProviders(process.env.NEXT_PUBLIC_OAUTH_PROVIDERS);
