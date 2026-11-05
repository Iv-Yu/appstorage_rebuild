/**
 * Auth Router (Server-Authoritative Endpoints)
 * FieldOps IT Inventory Rebuild
 */

import express from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/authMiddleware';
import { executeQuery } from '../db/database';

const router = express.Router();

/**
 * POST /api/auth/login
 * Memverifikasi username dan password di backend, mengeluarkan cookie httpOnly
 */
router.post('/login', async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan kata sandi wajib diisi.'
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Client';

    const result = await AuthService.login(String(username).trim(), String(password), clientIp, userAgent);

    if (!result.success || !result.sessionToken) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    // Set secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      `fieldops_session=${result.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${isProduction ? '; Secure' : ''}`
    );

    return res.json({
      success: true,
      message: 'Login berhasil.',
      user: result.user,
      token: result.sessionToken // Untuk kemudahan client jika cookie ditolak iFrame preview
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat proses autentikasi.' });
  }
});

/**
 * POST /api/auth/register
 * Pendaftaran akun pengguna internal kantor (langsung aktif dan login otomatis)
 */
router.post('/register', async (req: express.Request, res: express.Response) => {
  try {
    const { username, name, email, role, department, phone, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan kata sandi wajib diisi.'
      });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const cleanName = name ? String(name).trim() : cleanUsername;
    const cleanEmail = email ? String(email).trim() : `${cleanUsername.toLowerCase()}@fieldops.local`;

    const existing = await executeQuery<any>(
      'SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?) OR LOWER(TRIM(email)) = LOWER(?)',
      [cleanUsername, cleanEmail]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" atau email sudah terdaftar. Silakan langsung masuk.`
      });
    }

    const validRole = ['technician', 'admin', 'supervisor', 'superadmin'].includes(role) ? role : 'admin';
    const userId = `usr-${Date.now()}`;
    const { hash, salt } = AuthService.hashPassword(cleanPassword);

    await executeQuery(
      `INSERT INTO users (id, username, name, email, role, department, phone, password_hash, salt, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, cleanUsername, cleanName, cleanEmail, validRole, department || 'IT Operations', phone || '', hash, salt, 'ACTIVE']
    );

    // Auto-login setelah registrasi
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Client';
    const loginResult = await AuthService.login(cleanUsername, cleanPassword, clientIp, userAgent);

    if (loginResult.success && loginResult.sessionToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.setHeader(
        'Set-Cookie',
        `fieldops_session=${loginResult.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${isProduction ? '; Secure' : ''}`
      );
    }

    return res.json({
      success: true,
      message: `Akun "${cleanUsername}" berhasil dibuat dan siap digunakan!`,
      user: loginResult.user || { id: userId, username: cleanUsername, name: cleanName, role: validRole },
      token: loginResult.sessionToken
    });
  } catch (err: any) {
    console.error('[Register User Error]:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun pengguna baru.' });
  }
});

/**
 * GET /api/auth/me
 * Mengambil profil pengguna aktif dari sesi terverifikasi server
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: express.Response) => {
  return res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Menghapus sesi dari database dan mereset cookie
 */
router.post('/logout', async (req: AuthenticatedRequest, res: express.Response) => {
  if (req.sessionId) {
    await AuthService.logout(req.sessionId);
  }

  res.setHeader('Set-Cookie', 'fieldops_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
  return res.json({
    success: true,
    message: 'Logout berhasil. Sesi telah dimusnahkan.'
  });
});

/**
 * GET /api/auth/users
 * Mendapatkan daftar staf/teknisi untuk dropdown penugasan (Hanya Admin / Supervisor / Superadmin)
 */
router.get('/users', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (_req, res) => {
  try {
    const users = await executeQuery<any>(
      'SELECT id, username, name, email, role, department, phone, status, created_at FROM users ORDER BY name ASC'
    );
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/users
 * Membuat akun pengguna baru dengan password hashing PBKDF2
 */
router.post('/users', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { username, name, email, role, department, phone, password } = req.body;

    if (!username || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, nama, email, dan kata sandi wajib diisi.'
      });
    }

    const validRole = ['technician', 'admin', 'supervisor', 'superadmin'].includes(role) ? role : 'technician';
    const existing = await executeQuery<any>('SELECT id FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Username "${username}" atau email "${email}" sudah digunakan.`
      });
    }

    const userId = `usr-${Date.now()}`;
    const { hash, salt } = AuthService.hashPassword(password);

    await executeQuery(
      `INSERT INTO users (id, username, name, email, role, department, phone, password_hash, salt, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [userId, username.trim(), name.trim(), email.trim(), validRole, department || 'IT Operations', phone || '', hash, salt]
    );

    return res.json({
      success: true,
      message: `Akun ${username} berhasil dibuat.`,
      user: { id: userId, username, name, email, role: validRole, department, phone, status: 'ACTIVE' }
    });
  } catch (err: any) {
    console.error('[Create User Error]:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun pengguna.' });
  }
});

export default router;
