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
 * Mendapatkan daftar staf/teknisi untuk dropdown penugasan (Hanya Admin / Supervisor)
 */
router.get('/users', requireAuth, requireRole(['admin', 'supervisor']), async (_req, res) => {
  try {
    const users = await executeQuery<any>(
      'SELECT id, username, name, email, role, department, phone, status, created_at FROM users ORDER BY name ASC'
    );
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
