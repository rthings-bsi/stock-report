import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CustomRole, PRESET_ROLES } from '@/types/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('roles').select('*').order('id', { ascending: true });
      if (error) throw error;
      const roles: CustomRole[] = (data || []).map(r => ({
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description || '',
        color: r.color || 'slate',
        isSystem: Boolean(r.is_system),
        permissions: r.permissions as any,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
      return NextResponse.json({ success: true, roles });
    }

    if (!db) throw new Error('Database not available');
    const rawRoles = db.prepare('SELECT * FROM roles ORDER BY id ASC').all() as any[];
    const roles: CustomRole[] = rawRoles.map(r => ({
      id: r.id, key: r.key, name: r.name, description: r.description || '',
      color: r.color || 'slate', isSystem: Boolean(r.is_system),
      permissions: (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions) as any,
      created_at: r.created_at, updated_at: r.updated_at
    }));
    return NextResponse.json({ success: true, roles });
  } catch (error) {
    return NextResponse.json({ success: false, error: `Gagal mengambil data roles: ${error instanceof Error ? error.message : JSON.stringify(error)}`, fallback: PRESET_ROLES }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, key, name, description, color, permissions, action } = body;
    if (!key || !name) return NextResponse.json({ success: false, error: 'Kode Role (Key) dan Nama Role wajib diisi.' }, { status: 400 });

    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const cleanName = name.trim();
    const cleanDesc = description ? description.trim() : '';
    const cleanColor = color || 'slate';
    const permsJson = permissions || {};

    if (isSupabaseConfigured && supabase) {
      if (id || action === 'update') {
        const { error } = await supabase.from('roles').update({
          name: cleanName, description: cleanDesc, color: cleanColor, permissions: permsJson, updated_at: new Date().toISOString()
        }).eq('id', id || (await supabase.from('roles').select('id').eq('key', cleanKey).single()).data?.id);
        if (error) throw error;
        return NextResponse.json({ success: true, message: `Role "${cleanName}" berhasil diperbarui.`, role: { key: cleanKey, name: cleanName, permissions: permsJson } });
      }
      
      const check = await supabase.from('roles').select('id').eq('key', cleanKey).maybeSingle();
      if (check.data) return NextResponse.json({ success: false, error: `Kode role "${cleanKey}" sudah digunakan.` }, { status: 400 });
      
      const { error } = await supabase.from('roles').insert([{
        key: cleanKey, name: cleanName, description: cleanDesc, color: cleanColor, is_system: 0, permissions: permsJson
      }]);
      if (error) throw error;
      return NextResponse.json({ success: true, message: `Role "${cleanName}" berhasil dibuat.`, role: { key: cleanKey, name: cleanName, permissions: permsJson } });
    }

    if (!db) throw new Error('Database not available');
    if (id || action === 'update') {
      let targetId = id;
      if (!targetId) targetId = (db.prepare('SELECT id FROM roles WHERE LOWER(key) = ?').get(cleanKey) as any)?.id;
      db.prepare(`UPDATE roles SET name=?, description=?, color=?, permissions=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(cleanName, cleanDesc, cleanColor, JSON.stringify(permsJson), targetId);
      return NextResponse.json({ success: true, message: `Role "${cleanName}" berhasil diperbarui.`, role: { key: cleanKey, name: cleanName, permissions: permsJson } });
    }
    
    if (db.prepare('SELECT id FROM roles WHERE LOWER(key) = ?').get(cleanKey)) return NextResponse.json({ success: false, error: `Kode role "${cleanKey}" sudah digunakan.` }, { status: 400 });
    db.prepare(`INSERT INTO roles (key, name, description, color, is_system, permissions) VALUES (?, ?, ?, ?, 0, ?)`).run(cleanKey, cleanName, cleanDesc, cleanColor, JSON.stringify(permsJson));
    return NextResponse.json({ success: true, message: `Role "${cleanName}" berhasil dibuat.`, role: { key: cleanKey, name: cleanName, permissions: permsJson } });
  } catch (error) {
    return NextResponse.json({ success: false, error: `Gagal memproses data role: ${error instanceof Error ? error.message : JSON.stringify(error)}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const id = searchParams.get('id');
    if (!key && !id) return NextResponse.json({ success: false, error: 'Kode role atau ID wajib disertakan.' }, { status: 400 });

    if (isSupabaseConfigured && supabase) {
      let roleToDelete = id ? (await supabase.from('roles').select('id, key, name, is_system').eq('id', id).single()).data : (await supabase.from('roles').select('id, key, name, is_system').ilike('key', key!).single()).data;
      if (!roleToDelete) return NextResponse.json({ success: false, error: 'Role tidak ditemukan.' }, { status: 404 });
      if (roleToDelete.is_system || roleToDelete.key === 'admin' || roleToDelete.key === 'staff') return NextResponse.json({ success: false, error: 'Role bawaan sistem tidak dapat dihapus.' }, { status: 403 });
      
      const assigned = await supabase.from('users').select('id', { count: 'exact' }).eq('role', roleToDelete.key);
      if (assigned.count && assigned.count > 0) return NextResponse.json({ success: false, error: `Role masih digunakan pengguna.` }, { status: 400 });
      
      await supabase.from('roles').delete().eq('id', roleToDelete.id);
      return NextResponse.json({ success: true, message: `Role "${roleToDelete.name}" berhasil dihapus.` });
    }

    if (!db) throw new Error('Database not available');
    let roleToDelete = id ? db.prepare('SELECT id, key, name, is_system FROM roles WHERE id = ?').get(id) as any : db.prepare('SELECT id, key, name, is_system FROM roles WHERE LOWER(key) = ?').get(key?.trim().toLowerCase()) as any;
    if (!roleToDelete) return NextResponse.json({ success: false, error: 'Role tidak ditemukan.' }, { status: 404 });
    if (roleToDelete.is_system || roleToDelete.key === 'admin' || roleToDelete.key === 'staff') return NextResponse.json({ success: false, error: 'Role bawaan sistem tidak dapat dihapus.' }, { status: 403 });
    const assignedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(roleToDelete.key) as any;
    if (assignedUsers && assignedUsers.count > 0) return NextResponse.json({ success: false, error: `Role masih digunakan pengguna.` }, { status: 400 });
    
    db.prepare('DELETE FROM roles WHERE id = ?').run(roleToDelete.id);
    return NextResponse.json({ success: true, message: `Role "${roleToDelete.name}" berhasil dihapus.` });
  } catch (error) {
    return NextResponse.json({ success: false, error: `Gagal menghapus role: ${error instanceof Error ? error.message : JSON.stringify(error)}` }, { status: 500 });
  }
}
