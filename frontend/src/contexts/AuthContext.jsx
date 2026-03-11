import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext();

// ── Branch helpers ──────────────────────────────────────────────────────────
const BRANCH_KEY = 'apex-active-branch';

function loadStoredBranch() {
  return localStorage.getItem(BRANCH_KEY) || 'all';
}

// ── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [branches, setBranches]   = useState([]);          // available companies
  const [activeBranchId, setActiveBranchId] = useState(loadStoredBranch);

  // ── fetchUser ──────────────────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('apex-token');
      if (!token) { setLoading(false); return; }
      const { data } = await api.get('/core/users/me/');
      setUser(data);
      // accessible_companies is now embedded in the /me/ response
      if (data.accessible_companies?.length) {
        setBranches(data.accessible_companies);
      }
    } catch {
      localStorage.removeItem('apex-token');
      localStorage.removeItem('apex-refresh');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── fetchBranches (explicit refresh) ──────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    try {
      const { data } = await api.get('/core/users/branches/');
      setBranches(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // ── login / logout ─────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    localStorage.setItem('apex-token', data.access);
    localStorage.setItem('apex-refresh', data.refresh);
    await fetchUser();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('apex-token');
    localStorage.removeItem('apex-refresh');
    // Keep the branch preference so the next login restores the same context
    setUser(null);
    setBranches([]);
  };

  // ── switchBranch ───────────────────────────────────────────────────────────
  /**
   * Change the active branch context.
   *
   * @param {string} branchId  – a Company UUID, or 'all' for consolidated view
   *
   * The new ID is written to localStorage immediately so the next axios request
   * (which reads from localStorage in its interceptor) automatically uses it.
   * No page reload or user re-fetch is required.
   */
  const switchBranch = useCallback((branchId) => {
    const next = branchId || 'all';
    setActiveBranchId(next);
    localStorage.setItem(BRANCH_KEY, next);
  }, []);

  // ── derived helpers ────────────────────────────────────────────────────────
  /**
   * The currently active branch object, or null when mode is 'all'.
   * Consumers can use this for display (name, city) without another API call.
   */
  const activeBranch = activeBranchId === 'all'
    ? null
    : (branches.find(b => b.id === activeBranchId) || null);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      fetchUser,
      // Branch
      branches,
      activeBranchId,
      activeBranch,
      switchBranch,
      fetchBranches,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
