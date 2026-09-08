import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { CustomRole, PRESET_ROLES } from '@/types/auth';

// GET: Fetch all roles
export async function GET() {
  try {
    const rawRoles = db
      .prepare('SELECT id, key, name, description, color, is_system, permissions, created_at, updated_at FROM roles ORDER BY id ASC')
      .all() as any[];

    const roles: CustomRole[] = rawRoles.map((r) => {
      let perms = {};
      try {
        perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
      } catch {}
      return {
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description || '',
        color: r.color || 'slate',
        isSystem: Boolean(r.is_system),
        permissions: perms as any,
        created_at: r.created_at,
        updated_at: r.updated_at
      };
    });

    return NextResponse.json({ success: true, roles });
  } catch (error) {
    console.error('API /api/roles GET error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data roles.', fallback: PRESET_ROLES }, { status: 500 });
  }
}

// POST: Create or Update role
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, key, name, description, color, permissions, action } = body;

    if (!key || !name) {
      return NextResponse.json({ success: false, error: 'Kode Role (Key) dan Nama Role wajib diisi.' }, { status: 400 });
    }

    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const cleanName = name.trim();
    const cleanDesc = description ? description.trim() : '';
    const cleanColor = color || 'slate';
    const permsJson = JSON.stringify(permissions || {});

    // 1. Update Existing Role
    if (id || action === 'update') {
      let targetId = id;
      if (!targetId) {
        const existing = db.prepare('SELECT id, is_system FROM roles WHERE LOWER(key) = ?').get(cleanKey) as any;
        if (!existing) {
          return NextResponse.json({ success: false, error: 'Role tidak ditemukan.' }, { status: 404 });
        }
        targetId = existing.id;
      }

      db.prepare(`
        UPDATE roles
        SET name = ?, description = ?, color = ?, permissions = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cleanName, cleanDesc, cleanColor, permsJson, targetId);

      const updated = db.prepare('SELECT id, key, name, description, color, is_system, permissions FROM roles WHERE id = ?').get(targetId) as any;
      return NextResponse.json({
        success: true,
        message: `Role "${cleanName}" berhasil diperbarui.`,
        role: {
          ...updated,
          isSystem: Boolean(updated.is_system),
          permissions: JSON.parse(updated.permissions)
        }
      });
    }

    // 2. Create New Custom Role
    const checkExisting = db.prepare('SELECT id FROM roles WHERE LOWER(key) = ?').get(cleanKey);
    if (checkExisting) {
      return NextResponse.json({ success: false, error: `Kode role "${cleanKey}" sudah digunakan.` }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO roles (key, name, description, color, is_system, permissions)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(cleanKey, cleanName, cleanDesc, cleanColor, permsJson);

    const newRole = db.prepare('SELECT id, key, name, description, color, is_system, permissions FROM roles WHERE id = ?').get(result.lastInsertRowid) as any;
    return NextResponse.json({
      success: true,
      message: `Role baru "${cleanName}" berhasil dibuat.`,
      role: {
        ...newRole,
        isSystem: Boolean(newRole.is_system),
        permissions: JSON.parse(newRole.permissions)
      }
    });
  } catch (error) {
    console.error('API /api/roles POST error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses data role.' }, { status: 500 });
  }
}

// DELETE: Remove a custom role
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const id = searchParams.get('id');

    if (!key && !id) {
      return NextResponse.json({ success: false, error: 'Kode role atau ID wajib disertakan.' }, { status: 400 });
    }

    let roleToDelete: any;
    if (id) {
      roleToDelete = db.prepare('SELECT id, key, name, is_system FROM roles WHERE id = ?').get(id);
    } else if (key) {
      roleToDelete = db.prepare('SELECT id, key, name, is_system FROM roles WHERE LOWER(key) = ?').get(key.trim().toLowerCase());
    }

    if (!roleToDelete) {
      return NextResponse.json({ success: false, error: 'Role tidak ditemukan.' }, { status: 404 });
    }

    // Protect system roles (admin, staff)
    if (roleToDelete.is_system || roleToDelete.key === 'admin' || roleToDelete.key === 'staff') {
      return NextResponse.json({ success: false, error: 'Role bawaan sistem tidak dapat dihapus.' }, { status: 403 });
    }

    // Check if any active user is assigned to this role
    const assignedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(roleToDelete.key) as { count: number };
    if (assignedUsers && assignedUsers.count > 0) {
      return NextResponse.json({
        success: false,
        error: `Role "${roleToDelete.name}" masih digunakan oleh ${assignedUsers.count} pengguna. Alihkan role pengguna tersebut terlebih dahulu.`
      }, { status: 400 });
    }

    db.prepare('DELETE FROM roles WHERE id = ?').run(roleToDelete.id);
    return NextResponse.json({ success: true, message: `Role "${roleToDelete.name}" berhasil dihapus.` });
  } catch (error) {
    console.error('API /api/roles DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus role.' }, { status: 500 });
  }
}
