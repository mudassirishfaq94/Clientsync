import { useCallback, useState } from 'react';
import { ConfirmDialog } from '../components/ui/primitives.jsx';

/**
 * Promise-free confirm dialog replacing window.confirm.
 * const { confirm, dialog } = useConfirm();
 * confirm({ title, message, confirmLabel, onConfirm: async () => {...} })
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const close = useCallback(() => {
    setState(null);
    setError('');
    setLoading(false);
  }, []);

  const confirm = useCallback((opts) => {
    setError('');
    setState(opts);
  }, []);

  const run = useCallback(async () => {
    if (!state?.onConfirm) return close();
    setLoading(true);
    setError('');
    try {
      await state.onConfirm();
      close();
    } catch (e) {
      setError(e.message || 'Action failed.');
      setLoading(false);
    }
  }, [state, close]);

  const dialog = state ? (
    <ConfirmDialog
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      danger={state.danger !== false}
      loading={loading}
      error={error}
      onConfirm={run}
      onClose={close}
    />
  ) : null;

  return { confirm, dialog };
}
