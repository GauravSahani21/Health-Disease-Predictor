import { Link, useLocation } from 'react-router-dom';
import { Activity, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/predict-text', label: 'Symptom Checker' },
  { to: '/face-scan', label: 'Face Scan' },
  { to: '/brain-scan', label: 'Brain Scan' },
  { to: '/predict-image', label: 'Skin Analysis' },
];

export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-dark/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-lime w-9 h-9 rounded-xl flex items-center justify-center border border-dark shadow-[0_2px_0_0_#191A23] group-hover:shadow-[0_3px_0_0_#191A23] group-hover:translate-y-[-1px] transition-all">
              <Activity className="h-5 w-5 text-dark" />
            </div>
            <span className="text-xl font-bold text-dark tracking-tight">
              Health<span className="text-dark/60">Predictor</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  location.pathname === to
                    ? 'bg-lime text-dark border border-dark shadow-[0_2px_0_0_#191A23]'
                    : 'text-dark/70 hover:bg-light hover:text-dark'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile Toggle */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="hidden md:inline-flex text-sm py-2 px-3 font-medium text-dark/70 hover:text-dark">
                  Dashboard
                </Link>
                <button onClick={logout} className="hidden md:inline-flex btn-outline text-sm py-2 px-5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="hidden md:inline-flex btn-lime text-sm py-2 px-5">
                Login / Register
              </Link>
            )}
            
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl text-dark hover:bg-light transition-colors"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden py-4 border-t border-dark/10 animate-fade-in">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    location.pathname === to
                      ? 'bg-lime text-dark border border-dark'
                      : 'text-dark/70 hover:bg-light'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/face-scan"
                className="btn-lime text-center mt-2"
                onClick={() => setMobileOpen(false)}
              >
                Start Analysis
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
