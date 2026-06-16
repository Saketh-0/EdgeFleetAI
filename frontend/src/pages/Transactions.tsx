import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { GlassCard } from '../components/GlassCard';
import { useNotification } from '../context/NotificationContext';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Trash2, 
  UploadCloud, 
  Calendar, 
  X,
  FileText,
  CheckCircle,
  FileImage,
  Sparkles
} from 'lucide-react';
import gsap from 'gsap';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
}

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // OCR/Receipt Upload States
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const { request } = useApi();
  const { addNotification } = useNotification();

  const fetchTransactions = async () => {
    try {
      const data = await request('/api/transactions');
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo(
        '.ledger-row',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [loading, searchQuery, filterType, filterCategory]);

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

  const handleCreate = async (e: React.FormEvent) => {
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
      setShowAddModal(false);
      
      addNotification('success', `Recorded flow: "${description}" ($${parsedAmount.toFixed(2)})`);

      // Reset form
      setDescription('');
      setAmount('');
      setType('EXPENSE');
      setCategory('Food');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error(err);
      addNotification('warning', 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;
    if (!window.confirm(`Are you sure you want to delete "${txToDelete.description}"?`)) return;
    
    try {
      await request(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      addNotification('info', `Deleted record: "${txToDelete.description}"`);
    } catch (err) {
      console.error(err);
      addNotification('warning', 'Failed to delete transaction');
    }
  };

  // Mock receipt upload processing
  const handleReceiptPreset = async (presetName: string) => {
    setUploadLoading(true);
    setSelectedPreset(presetName);
    setUploadMessage('Processing receipt via EdgeFleet AI OCR...');

    try {
      const res = await request('/api/transactions/parse-receipt', {
        method: 'POST',
        body: JSON.stringify({
          filename: `${presetName}_receipt.png`,
          imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANS...', 
        }),
      });

      setUploadMessage(res.message);
      addNotification('success', `Parsed receipt successfully: ${res.description} ($${res.amount})`);
      
      // Auto-populate form with OCR parameters
      setDescription(res.description);
      setAmount(res.amount.toString());
      setCategory(res.category);
      setType(res.type);
      setDate(res.date);

      setTimeout(() => {
        setShowUploadModal(false);
        setShowAddModal(true); // Open the ledger form prefilled
        setUploadLoading(false);
        setUploadMessage('');
        setSelectedPreset(null);
      }, 1000);

    } catch (err) {
      console.error(err);
      setUploadMessage('OCR Parsing failed. Please enter details manually.');
      setUploadLoading(false);
      addNotification('warning', 'Failed to parse receipt');
    }
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Description', 'Amount', 'Type', 'Category', 'Date'];
    const rows = filteredTransactions.map(tx => [
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.type,
      tx.category,
      new Date(tx.date).toISOString().split('T')[0]
    ]);

    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EdgeFleet_Financial_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification('info', `Exported ledger checklist: ${filteredTransactions.length} records exported.`);
  };

  // Search/Filter logic
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const matchesCategory = filterCategory === 'ALL' || tx.category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  const categoriesList = ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Housing', 'Healthcare', 'Salary', 'Freelance', 'Investments', 'Other'];

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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Financial Ledger</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review, filter, and audit all transaction flows.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)}>
            <UploadCloud size={16} />
            <span>Scan Receipt</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Record Flow</span>
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <GlassCard style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="input-with-icon" style={{ flex: 1, minWidth: '240px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="input-control"
              placeholder="Search ledger details or categories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select className="input-control" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="ALL">All Flows</option>
                <option value="INCOME">Inflow (Income)</option>
                <option value="EXPENSE">Outflow (Expense)</option>
              </select>
            </div>

            <select className="input-control" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="ALL">All Categories</option>
              {categoriesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Transactions Table Ledger */}
      <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {filteredTransactions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 0' }}>No transactions match criteria.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', background: 'rgba(0,0,0,0.1)' }}>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="ledger-row" style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-primary)' }}>{tx.description}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge ${tx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}`}>
                        {tx.category}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'INCOME' ? 'var(--accent-teal)' : 'var(--text-primary)', fontSize: '1rem' }}>
                      {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <button 
                        className="btn-logout" 
                        onClick={() => handleDelete(tx.id)}
                        style={{ color: 'var(--text-muted)' }}
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* Record Flow Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <GlassCard className="modal-content-panel" glow="purple" style={{ maxWidth: '450px', width: '100%', position: 'relative' }}>
            <button className="chat-close" style={{ position: 'absolute', top: '20px', right: '20px' }} onClick={() => setShowAddModal(false)}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '20px', fontSize: '1.4rem' }}>Record Asset Flow</h2>
            
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label>Description</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Grocery payment"
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
                    placeholder="25.00"
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }} disabled={submitting}>
                  <span>Record Transaction</span>
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Scan Receipt Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <GlassCard className="modal-content-panel" glow="teal" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
            <button className="chat-close" style={{ position: 'absolute', top: '20px', right: '20px' }} onClick={() => setShowUploadModal(false)}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '12px', fontSize: '1.4rem' }}>EdgeFleet AI OCR Receipt Scanner</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '24px' }}>
              Upload an image of a receipt to automatically parse description, category, and amounts. Select a preset below to simulate:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <button 
                className={`btn btn-secondary ${selectedPreset === 'starbucks' ? 'glow-teal' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '16px', borderStyle: 'dashed' }}
                onClick={() => handleReceiptPreset('starbucks')}
                disabled={uploadLoading}
              >
                <FileText size={20} style={{ color: 'var(--accent-teal)' }} />
                <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                  <div style={{ fontWeight: 600 }}>Starbucks Coffee Receipt</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulate coffee transaction OCR ($6.75)</div>
                </div>
              </button>

              <button 
                className={`btn btn-secondary ${selectedPreset === 'uber' ? 'glow-teal' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '16px', borderStyle: 'dashed' }}
                onClick={() => handleReceiptPreset('uber')}
                disabled={uploadLoading}
              >
                <FileImage size={20} style={{ color: 'var(--accent-purple)' }} />
                <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                  <div style={{ fontWeight: 600 }}>Uber Taxi Receipt</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulate transport OCR ($24.80)</div>
                </div>
              </button>

              <button 
                className={`btn btn-secondary ${selectedPreset === 'wholefoods' ? 'glow-teal' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '16px', borderStyle: 'dashed' }}
                onClick={() => handleReceiptPreset('wholefoods')}
                disabled={uploadLoading}
              >
                <FileText size={20} style={{ color: 'var(--accent-yellow)' }} />
                <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                  <div style={{ fontWeight: 600 }}>Whole Foods Market Receipt</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulate food grocery OCR ($89.34)</div>
                </div>
              </button>
            </div>

            {uploadMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)', borderRadius: '8px', color: 'var(--accent-teal)', fontSize: '0.85rem' }}>
                {uploadLoading ? <div className="loading-pulse" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-teal)' }}></div> : <CheckCircle size={16} />}
                <span>{uploadMessage}</span>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </main>
  );
};

export default Transactions;

