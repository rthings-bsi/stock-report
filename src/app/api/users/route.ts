import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { StoredAccount } from '@/types/auth';

// Helper to verify and hash passwords
function verifyPassword(plain: string, hashOrPlain: string): boolean {
  if (!hashOrPlain || !plain) return false;
  // If stored value is already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (hashOrPlain.startsWith('$2a$') || hashOrPlain.startsWith('$2b$') || hashOrPlain.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(plain, hashOrPlain);
    } catch {
      return false;
    }
  }
  // Legacy plain text comparison fallback
  return plain === hashOrPlain;
}

function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authUsername = searchParams.get('username');
    const authPassword = searchParams.get('password');

    // 1. Authentication / Login check
    if (authUsername && authPassword) {
      if (isSupabaseConfigured && supabase) {
        const { data: user } = await supabase
          .from('users')
          .select('id, username, password, name, role, department, unit')
          .ilike('username', authUsername.trim())
          .maybeSingle();

        if (user && verifyPassword(authPassword, user.password)) {
          // Auto-upgrade plain-text password to bcrypt hash in DB
          if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
            const upgradedHash = hashPassword(authPassword);
            await supabase.from('users').update({ password: upgradedHash }).eq('id', user.id);
          }

          const { data: roleRow } = await supabase.from('roles').select('permissions').ilike('key', user.role).maybeSingle();
          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
              department: user.department,
              unit: user.unit,
              permissions: roleRow?.permissions || {}
            }
          });
        }
        return NextResponse.json({ success: false, error: 'Username atau password tidak sesuai.' }, { status: 401 });
      }

      if (!db) throw new Error('Database not available');
      const user = db.prepare('SELECT id, username, password, name, role, department, unit FROM users WHERE LOWER(username) = LOWER(?)').get(authUsername.trim()) as any;
      if (user && verifyPassword(authPassword, user.password)) {
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          const upgradedHash = hashPassword(authPassword);
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(upgradedHash, user.id);
        }

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
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            department: user.department,
            unit: user.unit,
            permissions
          }
        });
      }
      return NextResponse.json({ success: false, error: 'Username atau password tidak sesuai.' }, { status: 401 });
    }

    // 2. List All Users (Hide real password hash from client)
    if (isSupabaseConfigured && supabase) {
      const { data: users } = await supabase.from('users').select('id, username, name, role, department, unit, created_at, updated_at').order('id', { ascending: true });
      const safeUsers = (users || []).map(u => ({ ...u, password: '••••••••' }));
      return NextResponse.json({ success: true, users: safeUsers });
    }

    if (!db) throw new Error('Database not available');
    const users = db.prepare('SELECT id, username, name, role, department, unit, created_at, updated_at FROM users ORDER BY id ASC').all();
    const safeUsers = (users || []).map((u: any) => ({ ...u, password: '••••••••' }));
    return NextResponse.json({ success: true, users: safeUsers });
  } catch (error) {
    return NextResponse.json({ success: false, error: `Gagal mengambil data user: ${error instanceof Error ? error.message : JSON.stringify(error)}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, username, password, name, role, department, unit, action } = body;
    if (!username || !name || !role) return NextResponse.json({ success: false, error: 'Username, Nama, dan Role wajib diisi.' }, { status: 400 });

    const cleanUsername = username.trim().toLowerCase();
    const cleanRole = role.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanDept = department ? department.trim() : 'Warehouse Staff';
    const cleanUnit = unit ? unit.trim() : 'Unit 5 - Spindo';

    if (isSupabaseConfigured && supabase) {
      if (id || action === 'update') {
        const payload: any = { username: cleanUsername, name: cleanName, role: cleanRole, department: cleanDept, unit: cleanUnit, updated_at: new Date().toISOString() };
        if (password && password.trim() !== '') {
          payload.password = hashPassword(password.trim());
        }
        
        let targetId = id;
        if (!targetId) targetId = (await supabase.from('users').select('id').eq('username', cleanUsername).single()).data?.id;
        
        const { error } = await supabase.from('users').update(payload).eq('id', targetId);
        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Data user berhasil diperbarui.' });
      }

      if (!password || password.trim() === '') return NextResponse.json({ success: false, error: 'Password wajib diisi untuk user baru.' }, { status: 400 });
      const check = await supabase.from('users').select('id').eq('username', cleanUsername).maybeSingle();
      if (check.data) return NextResponse.json({ success: false, error: `Username "${cleanUsername}" sudah digunakan.` }, { status: 400 });
      
      const hashedPassword = hashPassword(password.trim());
      const { error } = await supabase.from('users').insert([{
        username: cleanUsername,
        password: hashedPassword,
        name: cleanName,
        role: cleanRole,
        department: cleanDept,
        unit: cleanUnit
      }]);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'User baru berhasil ditambahkan.' });
    }

    if (!db) throw new Error('Database not available');
    if (id || action === 'update') {
      let targetId = id || (db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername) as any)?.id;
      if (password && password.trim() !== '') {
        const hashedPassword = hashPassword(password.trim());
        db.prepare(`UPDATE users SET username=?, name=?, role=?, department=?, unit=?, password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(cleanUsername, cleanName, cleanRole, cleanDept, cleanUnit, hashedPassword, targetId);
      } else {
        db.prepare(`UPDATE users SET username=?, name=?, role=?, department=?, unit=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(cleanUsername, cleanName, cleanRole, cleanDept, cleanUnit, targetId);
      }
      return NextResponse.json({ success: true, message: 'Data user berhasil diperbarui.' });
    }
    
    if (!password || password.trim() === '') return NextResponse.json({ success: false, error: 'Password wajib diisi.' }, { status: 400 });
    if (db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername)) return NextResponse.json({ success: false, error: `Username "${cleanUsername}" sudah digunakan.` }, { status: 400 });
    const hashedPassword = hashPassword(password.trim());
    db.prepare(`INSERT INTO users (username, password, name, role, department, unit) VALUES (?, ?, ?, ?, ?, ?)`).run(cleanUsername, hashedPassword, cleanName, cleanRole, cleanDept, cleanUnit);
    return NextResponse.json({ success: true, message: 'User baru berhasil ditambahkan.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: `Gagal memproses data user: ${error instanceof Error ? error.message : JSON.stringify(error)}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const username = searchParams.get('username');
    if (!id && !username) return NextResponse.json({ success: false, error: 'ID atau username wajib disertakan.' }, { status: 400 });

    if (isSupabaseConfigured && supabase) {
      let userToDelete = id ? (await supabase.from('users').select('id, username, role').eq('id', id).single()).data : (await supabase.from('users').select('id, username, role').ilike('username', username!).single()).data;
      if (!userToDelete) return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
      if (userToDelete.username === 'admin') return NextResponse.json({ success: false, error: 'User master "admin" tidak dapat dihapus.' }, { status: 403 });
      if (userToDelete.role === 'admin') {
        const { count } = await supabase.from('users').select('id', { count: 'exact' }).eq('role', 'admin');
        if (count && count <= 1) return NextResponse.json({ success: false, error: 'Minimal 1 Administrator.' }, { status: 403 });
      }
      await supabase.from('users').delete().eq('id', userToDelete.id);
      return NextResponse.json({ success: true, message: `User "${userToDelete.username}" berhasil dihapus.` });
    }

    if (!db) throw new Error('Database not available');
    let userToDelete = id ? db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as any : db.prepare('SELECT id, username, role FROM users WHERE LOWER(username) = ?').get(username!.trim().toLowerCase()) as any;
    if (!userToDelete) return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    if (userToDelete.username === 'admin') return NextResponse.json({ success: false, error: 'User master "admin" tidak dapat dihapus.' }, { status: 403 });
    if (userToDelete.role === 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any;
      if (adminCount.count <= 1) return NextResponse.json({ success: false, error: 'Minimal 1 Administrator.' }, { status: 403 });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(userToDelete.id);
    return NextResponse.json({ success: true, message: `User "${userToDelete.username}" berhasil dihapus.` });
  } catch (error) {
    return NextResponse.json({ success: false, error: `Gagal menghapus user: ${error instanceof Error ? error.message : JSON.stringify(error)}` }, { status: 500 });
  }
}
