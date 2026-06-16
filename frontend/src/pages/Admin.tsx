import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { GlassCard } from '../components/GlassCard';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  ShieldAlert, 
  Trash2, 
  Users, 
  Activity, 
  Calendar, 
  ArrowLeft,
  UserCheck,
  UserX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  _count: {
    transactions: number;
    budgets: number;
  };
}

export const Admin: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const { request } = useApi();
  const { addNotification } = useNotification();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUsers = async () => {
    try {
      const data = await request('/api/auth/users');
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      addNotification('warning', 'Failed to fetch admin dashboard users.');
      // If unauthorized, go back home
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role !== 'ADMIN') {
      addNotification('warning', 'Access Denied: Administrator role required.');
      navigate('/');
      return;
    }
    fetchUsers();
  }, [currentUser]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        '.admin-row-stagger',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' }
      );
    }
  }, [loading]);

  const handleToggleRole = async (userId: string, currentRole: 'USER' | 'ADMIN') => {
    if (userId === currentUser?.id) {
      addNotification('warning', 'You cannot change your own role.');
      return;
    }

    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await request(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      addNotification('success', `User role updated to ${newRole}`);
    } catch (err: any) {
      console.error(err);
      addNotification('warning', err.message || 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      addNotification('warning', 'You cannot delete your own account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to completely delete the user "${userName}"? This will also purge all their transactions and budgets.`)) {
      return;
    }

    try {
      await request(`/api/auth/users/${userId}`, {
        method: 'DELETE',
      });
      setUsers(prev => prev.filter(u => u.id !== userId));
      addNotification('info', `Successfully purged user account: "${userName}"`);
    } catch (err: any) {
      console.error(err);
      addNotification('warning', err.message || 'Failed to delete user.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="loading-bubble">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <main ref={containerRef} className="main-content">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <button className="btn-logout" onClick={() => navigate('/')} style={{ padding: 4 }} title="Back to Dashboard">
              <ArrowLeft size={18} />
            </button>
            <h1 style={{ fontSize: '2.2rem' }}>Admin Console</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>System overview, user role configuration, and audit operations.</p>
        </div>

        <GlassCard style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={20} style={{ color: 'var(--accent-purple)' }} />
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{users.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Registered Users</div>
          </div>
        </GlassCard>
      </header>

      <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {users.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 0' }}>No users registered in the database.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', background: 'rgba(0,0,0,0.15)' }}>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>User Info</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Joined On</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Activity Stat</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="admin-row-stagger" style={{ borderBottom: '1px solid var(--border-glass)', background: u.id === currentUser?.id ? 'rgba(139, 92, 246, 0.03)' : 'transparent' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.name} {u.id === currentUser?.id && <span style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', background: 'var(--accent-purple-glow)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>You</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-expense' : 'badge-income'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {u.role === 'ADMIN' ? <ShieldAlert size={12} /> : <Shield size={12} />}
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
                        <span title="Transactions" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}>
                          <Activity size={14} style={{ color: 'var(--text-muted)' }} />
                          {u._count.transactions} txs
                        </span>
                        <span title="Budgets Limit" style={{ color: 'var(--text-secondary)' }}>
                          {u._count.budgets} budgets
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', height: '32px' }}
                          onClick={() => handleToggleRole(u.id, u.role)}
                          disabled={u.id === currentUser?.id}
                          title={u.role === 'ADMIN' ? 'Demote to USER' : 'Promote to ADMIN'}
                        >
                          {u.role === 'ADMIN' ? <UserX size={14} /> : <UserCheck size={14} />}
                          <span style={{ marginLeft: '4px' }}>{u.role === 'ADMIN' ? 'Demote' : 'Promote'}</span>
                        </button>
                        
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', height: '32px' }}
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          disabled={u.id === currentUser?.id}
                          title="Purge user account"
                        >
                          <Trash2 size={14} />
                          <span style={{ marginLeft: '4px' }}>Purge</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </main>
  );
};

export default Admin;
