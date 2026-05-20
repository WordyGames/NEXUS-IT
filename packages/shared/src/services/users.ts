import { supabase } from '../config/supabase';
import { User, UserRole, Company, UserSession } from '../types';
import { getDefaultPermissionsForRole } from '../utils/permissions';

const toDate = (value: string | Date | null | undefined): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? undefined : d;
};

const profileToUser = (row: any): User => ({
  id: row.id,
  username: row.username,
  password: '',
  name: row.name,
  role: row.role as UserRole,
  permissions: row.permissions ?? {},
  company: row.company as Company,
  department: row.department ?? undefined,
  position: row.position ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  photoURL: row.photo_url ?? undefined,
  isActive: row.is_active,
  lastLogin: toDate(row.last_login) ?? new Date(0),
  createdAt: toDate(row.created_at) ?? new Date(),
  updatedAt: toDate(row.updated_at) ?? new Date()
});

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();

  if (error || !data) return null;
  return profileToUser(data);
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  if (error || !data) return null;
  return profileToUser(data);
};

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(profileToUser);
};

export const getUsersByCompany = async (company: Company): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('company', company);

  if (error) throw error;
  return (data ?? []).map(profileToUser);
};

export const createUser = async (
  username: string,
  password: string,
  name: string,
  company: Company,
  role: UserRole = UserRole.USER,
  department?: string,
  phone?: string,
  position?: string,
  email?: string
): Promise<string> => {
  const permissions = getDefaultPermissionsForRole(role);

  const { data, error } = await supabase.rpc('create_user_by_admin', {
    p_username: username.trim().toLowerCase(),
    p_password: password,
    p_name: name,
    p_role: role,
    p_company: company,
    p_permissions: permissions,
    p_department: department ?? null,
    p_position: position ?? null,
    p_phone: phone ?? null,
    p_email: email ?? null
  });

  if (error) {
    if (error.message?.includes('ya existe')) throw new Error('El nombre de usuario ya existe');
    throw error;
  }

  return data as string;
};

export const signIn = async (username: string, password: string): Promise<UserSession> => {
  const email = `${username.trim().toLowerCase()}@nexus-it.app`;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError || !authData.user) {
    throw new Error('Usuario o contraseña incorrectos');
  }

  const user = await getUserById(authData.user.id);
  if (!user) throw new Error('Usuario no encontrado');
  if (!user.isActive) throw new Error('Usuario inactivo');

  await supabase
    .from('profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', authData.user.id);

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    company: user.company,
    loginAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
};

export const getCurrentSession = async (): Promise<UserSession | null> => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const user = await getUserById(data.session.user.id);
  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    company: user.company,
    loginAt: new Date(data.session.user.last_sign_in_at ?? Date.now()),
    expiresAt: new Date(data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
};

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return getUserById(data.session.user.id);
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
  if (typeof data.username === 'string') {
    const normalized = data.username.trim().toLowerCase();

    if (normalized.length < 3) throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
    if (!/^[a-z0-9._-]+$/.test(normalized)) {
      throw new Error('Solo se permiten letras minúsculas, números, punto, guion y guion bajo');
    }

    const existing = await getUserByUsername(normalized);
    if (existing && existing.id !== uid) throw new Error('El nombre de usuario ya existe');

    if (data.username !== (await getUserById(uid))?.username) {
      const { error } = await supabase.rpc('update_user_username', {
        p_user_id: uid,
        p_new_username: normalized
      });
      if (error) throw error;
    }
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.role !== undefined) updates.role = data.role;
  if (data.company !== undefined) updates.company = data.company;
  if (data.permissions !== undefined) updates.permissions = data.permissions;
  if (data.isActive !== undefined) updates.is_active = data.isActive;
  if (data.department !== undefined) updates.department = data.department;
  if (data.position !== undefined) updates.position = data.position;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.email !== undefined) updates.email = data.email;
  if (data.photoURL !== undefined) updates.photo_url = data.photoURL;

  const { error } = await supabase.from('profiles').update(updates).eq('id', uid);
  if (error) throw error;
};

export const deleteUser = async (uid: string): Promise<void> => {
  const { error } = await supabase.rpc('delete_user_by_admin', { p_user_id: uid });
  if (error) throw error;
};

export const changePassword = async (userId: string, newPassword: string): Promise<void> => {
  const { error } = await supabase.rpc('change_user_password', {
    p_user_id: userId,
    p_new_password: newPassword
  });
  if (error) throw error;
};

export const isAdmin = async (uid: string): Promise<boolean> => {
  const user = await getUserById(uid);
  return user?.role === UserRole.ADMIN;
};
