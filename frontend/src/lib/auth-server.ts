import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, type AuthPayload } from './auth';

export async function getAuthUser(): Promise<AuthPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return null;
    return payload;
  } catch (error) {
    return null;
  }
}
