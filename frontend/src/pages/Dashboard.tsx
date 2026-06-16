import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { GlassCard } from '../components/GlassCard';
import { useNotification } from '../context/NotificationContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Sparkles, 
  Plus, 
  Calendar
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import gsap from 'gsap';

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

/**
 * Safe summary renderer that parses markdown headers, lists, and bold text into React nodes
 * without using dangerouslySetInnerHTML, protecting the application against XSS.
 */
function renderSafeSummary(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    // Check if it's ### header
    if (line.startsWith('### ')) {
      elements.push(<strong key={`h3-${lineIdx}`}>{line.slice(4)}</strong>);
      elements.push(<br key={`br-h3-${lineIdx}`} />);
      return;
    }
    // Check if it's #### header
    if (line.startsWith('#### ')) {
      elements.push(
        <strong key={`h4-${lineIdx}`} style={{ color: 'var(--text-primary)', display: 'block', marginTop: '12px', marginBottom: '4px' }}>
          {line.slice(5)}
        </strong>
      );
      return;
    }
    // Check if it's bullet list item: - content
    if (line.startsWith('- ')) {
      const content = line.slice(2);
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      const bulletElements = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`b-${lineIdx}-${partIdx}`} style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
        }
        return <span key={`s-${lineIdx}-${partIdx}`}>{part}</span>;
      });
      elements.push(
        <li key={`li-${lineIdx}`} style={{ marginLeft: '14px', marginBottom: '4px' }}>
          {bulletElements}
        </li>
      );
      return;
    }

    // Regular line, process bold markers
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const lineElements = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`b-${lineIdx}-${partIdx}`} style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={`s-${lineIdx}-${partIdx}`}>{part}</span>;
    });

    elements.push(<span key={`line-${lineIdx}`}>{lineElements}</span>);
    if (lineIdx < lines.length - 1) {
      elements.push(<br key={`br-${lineIdx}`} />);
    }
  });

  return <>{elements}</>;
}

export const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Quick transaction form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [pieType, setPieType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const { request } = useApi();
  const { addNotification } = useNotification();

  const fetchData = async () => {
    try {
      const txs = await request('/api/transactions');
      setTransactions(txs);
      
      const bdgts = await request('/api/budgets');
      setBudgets(bdgts);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await request('/api/ai/summary');
      setAiSummary(res.summary);
      
      // Animate summary entry
      gsap.fromTo(
        '.ai-summary-content',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
      setAiSummary('Failed to load AI summary. Please ensure your Gemini key or network connection is configured.');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (!loadingData) {
      gsap.fromTo(
        '.dashboard-stagger',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, [loadingData]);

  const handleMagicCategorize = async () => {
    if (!description || categorizing) return;
    setCategorizing(true);
    try {
      const result = await request('/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({ description })
      });
      if (result.category) {
        setCategory(result.category);
        addNotification('success', `AI classified "${description}" as ${result.category}`);
      }
    } catch (err) {
      console.error(err);
      addNotification('warning', 'Failed to auto-categorize description');
    } finally {
      setCategorizing(false);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || submitting) return;

    setSubmitting(true);
    const parsedAmount = parseFloat(amount);
    try {
      const newTx = await request('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          description,
          amount: parsedAmount,
          type,
          category,
          date,
        }),
      });

      setTransactions(prev => [newTx, ...prev]);
      
      addNotification('success', `Added ${type.toLowerCase()} of $${parsedAmount.toFixed(2)}: "${description}"`);

      // Budget check logic
      if (type === 'EXPENSE') {
        const matchingBudget = budgets.find(b => b.category === category);
        if (matchingBudget) {
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          
          const currentSpent = transactions
            .filter(tx => {
              const d = new Date(tx.date);
              return tx.category === category &&
                     tx.type === 'EXPENSE' &&
                     d.getMonth() === currentMonth &&
                     d.getFullYear() === currentYear;
            })
            .reduce((sum, tx) => sum + tx.amount, 0) + parsedAmount;

          if (currentSpent > matchingBudget.limitAmount) {
            addNotification('warning', `⚠️ Budget breached for "${category}"! Spent: $${currentSpent.toFixed(2)} / Limit: $${matchingBudget.limitAmount.toFixed(2)}`);
          } else if (currentSpent > matchingBudget.limitAmount * 0.85) {
            addNotification('info', `⚠️ Near budget limit for "${category}": Used ${((currentSpent / matchingBudget.limitAmount) * 100).toFixed(0)}%`);
          }
        }
      }

      setDescription('');
      setAmount('');
      
      // Trigger success animation
      gsap.fromTo(
        '.quick-add-success',
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.3, yoyo: true, repeat: 1 }
      );

      // Re-fetch data and AI summary
      fetchData();
      fetchSummary();
    } catch (err) {
      console.error(err);
      addNotification('warning', 'Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Math Calculations
  const netWorth = transactions.reduce((sum, tx) => {
    return tx.type === 'INCOME' ? sum + tx.amount : sum - tx.amount;
  }, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTxs
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyExpense = monthlyTxs
    .filter(tx => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Group transactions for Chart data (last 3 months)
  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap: Record<string, { name: string; Income: number; Expense: number; timestamp: number }> = {};

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const mName = months[txDate.getMonth()];
      const key = `${txDate.getFullYear()}-${txDate.getMonth()}`;

      if (!dataMap[key]) {
        dataMap[key] = {
          name: `${mName} ${txDate.getFullYear().toString().slice(-2)}`,
          Income: 0,
          Expense: 0,
          timestamp: txDate.getTime(),
        };
      }

      if (tx.type === 'INCOME') {
        dataMap[key].Income += tx.amount;
      } else {
        dataMap[key].Expense += tx.amount;
      }
    });

    return Object.values(dataMap)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-6); // show last 6 months max
  };

  const getCategoryPieData = () => {
    const dataMap: Record<string, number> = {};
    monthlyTxs
      .filter(tx => tx.type === pieType)
      .forEach(tx => {
        dataMap[tx.category] = (dataMap[tx.category] || 0) + tx.amount;
      });

    const COLORS = pieType === 'EXPENSE'
      ? ['#14b8a6', '#8b5cf6', '#3b82f6', '#f43f5e', '#eab308', '#ec4899']
      : ['#10b981', '#34d399', '#6ee7b7', '#0d9488', '#059669', '#3b82f6']; // green/emerald shades for Income
    return Object.entries(dataMap).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    }));
  };

  const chartData = getChartData();
  const pieData = getCategoryPieData();

  if (loadingData) {
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
      {/* Top Banner */}
      <header className="dashboard-stagger" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Executive Portal</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome to your decentralized wealth dashboard.</p>
      </header>

      {/* Grid of indicators */}
      <section className="dashboard-grid" style={{ marginBottom: '32px' }}>
        {/* Net Worth */}
        <GlassCard className="col-4 dashboard-stagger" glow="purple">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Net Assets</p>
              <h2 style={{ fontSize: '2rem', marginTop: '8px', color: 'var(--text-primary)' }}>
                ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div style={{ background: 'var(--accent-purple-glow)', padding: '10px', borderRadius: '12px', color: 'var(--accent-purple)' }}>
              <DollarSign size={20} />
            </div>
          </div>
        </GlassCard>

        {/* Monthly Income */}
        <GlassCard className="col-4 dashboard-stagger" glow="teal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Income (Month)</p>
              <h2 style={{ fontSize: '2rem', marginTop: '8px', color: 'var(--accent-teal)' }}>
                +${monthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div style={{ background: 'var(--accent-teal-glow)', padding: '10px', borderRadius: '12px', color: 'var(--accent-teal)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
        </GlassCard>

        {/* Monthly Expenses */}
        <GlassCard className="col-4 dashboard-stagger" glow="none">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Expenses (Month)</p>
              <h2 style={{ fontSize: '2rem', marginTop: '8px', color: 'var(--accent-coral)' }}>
                -${monthlyExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div style={{ background: 'var(--accent-coral-glow)', padding: '10px', borderRadius: '12px', color: 'var(--accent-coral)' }}>
              <TrendingDown size={20} />
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Main Dashboard Panel */}
      <section className="dashboard-grid" style={{ marginBottom: '32px' }}>
        {/* Left Side: Cash Flow Chart */}
        <GlassCard className="col-8 dashboard-stagger" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Cash Flow Dynamics</h3>
            <span className="badge badge-income" style={{ fontSize: '0.7rem' }}>Last 6 Months</span>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-teal)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-teal)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-glass-solid)', 
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)'
                  }} 
                />
                <Area type="monotone" dataKey="Income" stroke="var(--accent-teal)" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                <Area type="monotone" dataKey="Expense" stroke="var(--accent-purple)" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Right Side: AI Insights Summary */}
        <GlassCard className="col-4 dashboard-stagger" glow="purple" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={16} style={{ color: 'var(--accent-purple)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>FleetAI Copilot</h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', paddingRight: '4px' }}>
            {loadingSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <div style={{ height: '16px', background: 'var(--border-glass)', borderRadius: '4px', width: '90%' }} className="loading-pulse"></div>
                <div style={{ height: '16px', background: 'var(--border-glass)', borderRadius: '4px', width: '100%' }} className="loading-pulse"></div>
                <div style={{ height: '16px', background: 'var(--border-glass)', borderRadius: '4px', width: '75%' }} className="loading-pulse"></div>
                <div style={{ height: '16px', background: 'var(--border-glass)', borderRadius: '4px', width: '85%' }} className="loading-pulse"></div>
              </div>
            ) : (
              <div 
                className="ai-summary-content" 
                style={{ fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}
              >
                {renderSafeSummary(aiSummary)}
              </div>
            )}
          </div>
        </GlassCard>
      </section>

      {/* Row 3: Donut Chart and Quick Add */}
      <section className="dashboard-grid" style={{ marginBottom: '32px' }}>
        {/* Category breakdown pie chart */}
        <GlassCard className="col-4 dashboard-stagger" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.4rem', textAlign: 'center' }}>Category</h3>
            
            {/* Toggle switch for Expense vs Income */}
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.2)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <button
                type="button"
                onClick={() => setPieType('EXPENSE')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  background: pieType === 'EXPENSE' ? 'var(--accent-purple-glow)' : 'transparent',
                  border: 'none',
                  color: pieType === 'EXPENSE' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                }}
              >
                Expenses
              </button>
              <button
                type="button"
                onClick={() => setPieType('INCOME')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  background: pieType === 'INCOME' ? 'rgba(20, 184, 166, 0.25)' : 'transparent',
                  border: 'none',
                  color: pieType === 'INCOME' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                }}
              >
                Income
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No {pieType.toLowerCase()} data for this month</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{ 
                      background: 'var(--bg-glass-solid)', 
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Custom legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: '12px', fontSize: '0.75rem', justifyContent: 'center' }}>
            {pieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }}></span>
                <span style={{ color: 'var(--text-secondary)' }}>{item.name} (${item.value.toFixed(0)})</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Quick Add Form */}
        <GlassCard className="col-4 dashboard-stagger">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Quick Ledger Entry</h3>
          
          <form onSubmit={handleQuickAdd}>
            <div className="input-group">
              <label>Description</label>
              <input
                type="text"
                className="input-control"
                placeholder="Target Groceries"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-control"
                  placeholder="24.50"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Type</label>
                <select 
                  className="input-control" 
                  value={type}
                  onChange={e => {
                    const newType = e.target.value as 'INCOME' | 'EXPENSE';
                    setType(newType);
                    setCategory(newType === 'INCOME' ? 'Salary' : 'Food');
                  }}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>Category</label>
                <button
                  type="button"
                  className="btn-sparkle"
                  onClick={handleMagicCategorize}
                  disabled={!description || categorizing}
                  title="Auto-detect category from description using AI"
                >
                  <Sparkles size={12} className={categorizing ? "loading-spin" : ""} />
                  <span>{categorizing ? 'Thinking...' : 'Magic Categorize 🔮'}</span>
                </button>
              </div>
              {type === 'EXPENSE' ? (
                <select className="input-control" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Food">Food</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Housing">Housing</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <select className="input-control" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Salary">Salary</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Investments">Investments</option>
                  <option value="Other">Other</option>
                </select>
              )}
            </div>

            <div className="input-group" style={{ marginBottom: '16px' }}>
              <label>Date</label>
              <input
                type="date"
                className="input-control"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              <Plus size={16} />
              <span>Record Transaction</span>
            </button>
          </form>
        </GlassCard>

        {/* Space Spacer for balance/layout */}
        <GlassCard className="col-4 dashboard-stagger" glow="teal" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--accent-teal-glow)', padding: '16px', borderRadius: '50%', color: 'var(--accent-teal)', marginBottom: '16px' }}>
            <TrendingUp size={28} />
          </div>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Optimized Flow Rate</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', maxWidth: '220px' }}>
            AI has audited your spending dynamics. Your current savings capacity is standing at <strong>{monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome * 100).toFixed(0) : 0}%</strong> of monthly income reserves.
          </p>
        </GlassCard>
      </section>

      {/* Row 4: Wide Ledger Table */}
      <section className="dashboard-grid" style={{ marginBottom: '32px' }}>
        <GlassCard className="col-12 dashboard-stagger" style={{ overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Recent Ledger Activity</h3>
          
          <div style={{ overflowX: 'auto' }}>
            {transactions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>No transactions recorded.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Description</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 8).map(tx => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{tx.description}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${tx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}`}>
                          {tx.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'INCOME' ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                        {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>
      </section>
    </main>
  );
};

export default Dashboard;

