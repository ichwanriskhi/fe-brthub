'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { brthubApi, defaultRole, MeUser, BrthubData, ROLE_REDIRECT } from '@/lib/api/brthub-api';
import type { AppRole } from '@/lib/api/brthub-api';
import { setTokenExpiry } from '@/lib/api/fetch-wrapper';
import { toast } from 'sonner';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'brthub_token';
const REFRESH_KEY = 'brthub_refresh_token';
const USER_KEY = 'brthub_user';
const ACTIVE_ROLE_KEY = 'brthub_active_role';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  uuid: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  roles: string[];
  employee_profile: BrthubData['employee_profile'];
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * `activeRole` opsional: role yang sedang dibuka (dari halaman tujuan).
   * Selalu diisi saat login agar badge = halaman, satu sumber kebenaran.
   */
  login: (token: string, refreshToken: string, user: AuthUser, activeRole?: string | null, expiresInSec?: number) => void;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  /**
   * Semua role yang bisa diakses user, termasuk `approver` bila posisi
   * jabatannya memenuhi syarat (hierarchy_level 1–4).
   */
  availableRoles: string[];
  /** Role yang sedang aktif (ada di `availableRoles`) atau null. */
  activeRole: string | null;
  /** Ganti role aktif lalu navigasi ke home role tersebut. */
  setActiveRole: (role: string) => void;
  /** Initials (e.g. "AS") for the avatar fallback. */
  initials: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Role `approver` bukan role di DB — diturunkan dari posisi jabatan
   * (hierarchy_level 1–4). Centralisasi pengecekan di sini agar tidak
   * tersebar di setiap halaman.
   */
  const availableRoles = React.useMemo<string[]>(() => {
    if (!user) return [];
    const roles = user.roles ?? [];
    if (roles.includes('approver')) return roles;
    const level = user.employee_profile?.hierarchy_level;
    return typeof level === 'number' && level >= 1 && level <= 4
      ? [...roles, 'approver']
      : roles;
  }, [user]);

  // On mount, rehydrate from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      }
      const storedActiveRole = localStorage.getItem(ACTIVE_ROLE_KEY);
      if (storedActiveRole) setActiveRoleState(storedActiveRole);
    } catch {
      // Storage unavailable or corrupt — clear silently
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, authUser: AuthUser, role?: string | null, expiresInSec?: number) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setToken(accessToken);
    setUser(authUser);
    // Umur untuk scheduler proaktif — tanpa ini proactive tidak punya dasar angka.
    if (Number.isFinite(Number(expiresInSec)) && Number(expiresInSec) > 0) {
      setTokenExpiry('staff', Number(expiresInSec));
    }
    // Sinkronkan role aktif saat login — badge dan halaman tujuan
    // dihitung dari nilai yang sama, tidak lagi dari dua urutan berbeda.
    if (role) {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
      setActiveRoleState(role);
    }
  }, []);

  // Koreksi role aktif basi (mis. role dicabut admin) ke default prioritas
  // begitu user termuat. Dijaga `user !== null` agar tidak menghapus
  // preferensi tersimpan sebelum rehidrasi selesai.
  useEffect(() => {
    if (user === null) return;
    if (activeRole && availableRoles.includes(activeRole)) return;
    const fallback = defaultRole(availableRoles);
    if (fallback && fallback !== activeRole) {
      localStorage.setItem(ACTIVE_ROLE_KEY, fallback);
      setActiveRoleState(fallback);
    }
  }, [user, availableRoles, activeRole]);

  const logout = useCallback(async () => {
    try {
      await brthubApi.logout();
      toast.success('Logout berhasil.');
    } catch {
      // Best-effort — always clear local state
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    setToken(null);
    setUser(null);
    setActiveRoleState(null);
    router.push('/login');
  }, [router]);

  const hasRole = useCallback(
    (role: string) => availableRoles.includes(role),
    [availableRoles],
  );

  const setActiveRole = useCallback(
    (role: string) => {
      if (!availableRoles.includes(role)) return;
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
      setActiveRoleState(role);
      router.push(ROLE_REDIRECT[role as AppRole] ?? '/unauthorized');
    },
    [availableRoles, router],
  );

  const initials = useMemo(() => {
    if (!user?.full_name) return '??';
    return user.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      login,
      logout,
      hasRole,
      availableRoles,
      activeRole,
      setActiveRole,
      initials,
    }),
    [user, token, isLoading, login, logout, hasRole, availableRoles, activeRole, setActiveRole, initials]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// ─── Token helper (for server-side or non-React usage) ────────────────────────

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
