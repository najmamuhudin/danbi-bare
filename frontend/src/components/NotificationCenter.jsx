import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  FileWarning,
  ShieldAlert,
  Siren,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useSelector } from 'react-redux';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '');
const MAX_NOTIFICATIONS = 50;

const notificationMeta = {
  new_report: {
    icon: FileWarning,
    color: 'text-danger',
    border: 'border-danger/20',
    bg: 'bg-danger/10'
  },
  suspicious_activity: {
    icon: AlertTriangle,
    color: 'text-amber-300',
    border: 'border-amber-300/20',
    bg: 'bg-amber-400/10'
  },
  high_risk_prediction: {
    icon: ShieldAlert,
    color: 'text-danger',
    border: 'border-danger/20',
    bg: 'bg-danger/10'
  },
  emergency_alert: {
    icon: Siren,
    color: 'text-danger',
    border: 'border-danger/40',
    bg: 'bg-danger/15'
  }
};

const fallbackMeta = {
  icon: Bell,
  color: 'text-primary',
  border: 'border-primary/20',
  bg: 'bg-primary/10'
};

const mergeNotifications = (incoming, existing = []) => {
  const byId = new Map();
  [...incoming, ...existing].forEach((notification) => {
    if (notification?._id) {
      byId.set(notification._id, notification);
    }
  });

  return Array.from(byId.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_NOTIFICATIONS);
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const NotificationCenter = () => {
  const { token } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);
  const panelRef = useRef(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('notification:recent', (items = []) => {
      setNotifications((current) => mergeNotifications(items, current));
    });
    socket.on('notification', (notification) => {
      setNotifications((current) => mergeNotifications([notification], current));
      if (!openRef.current) {
        setUnread((count) => count + 1);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const visibleNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);
  const BellIcon = unread > 0 ? BellRing : Bell;

  if (!token) {
    return null;
  }

  const toggleOpen = () => {
    setOpen((value) => {
      const next = !value;
      if (next) {
        setUnread(0);
      }
      return next;
    });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
          unread > 0
            ? 'border-primary/30 bg-primary/15 text-primary'
            : 'border-white/10 text-textMuted hover:bg-white/5 hover:text-white'
        }`}
        title="Alerts"
      >
        <BellIcon className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[60] w-[min(92vw,380px)] overflow-hidden rounded-xl border border-white/10 bg-surface shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Alerts Toos ah</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-textMuted">
                {connected ? <Wifi className="w-3 h-3 text-success" /> : <WifiOff className="w-3 h-3 text-danger" />}
                {connected ? 'Connected' : 'Reconnecting'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUnread(0)}
                className="rounded-lg p-2 text-textMuted hover:bg-white/5 hover:text-white"
                title="Mark as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotifications([]);
                  setUnread(0);
                }}
                className="rounded-lg p-2 text-textMuted hover:bg-white/5 hover:text-white"
                title="Clear alerts"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {visibleNotifications.length > 0 ? (
              visibleNotifications.map((notification) => {
                const meta = notificationMeta[notification.type] || fallbackMeta;
                const Icon = meta.icon;
                return (
                  <div
                    key={notification._id}
                    className={`mb-2 rounded-lg border ${meta.border} ${meta.bg} p-3 last:mb-0 ${
                      notification.type === 'emergency_alert' ? 'shadow-lg shadow-danger/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-surface/80 p-2">
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-white">{notification.title}</div>
                          <div className="shrink-0 text-[11px] text-textMuted">{formatTime(notification.createdAt)}</div>
                        </div>
                        <div className="mt-1 text-sm leading-snug text-white/80">{notification.message}</div>
                        {notification.payload?.categories?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {notification.payload.categories.map((category) => (
                              <span
                                key={category}
                                className="rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-danger"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        )}
                        {notification.payload?.inputText && (
                          <div className="mt-2 line-clamp-2 rounded-md bg-black/20 px-2 py-1.5 text-xs text-textMuted">
                            {notification.payload.inputText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center text-sm text-textMuted">
                No live alerts yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
