import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';

/* ---------- Auth ---------- */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (payload) => {
        const d = await api.post('/api/auth/login', payload);
        setUser(d.user);
        return d.user;
      },
      register: async (payload) => {
        const d = await api.post('/api/auth/register', payload);
        setUser(d.user);
        return d.user;
      },
      logout: async () => {
        await api.post('/api/auth/logout');
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/* ---------- Toasts ---------- */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const value = useMemo(
    () => ({
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push]
  );
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ---------- Data fetching ---------- */
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const load = useCallback(
    async (quiet = false) => {
      if (!url) return;
      if (!quiet) setLoading(true);
      try {
        const d = await api.get(url);
        if (alive.current) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (alive.current) setError(e);
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  return { data, error, loading, reload: load, setData };
}
