import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { StoredAccount } from '@/types/auth';

// GET: Fetch all user accounts or authenticate
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authUsername = searchParams.get('username');
    const authPassword = searchParams.get('password');

    // Authentication check
    if (authUsername && authPassword) {
      const user = db
        .prepare('SELECT id, username, name, role, department, unit FROM users WHERE LOWER(username) = LOWER(?) AND password = ?')
        .get(authUsername.trim(), authPassword) as StoredAccount | undefined;

      if (user) {
        // Fetch user's role permissions
        let permissions = null;
        try {
          const roleRow = db.prepare('SELECT permissions FROM roles WHERE LOWER(key) = LOWER(?)').get(user.role) as any;
          if (roleRow && roleRow.permissions) {
            permissions = typeof roleRow.permissions === 'string' ? JSON.parse(roleRow.permissions) : roleRow.permissions;
          }
        } catch {}

        return NextResponse.json({
          success: true,
          user: {
            ...user,
            permissions
          }
        });
      } else {
        return NextResponse.json({ success: false, error: 'Username atau password tidak sesuai.' }, { status: 401 });
      }
    }

    // List all users
    const users = db
      .prepare('SELECT id, username, name, role, department, unit, password, created_at, updated_at FROM users ORDER BY id ASC')
      .all() as StoredAccount[];

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('API /api/users GET error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data user.' }, { status: 500 });
  }
}

// POST: Create or Update user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, username, password, name, role, department, unit, action } = body;

    if (!username || !name || !role) {
      return NextResponse.json({ success: false, error: 'Username, Nama, dan Role wajib diisi.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanRole = role.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanDept = department ? department.trim() : 'Warehouse Staff';
    const cleanUnit = unit ? unit.trim() : 'Unit 5 - Spindo';

    // 1. Update Existing User
    if (id || action === 'update') {
      let targetId = id;
      if (!targetId) {
        const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername) as { id: number } | undefined;
        if (!existing) {
          return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
        }
        targetId = existing.id;
      }

      if (password && password.trim() !== '') {
        db.prepare(`
          UPDATE users
          SET username = ?, name = ?, role = ?, department = ?, unit = ?, password = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(cleanUsername, cleanName, cleanRole, cleanDept, cleanUnit, password.trim(), targetId);
      } else {
        db.prepare(`
          UPDATE users
          SET username = ?, name = ?, role = ?, department = ?, unit = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(cleanUsername, cleanName, cleanRole, cleanDept, cleanUnit, targetId);
      }

      const updatedUser = db.prepare('SELECT id, username, name, role, department, unit, created_at, updated_at FROM users WHERE id = ?').get(targetId);
      return NextResponse.json({ success: true, message: 'Data user berhasil diperbarui.', user: updatedUser });
    }

    // 2. Create New User
    if (!password || password.trim() === '') {
      return NextResponse.json({ success: false, error: 'Password wajib diisi untuk user baru.' }, { status: 400 });
    }

    const checkExisting = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (checkExisting) {
      return NextResponse.json({ success: false, error: `Username "${cleanUsername}" sudah digunakan.` }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO users (username, password, name, role, department, unit)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cleanUsername, password.trim(), cleanName, cleanRole, cleanDept, cleanUnit);

    const newUser = db.prepare('SELECT id, username, name, role, department, unit, created_at, updated_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ success: true, message: 'User baru berhasil ditambahkan.', user: newUser });
  } catch (error) {
    console.error('API /api/users POST error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses data user.' }, { status: 500 });
  }
}

// DELETE: Remove a user
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const username = searchParams.get('username');

    if (!id && !username) {
      return NextResponse.json({ success: false, error: 'ID atau username user wajib disertakan.' }, { status: 400 });
    }

    let userToDelete: { id: number; username: string; role: string } | undefined;
    if (id) {
      userToDelete = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as any;
    } else if (username) {
      userToDelete = db.prepare('SELECT id, username, role FROM users WHERE LOWER(username) = ?').get(username.trim().toLowerCase()) as any;
    }

    if (!userToDelete) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }

    // Protect master default admin
    if (userToDelete.username === 'admin') {
      return NextResponse.json({ success: false, error: 'User master "admin" tidak dapat dihapus.' }, { status: 403 });
    }

    // Check minimum 1 admin remaining
    if (userToDelete.role === 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
      if (adminCount.count <= 1) {
        return NextResponse.json({ success: false, error: 'Sistem harus memiliki minimal 1 Administrator.' }, { status: 403 });
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userToDelete.id);
    return NextResponse.json({ success: true, message: `User "${userToDelete.username}" berhasil dihapus.` });
  } catch (error) {
    console.error('API /api/users DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus user.' }, { status: 500 });
  }
}
