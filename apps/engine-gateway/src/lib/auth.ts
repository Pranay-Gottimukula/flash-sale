import { createSigner, createVerifier } from 'fast-jwt';

const secret = process.env.AUTH_JWT_SECRET ?? 'change-me-in-production';

export interface AuthTokenPayload {
  sub:   string;
  email: string;
  role:  string;
  iat?:  number;
  exp?:  number;
}

const signer = createSigner({
  algorithm: 'HS256',
  key:       secret,
  expiresIn: 7 * 24 * 60 * 60 * 1000,
});

const verifier = createVerifier({
  algorithms: ['HS256'],
  key:        secret,
});

export function signAuthToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string {
  return signer(payload) as string;
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return verifier(token) as AuthTokenPayload;
}
