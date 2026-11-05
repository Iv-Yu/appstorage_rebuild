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
/**
 * POST /api/auth/register
 * Pendaftaran akun pengguna internal kantor (Role di bawah admin/developer, memerlukan persetujuan)
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

    const requestedRole = String(role || '').toLowerCase();

    // Invarian: Akun Admin dan Developer HANYA bisa dibuat di sisi server
    if (['admin', 'developer', 'superadmin'].includes(requestedRole)) {
      return res.status(403).json({
        success: false,
        message: 'Akun Admin dan Developer hanya dapat dibuat di sisi server melalui terminal/setup (npm run setup:admin).'
      });
    }

    // Role yang diizinkan untuk registrasi mandiri adalah role di bawah admin & developer
    const validRole = ['warehouse_admin', 'technician'].includes(requestedRole) ? requestedRole : 'technician';

    const existing = await executeQuery<any>(
      'SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?) OR LOWER(TRIM(email)) = LOWER(?)',
      [cleanUsername, cleanEmail]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" atau email sudah terdaftar.`
      });
    }

    const userId = `usr-${Date.now()}`;
    const { hash, salt } = AuthService.hashPassword(cleanPassword);

    // Akun baru berstatus PENDING_APPROVAL dan memerlukan persetujuan Admin/Developer
    await executeQuery(
      `INSERT INTO users (id, username, name, email, role, department, phone, password_hash, salt, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, cleanUsername, cleanName, cleanEmail, validRole, department || 'IT Operations', phone || '', hash, salt, 'PENDING_APPROVAL']
    );

    return res.json({
      success: true,
      requiresApproval: true,
      status: 'PENDING_APPROVAL',
      message: `Pendaftaran berhasil! Akun "${cleanUsername}" sedang menunggu persetujuan dari Admin sebelum dapat masuk.`,
      user: { id: userId, username: cleanUsername, name: cleanName, role: validRole, status: 'PENDING_APPROVAL' }
    });
  } catch (err: any) {
    console.error('[Register User Error]:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengajukan pendaftaran akun pengguna baru.' });
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
 * Mendapatkan daftar seluruh pengguna (Akses: Developer & Admin)
 */
router.get('/users', requireAuth, requireRole(['developer', 'admin']), async (_req, res) => {
  try {
    const users = await executeQuery<any>(
      'SELECT id, username, name, email, role, department, phone, status, created_at FROM users ORDER BY created_at DESC'
    );
    // Normalisasi role superadmin ke developer jika ada
    const normalized = (users || []).map((u: any) => ({
      ...u,
      role: u.role === 'superadmin' ? 'developer' : u.role
    }));
    return res.json({ success: true, users: normalized });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/users/:id/approve
 * Menyetujui akun baru yang menunggu persetujuan (Akses: Developer & Admin)
 */
router.post('/users/:id/approve', requireAuth, requireRole(['developer', 'admin']), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.params.id;
    const users = await executeQuery<any>('SELECT id, username, name, role, status FROM users WHERE id = ?', [userId]);
    const targetUser = users && users[0];

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    await executeQuery('UPDATE users SET status = ? WHERE id = ?', ['ACTIVE', userId]);

    return res.json({
      success: true,
      message: `Akun "${targetUser.username}" (${targetUser.name}) berhasil disetujui dan kini AKTIF.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/users/:id/reject
 * Menolak pendaftaran akun (Akses: Developer & Admin)
 */
router.post('/users/:id/reject', requireAuth, requireRole(['developer', 'admin']), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.params.id;
    const users = await executeQuery<any>('SELECT id, username, name FROM users WHERE id = ?', [userId]);
    const targetUser = users && users[0];

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    await executeQuery('UPDATE users SET status = ? WHERE id = ?', ['REJECTED', userId]);

    return res.json({
      success: true,
      message: `Pendaftaran akun "${targetUser.username}" telah ditolak.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/users/:id/status
 * Memperbarui status akun (ACTIVE, SUSPENDED, PENDING_APPROVAL, REJECTED)
 */
router.post('/users/:id/status', requireAuth, requireRole(['developer', 'admin']), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid.' });
    }

    if (req.user?.id === userId && status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Dilarang menonaktifkan status akun Anda sendiri.' });
    }

    await executeQuery('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

    return res.json({
      success: true,
      message: `Status pengguna berhasil diperbarui menjadi ${status}.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Menghapus akun pengguna (Akses: Developer & Admin)
 */
router.delete('/users/:id', requireAuth, requireRole(['developer', 'admin']), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.params.id;

    if (req.user?.id === userId) {
      return res.status(400).json({ success: false, message: 'Dilarang menghapus akun Anda sendiri saat sedang login.' });
    }

    const users = await executeQuery<any>('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    const target = users && users[0];
    if (!target) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    // Admin tidak boleh menghapus akun Developer
    if (target.role === 'developer' && req.user?.role !== 'developer') {
      return res.status(403).json({ success: false, message: 'Hanya peran Developer yang dapat mengelola akun Developer.' });
    }

    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      message: `Akun "${target.username}" berhasil dihapus secara permanen.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/users
 * Membuat akun pengguna baru langsung dari dasbor internal (Akses: Developer & Admin)
 */
router.post('/users', requireAuth, requireRole(['developer', 'admin']), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { username, name, email, role, department, phone, password, status } = req.body;

    if (!username || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, nama, email, dan kata sandi wajib diisi.'
      });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim();
    let targetRole = role || 'technician';

    // Pembatasan: Hanya Developer yang bisa membuat akun Developer lain dari UI
    if (targetRole === 'developer' && req.user?.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: 'Hanya Developer yang dapat membuat akun dengan peran Developer.'
      });
    }

    const validRoles = ['technician', 'warehouse_admin', 'admin', 'developer'];
    if (!validRoles.includes(targetRole)) {
      targetRole = 'technician';
    }

    const existing = await executeQuery<any>('SELECT id FROM users WHERE username = ? OR email = ?', [cleanUsername, cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" atau email "${cleanEmail}" sudah digunakan.`
      });
    }

    const userId = `usr-${Date.now()}`;
    const { hash, salt } = AuthService.hashPassword(password);
    const initialStatus = status || 'ACTIVE';

    await executeQuery(
      `INSERT INTO users (id, username, name, email, role, department, phone, password_hash, salt, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, cleanUsername, name.trim(), cleanEmail, targetRole, department || 'IT Operations', phone || '', hash, salt, initialStatus]
    );

    return res.json({
      success: true,
      message: `Akun "${cleanUsername}" (${targetRole}) berhasil dibuat.`,
      user: { id: userId, username: cleanUsername, name: name.trim(), email: cleanEmail, role: targetRole, department, phone, status: initialStatus }
    });
  } catch (err: any) {
    console.error('[Create User Error]:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat akun pengguna.' });
  }
});

export default router;
