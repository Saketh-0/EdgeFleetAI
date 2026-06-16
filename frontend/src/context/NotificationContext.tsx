import React, { createContext, useContext, useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import gsap from 'gsap';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: 'success' | 'warning' | 'info', message: string) => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: 'success' | 'warning' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = {
      id,
      type,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const clearNotification = (id: string) => {
    // Animate out before removing from state
    const el = document.getElementById(`toast-${id}`);
    if (el) {
      gsap.to(el, {
        x: 100,
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }
      });
    } else {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  // Setup GSAP animation for newly added notification toasts
  useEffect(() => {
    notifications.forEach(n => {
      const el = document.getElementById(`toast-${n.id}`);
      if (el && !el.classList.contains('animated-in')) {
        el.classList.add('animated-in');
        gsap.fromTo(el,
          { x: 150, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.2)' }
        );
        
        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
          clearNotification(n.id);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    });
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, clearNotification }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="toast-portal-container">
        {notifications.slice(0, 5).map(n => (
          <div key={n.id} id={`toast-${n.id}`} className={`toast-card toast-${n.type}`}>
            <div className="toast-icon">
              {n.type === 'success' && <CheckCircle size={18} color="var(--success-color, #10b981)" />}
              {n.type === 'warning' && <AlertTriangle size={18} color="var(--warning-color, #f59e0b)" />}
              {n.type === 'info' && <Info size={18} color="var(--primary-color, #6366f1)" />}
            </div>
            <div className="toast-body">
              <p>{n.message}</p>
            </div>
            <button className="toast-close-btn" onClick={() => clearNotification(n.id)} aria-label="Close Notification">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
