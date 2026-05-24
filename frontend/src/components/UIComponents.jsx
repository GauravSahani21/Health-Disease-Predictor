import clsx from 'clsx';
import { Cpu, Database, Zap, Info, ChevronRight, AlertCircle, Heart } from 'lucide-react';

export const MainResultCard = ({ value, confidence, severity, type = "Prediction Result" }) => {
  return (
    <div className="bg-white border-2 border-dark rounded-[2rem] p-6 shadow-[0_4px_0_0_#191A23] mb-6 animate-fade-in text-left">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] font-bold text-dark/40 uppercase tracking-widest block mb-1">
            {confidence !== undefined ? type : "Model Output"}
          </span>
          <h2 className="text-2xl font-black text-dark leading-tight">
            {value}
          </h2>
        </div>
        {severity && <SeverityBadge severity={severity} />}
      </div>

      {confidence !== undefined && (
        <div className="mt-4 pt-4 border-t border-dark/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-dark/40 uppercase">Model Confidence</span>
            <span className="text-sm font-mono font-bold text-dark">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="w-2/3 ml-4">
            <div className="w-full bg-dark/10 h-2 rounded-full overflow-hidden">
              <div className="bg-lime h-full rounded-full transition-all duration-1000" style={{ width: `${confidence * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PredictionInfoBox = ({ steps }) => {
  return (
    <div className="mt-6 bg-light border border-dark/10 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-dark mb-3 flex items-center gap-2 uppercase tracking-tight">
        <Info className="h-4 w-4 text-dark/40" />
        How This Prediction Works
      </h3>
      <ul className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-dark/60">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-lime text-dark flex items-center justify-center font-bold text-[10px] border border-dark/20">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ModelSpecsBadge = ({ type, dataset }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-4">
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-lime text-dark border border-dark/20 uppercase tracking-wider">
        <Zap className="h-3 w-3 mr-1" />
        AI Powered
      </span>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-light text-dark/60 border border-dark/10 tracking-wider">
        <Cpu className="h-3 w-3 mr-1 text-dark/40" />
        {type}
      </span>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-light text-dark/60 border border-dark/10 tracking-wider">
        <Database className="h-3 w-3 mr-1 text-dark/40" />
        {dataset}
      </span>
    </div>
  );
};

export const AIDiagnosticBadge = ({ modelName = 'Standard AI Engine' }) => {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-mono font-medium bg-dark text-white/70 border border-dark">
      <span className="w-1.5 h-1.5 rounded-full bg-lime mr-1.5 animate-pulse"></span>
      ENG: {modelName}
    </span>
  );
};

export const SeverityBadge = ({ severity }) => {
  const s = severity?.toLowerCase() || '';

  const styles = {
    minor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    low: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    clear: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    mild: 'bg-sky-100 text-sky-800 border-sky-300',
    moderate: 'bg-amber-100 text-amber-800 border-amber-300',
    soon: 'bg-amber-100 text-amber-800 border-amber-300',
    severe: 'bg-orange-100 text-orange-800 border-orange-300',
    urgent: 'bg-red-100 text-red-800 border-red-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
    emergency: 'bg-red-100 text-red-800 border-red-300',
  };

  const badgeStyle = styles[s] || 'bg-light text-dark/70 border-dark/20';

  const icon = {
    minor: '✓', low: '✓', clear: '✨', mild: '🔹',
    moderate: '⚠', soon: '⏰', severe: '⚠️',
    urgent: '🚨', critical: '🚨', emergency: '🚑',
  }[s] || 'ℹ️';

  return (
    <span className={`${badgeStyle} border px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide inline-flex items-center`}>
      <span className="mr-1">{icon}</span>
      {severity}
    </span>
  );
};

export const ConfidenceBar = ({ condition, score, value }) => {
  const percentage = value !== undefined ? value : (score * 100);
  const displayPercentage = typeof percentage === 'number' ? percentage.toFixed(2) : '0.00';

  return (
    <div className="mb-4">
      {condition && (
        <div className="flex justify-between items-end mb-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-dark/40 font-bold uppercase tracking-wider">Diagnostic Target</span>
            <span className="font-semibold text-dark leading-tight">{condition}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-dark/40 font-bold uppercase tracking-wider">Confidence</span>
            <span className="font-mono text-dark font-bold">{displayPercentage}%</span>
          </div>
        </div>
      )}
      <div className="w-full bg-dark/10 rounded-full h-3 overflow-hidden">
        <div
          className="bg-lime h-full rounded-full transition-all duration-1000 ease-out relative border-r-2 border-dark/20"
          style={{ width: `${displayPercentage}%` }}
        >
        </div>
      </div>
    </div>
  );
};

export const EvidenceChips = ({ evidence }) => {
  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {evidence.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-lime/30 text-dark border border-dark/10"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

export const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-14 h-14 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-dark/10"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-lime animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-dark animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
      </div>
      <p className="text-dark/50 font-medium">{text}</p>
    </div>
  );
};
