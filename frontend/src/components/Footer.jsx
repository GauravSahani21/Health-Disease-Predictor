import { Link } from 'react-router-dom';
import { Activity, AlertTriangle } from 'lucide-react';

const DISCLAIMER_TEXT = "This tool is developed for ACADEMIC AND RESEARCH PURPOSES ONLY. It provides informational guidance and is not a medical diagnosis. Predictions should be confirmed by qualified healthcare professionals. Using curated datasets like HAM10000 and Brain MRI clinical archives.";

const NAV_LINKS = [
  { to: '/predict-text', label: 'Symptom Checker' },
  { to: '/face-scan', label: 'Face Scan' },
  { to: '/brain-scan', label: 'Brain Scan' },
  { to: '/predict-image', label: 'Skin Analysis' },
];

export const Footer = () => {
  return (
    <footer className="bg-dark text-white">
      {/* Disclaimer Banner */}
      <div className="bg-lime border-t border-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-dark flex-shrink-0 mt-0.5" />
            <p className="text-sm text-dark">
              <strong>Medical Disclaimer:</strong> {DISCLAIMER_TEXT}
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Logo & About */}
          <div className="md:col-span-4">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="bg-lime w-8 h-8 rounded-lg flex items-center justify-center border border-dark">
                <Activity className="h-4 w-4 text-dark" />
              </div>
              <span className="text-lg font-bold text-white">
                Health<span className="text-white/50">Predictor</span>
              </span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed">
              Advanced machine learning for preliminary health insights.
              Always consult healthcare professionals for medical advice.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Analysis Tools</h3>
            <ul className="space-y-2.5">
              {NAV_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-white/40 hover:text-lime transition-colors text-sm">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Academic Context */}
          <div className="md:col-span-3">
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Technology</h3>
            <ul className="space-y-2.5">
              {[
                'Datasets: HAM10000, MRI Clinical Sets',
                'Models: CNN (EfficientNet), ViT, Ensemble',
                'Project: AI Diagnostic Research Suite',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-white/40 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime flex-shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency */}
          <div className="md:col-span-2">
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Emergency</h3>
            <p className="text-white/40 text-sm mb-3">
              For medical emergencies, call your local emergency services immediately.
            </p>
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2">
              <p className="text-red-400 text-sm font-bold">
                911 (US) / 112 (Global)
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs uppercase tracking-[0.2em]">
            © 2026 Health Predictor · Academic & Research Edition
          </p>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Contact'].map((link) => (
              <a key={link} href="#" className="text-white/30 hover:text-lime text-xs uppercase tracking-wider transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
