// src/lib/auth.ts
// Módulo central de autenticação — JWT + Bcrypt + TOTP (Google Authenticator)
// ⚠️ Este arquivo usa Node.js APIs (bcryptjs) — NÃO importar no Edge Runtime (middleware).
//    Para verificação JWT no middleware, usar jose diretamente.

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';

// ============================================
// TIPOS
// ============================================

export interface AuthPayload extends JWTPayload {
  sub: string;
  email: string;
  role: string;
  type: 'session' | 'mfa_pending';
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  nome: string | null;
  avatar_url: string | null;
  empresa: string | null;
  cargo: string | null;
  mfa_enabled: boolean;
}

// ============================================
// CONSTANTES
// ============================================

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';
const MFA_TOKEN_EXPIRES_IN = '5m';
const COOKIE_NAME = 'atelier_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias em segundos

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    || 'atelier-jwt-secret-production-fallback-2026';
  return new TextEncoder().encode(secret);
}

// ============================================
// SENHA (BCRYPT)
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// JWT
// ============================================

export async function generateToken(
  payload: { sub: string; email: string; role: string },
  type: 'session' | 'mfa_pending' = 'session'
): Promise<string> {
  const expiresIn = type === 'mfa_pending' ? MFA_TOKEN_EXPIRES_IN : JWT_EXPIRES_IN;

  return new SignJWT({ ...payload, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as AuthPayload;
}

// ============================================
// COOKIE HELPERS
// ============================================

export { COOKIE_NAME, COOKIE_MAX_AGE };

export function getSessionCookieOptions(isProduction: boolean = process.env.NODE_ENV === 'production') {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

// ============================================
// MFA / TOTP (Google Authenticator)
// ============================================

export function generateMfaSecret(email: string): { secret: string; uri: string } {
  const totp = new TOTP({
    issuer: 'Atelier',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new Secret(),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyMfaCode(secret: string, code: string): boolean {
  const totp = new TOTP({
    issuer: 'Atelier',
    label: 'verify',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });

  // window: 1 permite códigos do período anterior/seguinte (±30s de tolerância)
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

export async function generateMfaQrCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 280,
    margin: 2,
    color: {
      dark: '#4A3728',   // cor do grafite do Atelier
      light: '#FFFFFF',
    },
  });
}
