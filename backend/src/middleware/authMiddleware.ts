/**
 * Authentication & RBAC Middleware
 * FieldOps IT Inventory Rebuild
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService, UserProfile } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  sessionId?: string;
}

/**
 * Helper untuk parsing cookie tanpa dependensi tambahan
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    if (name) {
      cookies[name] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });

  return cookies;
}

/**
 * Middleware untuk mengekstrak dan memvalidasi sesi server dari Cookie atau Header Bearer
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const sessionId = cookies['fieldops_session'] || bearerToken;

  if (!sessionId) {
    return next();
  }

  try {
    const user = await AuthService.validateSession(sessionId);
    if (user) {
      req.user = user;
      req.sessionId = sessionId;
    }
  } catch (err) {
    console.warn('[Auth Middleware Warning]:', err);
  }

  next();
}

/**
 * Middleware wajib login
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak: Anda harus login terlebih dahulu.'
    });
  }
  next();
}

/**
 * Middleware penegakan hak akses peran (RBAC) di sisi server
 */
export function requireRole(allowedRoles: Array<'technician' | 'warehouse_admin' | 'admin' | 'supervisor' | 'developer' | 'superadmin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak: Sesi tidak terautentikasi.'
      });
    }

    // Role Developer dan Admin (Boss) mempunyai hak akses penuh ke seluruh rute & fitur sistem!
    if (req.user.role === 'developer' || req.user.role === 'admin' || (req.user.role as any) === 'superadmin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Hak akses tidak memadai: Diperlukan peran [${allowedRoles.join('/')}], peran Anda adalah ${req.user.role}.`
      });
    }

    next();
  };
}
