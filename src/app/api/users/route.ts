import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import db from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { StoredAccount } from '@/types/auth';
import {
  hashPassword,
  isAuthContext,
  rejectCrossOrigin,
  requirePermission,
} from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getUsersFilePath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, 'users.json');
}

function readUsersFromJson(): StoredAccount[] {
  try {
    const filePath = getUsersFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to read users from JSON:', e);
  }
  return [];
}

function writeUsersToJson(users: StoredAccount[]) {
  try {
    const filePath = getUsersFilePath();
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write users to JSON:', e);
  }
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'canManageUsers');
  if (!isAuthContext(auth)) return auth;

  try {
    if (isSupabaseConfigured && supabase) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, name, role, department, unit, created_at, updated_at')
        .order('id', { ascending: true });
      const safeUsers = (users || []).map((u) => ({ ...u, password: '••••••••' }));
      return NextResponse.json({ success: true, users: safeUsers });
    }

    if (db && typeof db.prepare === 'function') {
      try {
        const users = db
          .prepare(
            'SELECT id, username, name, role, department, unit, created_at, updated_at FROM users ORDER BY id ASC'
          )
          .all();
        const safeUsers = (users || []).map((u: any) => ({ ...u, password: '••••••••' }));
        return NextResponse.json({ success: true, users: safeUsers });
      } catch (err) {
        console.warn('SQLite list users error, using JSON file fallback:', err);
      }
    }

    const users = readUsersFromJson();
    const safeUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      department: u.department,
      unit: u.unit,
      created_at: u.created_at || new Date().toISOString(),
      updated_at: u.updated_at || new Date().toISOString(),
      password: '••••••••',
    }));
    return NextResponse.json({ success: true, users: safeUsers });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Gagal mengambil data user: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const auth = await requirePermission(request, 'canManageUsers');
  if (!isAuthContext(auth)) return auth;

  try {
    const body = await request.json();
    const { id, username, password, name, role, department, unit, action } = body;
    if (!username || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Username, Nama, dan Role wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanRole = role.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanDept = department ? department.trim() : 'Warehouse Staff';
    const cleanUnit = unit ? unit.trim() : 'Unit 5 - Spindo';

    if (isSupabaseConfigured && supabase) {
      if (id || action === 'update') {
        const payload: any = {
          username: cleanUsername,
          name: cleanName,
          role: cleanRole,
          department: cleanDept,
          unit: cleanUnit,
          updated_at: new Date().toISOString(),
        };
        if (password && password.trim() !== '') {
          payload.password = hashPassword(password.trim());
        }

        let targetId = id;
        if (!targetId) {
          targetId = (
            await supabase.from('users').select('id').eq('username', cleanUsername).single()
          ).data?.id;
        }

        const { error } = await supabase.from('users').update(payload).eq('id', targetId);
        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Data user berhasil diperbarui.' });
      }

      if (!password || password.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Password wajib diisi untuk user baru.' },
          { status: 400 }
        );
      }
      const check = await supabase
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();
      if (check.data) {
        return NextResponse.json(
          { success: false, error: `Username "${cleanUsername}" sudah digunakan.` },
          { status: 400 }
        );
      }

      const { error } = await supabase.from('users').insert([
        {
          username: cleanUsername,
          password: hashPassword(password.trim()),
          name: cleanName,
          role: cleanRole,
          department: cleanDept,
          unit: cleanUnit,
        },
      ]);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'User baru berhasil ditambahkan.' });
    }

    if (db && typeof db.prepare === 'function') {
      try {
        if (id || action === 'update') {
          const targetId =
            id ||
            (
              db
                .prepare('SELECT id FROM users WHERE LOWER(username) = ?')
                .get(cleanUsername) as any
            )?.id;
          if (password && password.trim() !== '') {
            db.prepare(
              `UPDATE users SET username=?, name=?, role=?, department=?, unit=?, password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
            ).run(
              cleanUsername,
              cleanName,
              cleanRole,
              cleanDept,
              cleanUnit,
              hashPassword(password.trim()),
              targetId
            );
          } else {
            db.prepare(
              `UPDATE users SET username=?, name=?, role=?, department=?, unit=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
            ).run(cleanUsername, cleanName, cleanRole, cleanDept, cleanUnit, targetId);
          }
          return NextResponse.json({ success: true, message: 'Data user berhasil diperbarui.' });
        }

        if (!password || password.trim() === '') {
          return NextResponse.json(
            { success: false, error: 'Password wajib diisi.' },
            { status: 400 }
          );
        }
        if (db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername)) {
          return NextResponse.json(
            { success: false, error: `Username "${cleanUsername}" sudah digunakan.` },
            { status: 400 }
          );
        }
        db.prepare(
          `INSERT INTO users (username, password, name, role, department, unit) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          cleanUsername,
          hashPassword(password.trim()),
          cleanName,
          cleanRole,
          cleanDept,
          cleanUnit
        );
        return NextResponse.json({ success: true, message: 'User baru berhasil ditambahkan.' });
      } catch (err) {
        console.warn('SQLite user save error, using JSON file fallback:', err);
      }
    }

    const users = readUsersFromJson();
    if (id || action === 'update') {
      const idx = users.findIndex(
        (u) => (id && u.id === id) || u.username.toLowerCase() === cleanUsername
      );
      if (idx === -1) {
        return NextResponse.json(
          { success: false, error: 'User tidak ditemukan.' },
          { status: 404 }
        );
      }
      users[idx] = {
        ...users[idx],
        username: cleanUsername,
        name: cleanName,
        role: cleanRole,
        department: cleanDept,
        unit: cleanUnit,
        updated_at: new Date().toISOString(),
      };
      if (password && password.trim() !== '') {
        users[idx].password = hashPassword(password.trim());
      }
      writeUsersToJson(users);
      return NextResponse.json({ success: true, message: 'Data user berhasil diperbarui.' });
    }

    if (!password || password.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Password wajib diisi.' },
        { status: 400 }
      );
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return NextResponse.json(
        { success: false, error: `Username "${cleanUsername}" sudah digunakan.` },
        { status: 400 }
      );
    }

    const newUser: StoredAccount = {
      id: Date.now(),
      username: cleanUsername,
      password: hashPassword(password.trim()),
      name: cleanName,
      role: cleanRole,
      department: cleanDept,
      unit: cleanUnit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    users.push(newUser);
    writeUsersToJson(users);

    return NextResponse.json({ success: true, message: 'User baru berhasil ditambahkan.' });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Gagal memproses data user: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const auth = await requirePermission(request, 'canManageUsers');
  if (!isAuthContext(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const username = searchParams.get('username');
    if (!id && !username) {
      return NextResponse.json(
        { success: false, error: 'ID atau username wajib disertakan.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabase) {
      const userToDelete = id
        ? (await supabase.from('users').select('id, username, role').eq('id', id).single()).data
        : (
            await supabase
              .from('users')
              .select('id, username, role')
              .ilike('username', username!)
              .single()
          ).data;
      if (!userToDelete) {
        return NextResponse.json(
          { success: false, error: 'User tidak ditemukan.' },
          { status: 404 }
        );
      }
      if (userToDelete.username === 'admin') {
        return NextResponse.json(
          { success: false, error: 'User master "admin" tidak dapat dihapus.' },
          { status: 403 }
        );
      }
      if (userToDelete.role === 'admin') {
        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('role', 'admin');
        if (count && count <= 1) {
          return NextResponse.json(
            { success: false, error: 'Minimal 1 Administrator.' },
            { status: 403 }
          );
        }
      }
      await supabase.from('users').delete().eq('id', userToDelete.id);
      return NextResponse.json({
        success: true,
        message: `User "${userToDelete.username}" berhasil dihapus.`,
      });
    }

    if (db && typeof db.prepare === 'function') {
      try {
        const userToDelete = id
          ? (db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as any)
          : (db
              .prepare('SELECT id, username, role FROM users WHERE LOWER(username) = ?')
              .get(username!.trim().toLowerCase()) as any);
        if (!userToDelete) {
          return NextResponse.json(
            { success: false, error: 'User tidak ditemukan.' },
            { status: 404 }
          );
        }
        if (userToDelete.username === 'admin') {
          return NextResponse.json(
            { success: false, error: 'User master "admin" tidak dapat dihapus.' },
            { status: 403 }
          );
        }
        if (userToDelete.role === 'admin') {
          const adminCount = db
            .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
            .get() as any;
          if (adminCount.count <= 1) {
            return NextResponse.json(
              { success: false, error: 'Minimal 1 Administrator.' },
              { status: 403 }
            );
          }
        }
        db.prepare('DELETE FROM users WHERE id = ?').run(userToDelete.id);
        return NextResponse.json({
          success: true,
          message: `User "${userToDelete.username}" berhasil dihapus.`,
        });
      } catch (err) {
        console.warn('SQLite user delete error, using JSON file fallback:', err);
      }
    }

    const users = readUsersFromJson();
    const userToDelete = users.find(
      (u) =>
        (id && String(u.id) === String(id)) ||
        (username && u.username.toLowerCase() === username.trim().toLowerCase())
    );
    if (!userToDelete) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan.' },
        { status: 404 }
      );
    }
    if (userToDelete.username === 'admin') {
      return NextResponse.json(
        { success: false, error: 'User master "admin" tidak dapat dihapus.' },
        { status: 403 }
      );
    }
    if (userToDelete.role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Minimal 1 Administrator.' },
          { status: 403 }
        );
      }
    }

    const filtered = users.filter((u) => u.id !== userToDelete.id);
    writeUsersToJson(filtered);
    return NextResponse.json({
      success: true,
      message: `User "${userToDelete.username}" berhasil dihapus.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Gagal menghapus user: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      },
      { status: 500 }
    );
  }
}
