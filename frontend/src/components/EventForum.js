import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Pin, Trash2, Megaphone, Reply, X, Bell, BellOff } from 'lucide-react';
import API_BASE_URL from '../config/api';
import './EventForum.css';
import './ForumNotifications.css';

const SOCKET_URL = API_BASE_URL.replace('/api', '');
const REACTIONS = ['👍', '❤️', '😂', '🔥', '👏'];

const EventForum = ({ eventId, isOrganizer }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  // ── NOTIFICATION STATE ───────────────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // Use refs for values read inside socket callbacks (avoids stale closures)
  const isForumVisibleRef = useRef(true);
  const [isForumVisible, _setIsForumVisible] = useState(true);
  const setIsForumVisible = (val) => {
    isForumVisibleRef.current = val;
    _setIsForumVisible(val);
  };

  // notificationsEnabled ref — socket handler always reads current value via ref
  const notificationsEnabledRef = useRef(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [notificationsEnabled, _setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const setNotificationsEnabled = (val) => {
    notificationsEnabledRef.current = val;
    _setNotificationsEnabled(val);
  };

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const forumRef = useRef(null);

  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Track whether forum panel is visible on screen
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsForumVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (forumRef.current) observer.observe(forumRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset unread count when forum comes into view
  useEffect(() => {
    if (isForumVisible) setUnreadCount(0);
  }, [isForumVisible]);

  // Request browser notification permission
  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    } else {
      alert('Notification permission denied. You can enable it in browser settings.');
    }
  };

  const showBrowserNotification = useCallback((title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `forum-${eventId}`,
      });
    }
  }, [eventId]);

  // Add in-app toast — uses window.setTimeout so React StrictMode double-invoke
  // does not cancel the timer before the toast becomes visible
  const addToastNotification = useCallback((msg) => {
    const id = Date.now();
    const senderName =
      msg.user?.role === 'organizer'
        ? msg.user?.organizerName || msg.user?.firstName
        : msg.user?.firstName;

    setNotifications(prev => [
      ...prev,
      {
        id,
        senderName,
        text: msg.text.substring(0, 80),
        isAnnouncement: msg.isAnnouncement,
      },
    ]);

    const timer = window.setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);

    window._forumToastTimers = window._forumToastTimers || {};
    window._forumToastTimers[id] = timer;
  }, []);

  // Fetch existing messages on mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/forum/${eventId}`);
        setMessages(res.data);
      } catch (err) {
        setError('Failed to load forum messages');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [eventId]);

  // Socket.io connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_event_forum', eventId);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    socket.on('receive_message', (message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });

      const isOwnMessage =
        message.user?._id === user?._id || message.user === user?._id;

      if (!isOwnMessage) {
        const visible = isForumVisibleRef.current;
        const notifOn = notificationsEnabledRef.current;

        // Increment unread badge if forum is scrolled out of view
        if (!visible) {
          setUnreadCount(prev => prev + 1);
        }

        // Show toast + browser notification if:
        // 1. It's an announcement (always notify)
        // 2. Forum is not visible (user scrolled away)
        // 3. User has clicked "Notify Me" (wants toasts for all messages)
        if (message.isAnnouncement || !visible || notifOn) {
          addToastNotification(message);

          const senderName =
            message.user?.role === 'organizer'
              ? message.user?.organizerName || message.user?.firstName
              : message.user?.firstName;

          showBrowserNotification(
            message.isAnnouncement ? '📢 Announcement' : ` ${senderName}`,
            message.text.substring(0, 100)
          );
        }
      }

      setTimeout(scrollToBottom, 100);
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    });

    socket.on('message_pinned', ({ messageId, isPinned }) => {
      setMessages(prev =>
        prev
          .map(m => (m._id === messageId ? { ...m, isPinned } : m))
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
      );
    });

    socket.on('user_typing', ({ userId, name }) => {
      if (userId !== user?._id) {
        setTypingUsers(prev => {
          if (prev.some(u => u.userId === userId)) return prev;
          return [...prev, { userId, name }];
        });
      }
    });

    socket.on('user_stop_typing', ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    socket.on('forum_error', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.emit('leave_event_forum', eventId);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    socketRef.current?.emit('send_message', {
      eventId,
      text: text.trim(),
      parentMessageId: replyTo?._id || null,
      isAnnouncement,
    });
    setText('');
    setReplyTo(null);
    setIsAnnouncement(false);
    socketRef.current?.emit('typing_stop', { eventId });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    socketRef.current?.emit('typing_start', { eventId, name: user?.firstName });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { eventId });
    }, 1500);
  };

  const handleDelete = async (msg) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/forum/${msg._id}`);
      socketRef.current?.emit('delete_message', { messageId: msg._id, eventId });
      setMessages(prev => prev.filter(m => m._id !== msg._id));
    } catch (err) {
      setError('Failed to delete message');
    }
  };

  const handlePin = async (msg) => {
    try {
      await api.put(`/forum/pin/${msg._id}`);
      socketRef.current?.emit('pin_message', { messageId: msg._id, eventId });
    } catch (err) {
      setError('Failed to pin message');
    }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      const res = await api.post(`/forum/react/${msgId}`, { emoji });
      setMessages(prev => prev.map(m => (m._id === msgId ? res.data : m)));
    } catch (err) {
      console.error('Reaction failed', err);
    }
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const getDisplayName = (msgUser) => {
    if (!msgUser) return 'Unknown';
    return msgUser.role === 'organizer'
      ? msgUser.organizerName || msgUser.firstName
      : msgUser.firstName;
  };

  const isOwn = (msg) => msg.user?._id === user?._id || msg.user === user?._id;

  const pinnedMessages = messages.filter(m => m.isPinned);
  const regularMessages = messages.filter(m => !m.isPinned);

  if (loading) return <div className="forum-loading">Loading forum...</div>;

  return (
    <div className="event-forum" ref={forumRef}>

      {/* ── Toast notifications (fixed top-right corner) ── */}
      <div className="forum-toast-container">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`forum-toast ${n.isAnnouncement ? 'announcement-toast' : ''}`}
          >
            <div className="toast-header">
              {n.isAnnouncement ? ' Announcement' : ` ${n.senderName}`}
              <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}>
                <X size={12} />
              </button>
            </div>
            <div className="toast-body">{n.text}</div>
          </div>
        ))}
      </div>

      {/* ── Forum header ── */}
      <div className="forum-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2> Discussion Forum</h2>
          {unreadCount > 0 && (
            <span
              className="unread-badge"
              onClick={() => { setUnreadCount(0); scrollToBottom(); }}
            >
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="forum-count">{messages.length} messages</span>
          <button
            className={`notification-toggle-btn ${notificationsEnabled ? 'enabled' : ''}`}
            onClick={
              notificationsEnabled
                ? () => setNotificationsEnabled(false)
                : enableBrowserNotifications
            }
            title={
              notificationsEnabled
                ? 'Disable notifications'
                : 'Enable notifications for all new messages'
            }
          >
            {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            {notificationsEnabled ? 'Notifications On' : 'Notify Me'}
          </button>
        </div>
      </div>

      {error && (
        <div className="forum-error">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* ── Pinned messages banner ── */}
      {pinnedMessages.length > 0 && (
        <div className="pinned-banner">
          <Pin size={14} /> <strong>Pinned:</strong>&nbsp;
          {pinnedMessages.map(m => (
            <span key={m._id} className="pinned-msg-preview">
              {m.user ? getDisplayName(m.user) : '?'}: {m.text.substring(0, 80)}
              {m.text.length > 80 ? '...' : ''}
            </span>
          ))}
        </div>
      )}

      {/* ── Messages list ── */}
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="forum-empty">No messages yet. Be the first to post!</div>
        )}

        {regularMessages.map(msg => (
          <MessageBubble
            key={msg._id}
            msg={msg}
            isOwn={isOwn(msg)}
            isOrganizer={isOrganizer}
            onDelete={handleDelete}
            onPin={handlePin}
            onReply={setReplyTo}
            onReact={handleReact}
            reactions={REACTIONS}
            getDisplayName={getDisplayName}
            formatTime={formatTime}
            userId={user?._id}
          />
        ))}

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots">
              <span /><span /><span />
            </span>
            {typingUsers.map(u => u.name).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Reply preview ── */}
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-preview-content">
            <Reply size={14} />
            <span>
              Replying to <strong>{getDisplayName(replyTo.user)}</strong>:{' '}
              {replyTo.text.substring(0, 60)}
            </span>
          </div>
          <button onClick={() => setReplyTo(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Input area ── */}
      <div className="forum-input-area">
        {isOrganizer && (
          <label className="announcement-toggle">
            <input
              type="checkbox"
              checked={isAnnouncement}
              onChange={e => setIsAnnouncement(e.target.checked)}
            />
            <Megaphone size={14} /> Post as Announcement
          </label>
        )}
        <div className="input-row">
          <textarea
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder={
              replyTo
                ? 'Write a reply...'
                : 'Write a message... (Enter to send, Shift+Enter for new line)'
            }
            rows={2}
            className={isAnnouncement ? 'announcement-input' : ''}
          />
          <button className="send-btn" onClick={handleSend} disabled={!text.trim()}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MessageBubble sub-component ─────────────────────────────────────────────
const MessageBubble = ({
  msg, isOwn, isOrganizer, onDelete, onPin, onReply,
  onReact, reactions, getDisplayName, formatTime, userId,
}) => {
  const [showReactions, setShowReactions] = useState(false);

  const getUserReaction = reaction =>
    reaction.users.some(
      u => u === userId || u?._id === userId || u?.toString() === userId
    );

  return (
    <div
      className={`message-bubble ${isOwn ? 'own' : ''} ${msg.isAnnouncement ? 'announcement' : ''} ${msg.isPinned ? 'pinned' : ''}`}
    >
      {msg.isPinned && <div className="pin-indicator"><Pin size={12} /> Pinned</div>}
      {msg.isAnnouncement && (
        <div className="announcement-label"><Megaphone size={12} /> Announcement</div>
      )}

      {msg.parentMessage && (
        <div className="thread-parent">
          <Reply size={12} />
          <strong>{getDisplayName(msg.parentMessage.user)}</strong>:{' '}
          {msg.parentMessage.text?.substring(0, 60)}
        </div>
      )}

      <div className="bubble-header">
        <span className={`bubble-name ${msg.user?.role === 'organizer' ? 'organizer-name' : ''}`}>
          {getDisplayName(msg.user)}
          {msg.user?.role === 'organizer' && <span className="org-badge">Organizer</span>}
        </span>
        <span className="bubble-time">{formatTime(msg.createdAt)}</span>
      </div>

      <div className="bubble-text">{msg.text}</div>

      {msg.reactions?.length > 0 && (
        <div className="reactions-display">
          {msg.reactions
            .filter(r => r.users.length > 0)
            .map(r => (
              <button
                key={r.emoji}
                className={`reaction-chip ${getUserReaction(r) ? 'reacted' : ''}`}
                onClick={() => onReact(msg._id, r.emoji)}
              >
                {r.emoji} {r.users.length}
              </button>
            ))}
        </div>
      )}

      <div className="bubble-actions">
        <button className="action-btn" onClick={() => onReply(msg)} title="Reply">
          <Reply size={14} /> Reply
        </button>
        <button
          className="action-btn"
          onClick={() => setShowReactions(!showReactions)}
          title="React"
        >
          😊
        </button>
        {isOrganizer && (
          <button
            className="action-btn"
            onClick={() => onPin(msg)}
            title={msg.isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={14} /> {msg.isPinned ? 'Unpin' : 'Pin'}
          </button>
        )}
        {(isOwn || isOrganizer) && (
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(msg)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {showReactions && (
        <div className="reaction-picker">
          {reactions.map(emoji => (
            <button
              key={emoji}
              className="reaction-emoji-btn"
              onClick={() => { onReact(msg._id, emoji); setShowReactions(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventForum;