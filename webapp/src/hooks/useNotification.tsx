import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type NoticeTone = 'success' | 'error' | 'info';

interface NoticeState {
  id: number;
  tone: NoticeTone;
  message: string;
}

interface NotificationContextValue {
  notify: (message: string, tone?: NoticeTone) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const notify = useCallback((message: string, tone: NoticeTone = 'info') => {
    setNotice({
      id: Date.now(),
      message,
      tone,
    });

    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notice ? (
        <div className={`toast toast--${notice.tone}`} role="status" aria-live="polite">
          {notice.message}
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }

  return context;
}

