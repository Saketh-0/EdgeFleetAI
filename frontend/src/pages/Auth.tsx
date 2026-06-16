import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeroCanvas } from '../components/HeroCanvas';
import { GlassCard } from '../components/GlassCard';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import gsap from 'gsap';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Entrance animations
  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        '.auth-hero-panel',
        { x: -100, opacity: 0 },
        { x: 0, opacity: 1, duration: 1, ease: 'power4.out' }
      );
      tl.fromTo(
        '.auth-form-card',
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.2)' },
        '-=0.6'
      );
      tl.fromTo(
        '.reveal-anim',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' },
        '-=0.4'
      );
    }
  }, []);

  // Animate form switch
  const handleToggle = () => {
    gsap.to(formRef.current, {
      opacity: 0,
      x: isLogin ? 20 : -20,
      duration: 0.2,
      onComplete: () => {
        setIsLogin(!isLogin);
        setError('');
        setName('');
        setEmail('');
        setPassword('');
        gsap.fromTo(
          formRef.current,
          { opacity: 0, x: isLogin ? -20 : 20 },
          { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }
        );
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address (e.g. user@domain.com).');
      return;
    }

    if (!isLogin) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
      if (!passwordRegex.test(password)) {
        setError('Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character.');
        return;
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    setError('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email: normalizedEmail, password } 
      : { name, email: normalizedEmail, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="auth-page-container">
      {/* Background radial glow */}
      <div className="radial-glow-bg" />

      {/* Left side: Interactive 3D Hologram */}
      <div className="auth-hero-panel">
        <div className="hero-content reveal-anim">
          <div className="hero-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/favicon.svg" alt="EdgeFleet Logo" style={{ width: '36px', height: '36px', filter: 'drop-shadow(0 0 8px var(--accent-purple-glow))' }} />
            <span className="brand-text">EdgeFleet</span>
            <span className="brand-dot">.AI</span>
          </div>
          <h1>Autonomous Intelligence for Your Wealth.</h1>
          <p>
            An intelligent, production-grade expense optimizer driven by real-time tracking, 
            interactive summaries, and predictive LLM integrations.
          </p>
        </div>
        <div className="canvas-wrapper">
          <HeroCanvas />
        </div>
      </div>

      {/* Right side: Auth forms */}
      <div className="auth-form-panel">
        <GlassCard className="auth-form-card" glow="purple">
          <form ref={formRef} onSubmit={handleSubmit} className="auth-form">
            <div className="form-header reveal-anim">
              <span className="badge badge-income">
                <ShieldCheck size={12} style={{ marginRight: '4px' }} />
                Secure Portal
              </span>
              <h2>{isLogin ? 'Welcome Back' : 'Get Started'}</h2>
              <p>{isLogin ? 'Enter credentials to manage assets' : 'Create an account to track expenses'}</p>
            </div>

            {error && <div className="error-message reveal-anim">{error}</div>}

            {!isLogin && (
              <div className="input-group reveal-anim">
                <label>Name</label>
                <div className="input-with-icon">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    className="input-control"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="input-group reveal-anim">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  className="input-control"
                  placeholder="user@edgefleet.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group reveal-anim">
              <label>Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '48px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    zIndex: 10
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block reveal-anim" disabled={loading}>
              <span>{loading ? 'Processing...' : isLogin ? 'Authenticate' : 'Register Account'}</span>
              <ArrowRight size={16} />
            </button>

            <div className="form-footer reveal-anim">
              <span>{isLogin ? "Don't have an account?" : 'Already registered?'}</span>
              <button type="button" className="btn-link" onClick={handleToggle}>
                {isLogin ? 'Create one now' : 'Sign in here'}
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default Auth;
