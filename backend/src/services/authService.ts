/**
 * Authentication Service (Server-Authoritative)
 * FieldOps IT Inventory Rebuild
 */

import crypto from 'crypto';
import { executeQuery } from '../db/database';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'technician' | 'admin' | 'supervisor' | 'superadmin';
  department: string;
  phone: string;
  status: string;
}

// In-memory rate limiter for login brute force prevention
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export class AuthService {
  /**
   * Menghasilkan hash PBKDF2 SHA-256 100.000 iterasi + 16-byte random salt
   */
  static hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
    const salt = customSalt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return { hash, salt };
  }

  /**
   * Verifikasi kata sandi dengan salt
   */
  static verifyPassword(passwordAttempt: string, salt: string, storedHash: string): boolean {
    const attemptHash = crypto.pbkdf2Sync(passwordAttempt, salt, 100000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(attemptHash, 'hex'), Buffer.from(storedHash, 'hex'));
  }

  /**
   * Login user dengan pengecekan brute force rate limit
   */
  static async login(username: string, passwordAttempt: string, clientIp: string, userAgent: string): Promise<{ success: boolean; message: string; sessionToken?: string; user?: UserProfile }> {
    // Periksa apakah akun/IP sedang dikunci sementara
    const rateLimitKey = `${clientIp}_${username.toLowerCase()}`;
    const attemptInfo = loginAttempts.get(rateLimitKey);

    if (attemptInfo && attemptInfo.lockedUntil > Date.now()) {
      const waitMinutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
      return {
        success: false,
        message: `Terlalu banyak percobaan gagal. Akun/IP dikunci sementara selama ${waitMinutes} menit.`
      };
    }

    // Ambil data user dari tabel users (file skema akun)
    const users = await executeQuery<any>('SELECT * FROM users WHERE username = ?', [username]);
    const user = users[0];

    if (!user) {
      this.recordFailedAttempt(rateLimitKey);
      return { success: false, message: 'Username atau kata sandi tidak cocok.' };
    }

    if (user.status !== 'ACTIVE') {
      return { success: false, message: `Akun berstatus ${user.status}. Hubungi Supervisor untuk aktivasi.` };
    }

    // Verifikasi hash di server
    const isValid = this.verifyPassword(passwordAttempt, user.salt, user.password_hash);
    if (!isValid) {
      this.recordFailedAttempt(rateLimitKey);
      return { success: false, message: 'Username atau kata sandi tidak cocok.' };
    }

    // Login sukses: reset batas percobaan
    loginAttempts.delete(rateLimitKey);

    // Buat session ID 32-byte acak
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 hari

    await executeQuery(
      'INSERT INTO sessions (session_id, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [sessionId, user.id, clientIp, userAgent, expiresAt.toISOString()]
    );

    const profile: UserProfile = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone || '',
      status: user.status
    };

    return {
      success: true,
      message: 'Login berhasil.',
      sessionToken: sessionId,
      user: profile
    };
  }

  /**
   * Catat kegagalan login untuk proteksi brute force (5 kali gagal = kunci 15 menit)
   */
  private static recordFailedAttempt(key: string) {
    const current = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 menit lockout
    }
    loginAttempts.set(key, current);
  }

  /**
   * Validasi token sesi dari cookie HTTP
   */
  static async validateSession(sessionId: string): Promise<UserProfile | null> {
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 32) return null;

    const sessions = await executeQuery<any>('SELECT * FROM sessions WHERE session_id = ?', [sessionId]);
    const session = sessions[0];
    if (!session) return null;

    if (new Date(session.expires_at).getTime() < Date.now()) {
      await executeQuery('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
      return null;
    }

    const users = await executeQuery<any>('SELECT * FROM users WHERE id = ?', [session.user_id]);
    const user = users[0];
    if (!user || user.status !== 'ACTIVE') return null;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone || '',
      status: user.status
    };
  }

  /**
   * Logout user dan hapus sesi dari database
   */
  static async logout(sessionId: string): Promise<void> {
    if (sessionId) {
      await executeQuery('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
    }
  }
}
