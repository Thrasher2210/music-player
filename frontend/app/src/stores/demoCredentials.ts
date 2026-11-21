const PASSWORD_LENGTH = 24;
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
// Largest multiple of the alphabet size that fits in a byte, so every character is equally likely
const BYTE_LIMIT = 256 - (256 % PASSWORD_ALPHABET.length);

export interface DemoCredentials {
  name: string;
  email: string;
  password: string;
}

function randomPassword(): string {
  let password = '';
  while (password.length < PASSWORD_LENGTH) {
    for (const byte of globalThis.crypto.getRandomValues(new Uint8Array(PASSWORD_LENGTH))) {
      if (byte < BYTE_LIMIT && password.length < PASSWORD_LENGTH) {
        password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
      }
    }
  }
  return password;
}

/** Throwaway credentials for the one-click demo account. Never reused, never shown. */
export function createDemoCredentials(): DemoCredentials {
  return {
    name: 'GaneGan Listener',
    email: `demo-${globalThis.crypto.randomUUID()}@ganegan.app`,
    password: randomPassword(),
  };
}
