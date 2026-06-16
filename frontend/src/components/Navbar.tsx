import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { Sun, Moon, LogOut, LayoutDashboard, History, PiggyBank, Bell, CheckCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import gsap from 'gsap';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, clearNotification } = useNotification();
  const navigate = useNavigate();
  const navRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(
        navRef.current,
        { y: -80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, [user]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <>
      <nav ref={navRef} className="glass-navbar">
        <div className="nav-container" style={{ position: 'relative' }}>
        <div className="nav-logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/favicon.svg" alt="EdgeFleet Logo" style={{ width: '28px', height: '28px' }} />
          <span className="logo-text">EdgeFleet</span>
          <span className="logo-dot">.AI</span>
        </div>

        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <History size={18} />
            <span>Transactions</span>
          </NavLink>
          <NavLink to="/budgets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <PiggyBank size={18} />
            <span>Budgets</span>
          </NavLink>
          {user.role === 'ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <ShieldAlert size={18} />
              <span>Admin Panel</span>
            </NavLink>
          )}
        </div>

        <div className="nav-actions">
          {/* Notification Bell */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              className="nav-notification-bell" 
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="Toggle notifications"
              title="Notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="nav-notification-badge">{notifications.length}</span>
              )}
            </button>

            {showDropdown && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <h4>Alerts & Feeds</h4>
                  {notifications.length > 0 && (
                    <button 
                      className="notification-dropdown-clear-btn"
                      onClick={() => notifications.forEach(n => clearNotification(n.id))}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                
                {notifications.length === 0 ? (
                  <div className="notification-dropdown-empty">
                    <Bell size={24} style={{ opacity: 0.3 }} />
                    <p>No new notifications</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className="notification-dropdown-item"
                      onClick={() => clearNotification(n.id)}
                    >
                      <div className="notif-icon">
                        {n.type === 'success' && <CheckCircle size={15} color="var(--accent-teal)" />}
                        {n.type === 'warning' && <AlertTriangle size={15} color="var(--accent-coral)" />}
                        {n.type === 'info' && <Info size={15} color="var(--accent-purple)" />}
                      </div>
                      <div className="notif-content">
                        <span className="notif-text">{n.message}</span>
                        <span className="notif-time">
                          {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="user-profile">
            <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="user-name" style={{ textTransform: 'capitalize' }}>{user.name}</span>
          </div>

          <button className="btn-logout" onClick={handleLogout} title="Log Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>

    {/* Mobile Bottom Navigation */}
    <div className="mobile-bottom-nav">
      <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} end>
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <History size={20} />
        <span>Ledger</span>
      </NavLink>
      <NavLink to="/budgets" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <PiggyBank size={20} />
        <span>Budgets</span>
      </NavLink>
      {user.role === 'ADMIN' && (
        <NavLink to="/admin" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <ShieldAlert size={20} />
          <span>Admin</span>
        </NavLink>
      )}
    </div>
  </>
  );
};

export default Navbar;

