import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertTriangle, UserX, ShieldAlert } from 'lucide-react';

// ── Error banner component ────────────────────────────────────────────────────
const ErrorBanner = ({ code, message }) => {
  if (!message) return null;

  const config = {
    USER_NOT_FOUND: {
      icon: <UserX className="h-5 w-5 flex-shrink-0" />,
      bg: 'bg-amber-50 border-amber-400 text-amber-900',
      hint: (
        <span>
          New here?{' '}
          <Link to="/register" className="font-bold underline underline-offset-2 hover:text-amber-700">
            Create an account
          </Link>
        </span>
      ),
    },
    WRONG_PASSWORD: {
      icon: <ShieldAlert className="h-5 w-5 flex-shrink-0" />,
      bg: 'bg-red-50 border-red-400 text-red-900',
      hint: <span>Double-check your password and try again.</span>,
    },
    ACCOUNT_INACTIVE: {
      icon: <AlertTriangle className="h-5 w-5 flex-shrink-0" />,
      bg: 'bg-orange-50 border-orange-400 text-orange-900',
      hint: null,
    },
  };

  const style = config[code] || {
    icon: <AlertTriangle className="h-5 w-5 flex-shrink-0" />,
    bg: 'bg-red-50 border-red-400 text-red-900',
    hint: null,
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${style.bg} animate-fade-in`}>
      {style.icon}
      <div className="text-sm font-semibold leading-snug">
        <p>{message}</p>
        {style.hint && <p className="mt-1 font-medium opacity-80">{style.hint}</p>}
      </div>
    </div>
  );
};

// ── Login page ────────────────────────────────────────────────────────────────
export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);   // { message, code }
  const [errorField, setErrorField] = useState(null); // 'email' | 'password' | null

  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) { setError(null); setErrorField(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorField(null);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError({ message: result.message, code: result.code });
      if (result.code === 'USER_NOT_FOUND') setErrorField('email');
      if (result.code === 'WRONG_PASSWORD') setErrorField('password');
    }
    
    setLoading(false);
  };

  const inputClass = (field) =>
    `input-field pl-11 transition-all ${
      errorField === field
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
        : ''
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="max-w-md w-full animate-fade-in">

        {/* Card */}
        <div className="card-flat p-0 overflow-hidden border border-dark shadow-[0_6px_0_0_#191A23]">

          {/* Header strip */}
          <div className="bg-lime px-8 py-7 border-b-2 border-dark">
            <div className="inline-block bg-dark text-lime text-xs font-bold px-3 py-1 rounded-xl mb-3 tracking-widest uppercase">
              Health Predictor
            </div>
            <h1 className="text-3xl font-black text-dark">Welcome back</h1>
            <p className="text-dark/60 font-medium mt-1">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">

            {/* Inline error banner */}
            {error && <ErrorBanner code={error.code} message={error.message} />}

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-dark mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 ${errorField === 'email' ? 'text-red-400' : 'text-dark/30'}`} />
                <input
                  type="email"
                  name="email"
                  id="login-email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={inputClass('email')}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {errorField === 'email' && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">No account found with this email.</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-dark mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 ${errorField === 'password' ? 'text-red-400' : 'text-dark/30'}`} />
                <input
                  type="password"
                  name="password"
                  id="login-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={inputClass('password')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              {errorField === 'password' && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">Incorrect password. Please try again.</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full btn-lime text-lg py-4 flex items-center justify-center gap-3 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {/* Register link */}
            <p className="text-center text-sm text-dark/60 font-medium pt-2 border-t border-dark/10">
              Don't have an account?{' '}
              <Link to="/register" className="text-dark font-bold hover:text-lime transition-colors underline underline-offset-2">
                Create one free
              </Link>
            </p>
          </form>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-dark/30 font-medium mt-6">
          For educational use only · Not a medical device
        </p>
      </div>
    </div>
  );
};
