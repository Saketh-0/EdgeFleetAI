import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { GlassCard } from '../components/GlassCard';
import { useNotification } from '../context/NotificationContext';
import { 
  PiggyBank, 
  Settings, 
  Trash2, 
  HelpCircle,
  Plus,
  Users,
  UserPlus,
  Shield,
  Mail
} from 'lucide-react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
}

interface Budget {
  id: string;
  category: string;
  limitAmount: number;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'AUDITOR';
  status: 'Active' | 'Pending';
}

export const Budgets: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [category, setCategory] = useState('Food');
  const [limitAmount, setLimitAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Collaboration mock states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'AUDITOR'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<Member[]>([
    { id: '1', name: 'Saketh (Owner)', email: 'saketh@edgefleet.ai', role: 'ADMIN', status: 'Active' },
    { id: '2', name: 'Captain Kirk', email: 'kirk@edgefleet.ai', role: 'MEMBER', status: 'Active' },
    { id: '3', name: 'Officer Spock', email: 'spock@edgefleet.ai', role: 'AUDITOR', status: 'Active' }
  ]);

  const { request } = useApi();
  const { addNotification } = useNotification();

  const fetchData = async () => {
    try {
      const txs = await request('/api/transactions');
      const bdgts = await request('/api/budgets');
      setTransactions(txs);
      setBudgets(bdgts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo(
        '.budget-card',
        { opacity: 0, scale: 0.95, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
      );
      
      gsap.fromTo(
        '.collab-stagger',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, [loading]);

  const handleUpsert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !limitAmount || submitting) return;

    setSubmitting(true);
    const parsedAmount = parseFloat(limitAmount);
    try {
      const updatedBudget = await request('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category,
          limitAmount: parsedAmount,
        }),
      });

      // Update local state
      setBudgets(prev => {
        const index = prev.findIndex(b => b.category === category);
        if (index > -1) {
          const newB = [...prev];
          newB[index] = updatedBudget;
          return newB;
        } else {
          return [...prev, updatedBudget];
        }
      });

      addNotification('success', `Established standard limit of $${parsedAmount.toFixed(2)} on "${category}"`);

      // Clear input
      setLimitAmount('');

      // Confetti for setting high budget goals!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#8b5cf6', '#14b8a6']
      });

    } catch (err) {
      console.error(err);
      addNotification('warning', 'Failed to update budget ceiling');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const budgetToDelete = budgets.find(b => b.id === id);
    if (!budgetToDelete) return;
    if (!window.confirm(`Delete budget limit for "${budgetToDelete.category}"?`)) return;
    
    try {
      await request(`/api/budgets/${id}`, {
        method: 'DELETE',
      });
      setBudgets(prev => prev.filter(b => b.id !== id));
      addNotification('info', `Removed budget ceiling for "${budgetToDelete.category}"`);
    } catch (err) {
      console.error(err);
      addNotification('warning', 'Failed to remove budget ceiling');
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || inviting) return;
    
    setInviting(true);
    
    // Simulate API round-trip delay
    setTimeout(() => {
      const emailLower = inviteEmail.toLowerCase();
      
      // Check for duplicate
      if (members.some(m => m.email.toLowerCase() === emailLower)) {
        addNotification('warning', `Invitation failed: ${inviteEmail} is already a member.`);
        setInviting(false);
        return;
      }
      
      const newMember: Member = {
        id: Math.random().toString(36).substring(2, 9),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'Pending'
      };
      
      setMembers(prev => [...prev, newMember]);
      addNotification('success', `Secure invitation link dispatched to ${inviteEmail}`);
      setInviteEmail('');
      setInviting(false);
      
      // Animate newly added row
      setTimeout(() => {
        gsap.fromTo(
          `.member-row-${newMember.id}`,
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.4 }
        );
      }, 50);
    }, 600);
  };

  // Math Calculations for progress bars
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const getCategorySpending = (cat: string) => {
    return transactions
      .filter(tx => {
        const d = new Date(tx.date);
        return tx.category === cat && 
               tx.type === 'EXPENSE' && 
               d.getMonth() === currentMonth && 
               d.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + getCategorySpending(b.category), 0);
  const totalPercentage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="main-content flex-center" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-bubble">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <main className="main-content">
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Budget Allocations</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Establish caps on specific expense categories to optimize savings.</p>
      </header>

      <section className="dashboard-grid">
        {/* Left Side: Active Budgets Progress */}
        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {budgets.length > 0 && (
            <GlassCard glow="purple" style={{ padding: '24px', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiggyBank size={20} style={{ color: 'var(--accent-purple)' }} />
                Overall Budget Envelope
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Allocated Limit</p>
                  <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                    ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Combined Spending</p>
                  <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-teal)', marginTop: '4px' }}>
                    ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>
              
              <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ width: `${totalPercentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-teal), var(--accent-purple))', borderRadius: '4px', transition: 'width 0.8s ease' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>{totalPercentage.toFixed(0)}% of limit spent</span>
                <span>Remaining envelope: ${(totalBudget - totalSpent).toFixed(2)}</span>
              </div>
            </GlassCard>
          )}

          {budgets.length === 0 ? (
            <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
              <PiggyBank size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3>No limits established</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Setup budget ceilings using the panel on the right.</p>
            </GlassCard>
          ) : (
            budgets.map(b => {
              const spent = getCategorySpending(b.category);
              const percentage = Math.min((spent / b.limitAmount) * 100, 100);
              const isOver = spent > b.limitAmount;
              const isWarning = spent > b.limitAmount * 0.85 && spent <= b.limitAmount;
              
              // Progress Bar Color based on percentage
              let barColor = 'var(--accent-teal)';
              if (isOver) {
                barColor = 'var(--accent-coral)';
              } else if (isWarning) {
                barColor = 'var(--accent-yellow)';
              }

              return (
                <GlassCard key={b.id} className="budget-card" glow={isOver ? 'none' : 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {b.category}
                        {isOver && <span className="badge badge-expense" style={{ fontSize: '0.65rem' }}>Exceeded</span>}
                        {isWarning && <span className="badge" style={{ fontSize: '0.65rem', background: 'var(--accent-yellow-glow)', color: 'var(--accent-yellow)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>Near Cap</span>}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                        Spent: <strong>${spent.toFixed(2)}</strong> of ${b.limitAmount.toFixed(2)}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isOver ? 'var(--accent-coral)' : isWarning ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>
                        {((spent / b.limitAmount) * 100).toFixed(0)}%
                      </span>
                      <button 
                        className="btn-logout" 
                        onClick={() => handleDelete(b.id)}
                        style={{ color: 'var(--text-muted)', padding: '6px' }}
                        title="Delete limit"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Remaining: ${(b.limitAmount - spent).toFixed(2)}</span>
                    <span>Monthly limit</span>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>

        {/* Right Side: Setup Limits & Advice */}
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Setup Form */}
          <GlassCard glow="purple">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} style={{ color: 'var(--accent-purple)' }} />
              Manage Limits
            </h3>
            
            <form onSubmit={handleUpsert}>
              <div className="input-group">
                <label>Category</label>
                <select className="input-control" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Food">Food</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Housing">Housing</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="input-group">
                <label>Monthly Limit ($)</label>
                <input
                  type="number"
                  className="input-control"
                  placeholder="300"
                  value={limitAmount}
                  onChange={e => setLimitAmount(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                <Plus size={16} />
                <span>Establish Target</span>
              </button>
            </form>
          </GlassCard>

          {/* Advice panel */}
          <GlassCard glow="none" style={{ background: 'rgba(0, 0, 0, 0.15)' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={16} style={{ color: 'var(--text-muted)' }} />
              Budget Controls
            </h4>
            <ul style={{ paddingLeft: '16px', fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Teal status</strong> indicates healthy cash usage under 85% of standard cap.</li>
              <li><strong>Yellow status</strong> signals cautious operations exceeding 85% target threshold.</li>
              <li><strong>Red status</strong> triggers system alert indicating over-allocated spending.</li>
            </ul>
          </GlassCard>
        </div>
      </section>

      {/* Roster & Collaboration Panel Section */}
      <section className="dashboard-grid" style={{ marginTop: '32px' }}>
        {/* Team Members list */}
        <div className="col-8 collab-stagger">
          <GlassCard style={{ padding: '24px', height: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} style={{ color: 'var(--accent-teal)' }} />
              Fleet Space Members
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Member Name</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Role Badge</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Connection Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className={`member-row-${m.id}`} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '0.75rem' }}>{m.name.charAt(0).toUpperCase()}</div>
                        <span style={{ textTransform: 'capitalize' }}>{m.name}</span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{m.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontWeight: 600,
                          background: m.role === 'ADMIN' ? 'var(--accent-purple-glow)' : m.role === 'AUDITOR' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: m.role === 'ADMIN' ? 'var(--accent-purple)' : m.role === 'AUDITOR' ? 'var(--accent-yellow)' : 'var(--text-secondary)',
                          border: `1px solid ${m.role === 'ADMIN' ? 'rgba(139, 92, 246, 0.2)' : m.role === 'AUDITOR' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`
                        }}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ 
                          fontSize: '0.75rem',
                          color: m.status === 'Active' ? 'var(--accent-teal)' : 'var(--text-muted)',
                          fontWeight: 500
                        }}>
                          {m.status === 'Active' ? '● Connected' : '○ Invited'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Invite Form */}
        <div className="col-4 collab-stagger">
          <GlassCard glow="teal" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} style={{ color: 'var(--accent-teal)' }} />
                Invite Fleet Member
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '20px' }}>
                Co-own this budget space by dispatching secure view or edit access rights to other workspace auditors.
              </p>

              <form onSubmit={handleInvite}>
                <div className="input-group">
                  <label>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      className="input-control"
                      placeholder="crew@edgefleet.ai"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      style={{ paddingLeft: '36px', width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '20px' }}>
                  <label>Role Clearance</label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <select 
                      className="input-control" 
                      value={inviteRole} 
                      onChange={e => setInviteRole(e.target.value as 'MEMBER' | 'AUDITOR')}
                      style={{ paddingLeft: '36px' }}
                    >
                      <option value="MEMBER">Member (Full Write)</option>
                      <option value="AUDITOR">Auditor (Read Only)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={inviting || !inviteEmail}>
                  {inviting ? 'Dispatching...' : 'Dispatch Access Code'}
                </button>
              </form>
            </div>
          </GlassCard>
        </div>
      </section>
    </main>
  );
};

export default Budgets;

