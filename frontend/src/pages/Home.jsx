import { Link } from 'react-router-dom';
import { Brain, Scan, ArrowRight, Sparkles, Image, Shield, Zap, ArrowUpRight, MessageSquare, Activity } from 'lucide-react';

const SERVICES = [
  {
    title: 'Face Scan',
    subtitle: 'AI Dermatology',
    to: '/face-scan',
    icon: Scan,
    variant: 'light',     // light gray bg + lime tag
    features: ['AI skin analysis', 'Medicine tips', 'Diet & lifestyle'],
  },
  {
    title: 'Brain Scan',
    subtitle: 'MRI Analysis',
    to: '/brain-scan',
    icon: Brain,
    variant: 'lime',      // lime bg + dark tag
    features: ['AI brain analysis', 'Brain-healthy diet', 'Emergency alerts'],
  },
  {
    title: 'Skin Analysis',
    subtitle: 'Image Detection',
    to: '/predict-image',
    icon: Image,
    variant: 'dark',      // dark bg + lime text
    features: ['Image detection', 'Heatmap analysis', 'Treatment tips'],
  },
  {
    title: 'Symptom Checker',
    subtitle: 'AI Text Analysis',
    to: '/predict-text',
    icon: MessageSquare,
    variant: 'light',     // light gray bg + lime tag
    features: ['NLP symptom parsing', 'Instant triage', 'Medical advice'],
  },
];

const PROCESS_STEPS = [
  { num: '01', title: 'Upload or Describe', desc: 'Upload a medical scan or describe your symptoms in natural language.' },
  { num: '02', title: 'AI Analysis', desc: 'Our models (EfficientNet, ViT, Ensemble) process your data in seconds.' },
  { num: '03', title: 'Get Predictions', desc: 'Receive disease predictions with confidence scores and severity levels.' },
  { num: '04', title: 'Health Advice', desc: 'Get AI-generated medicines, diet, lifestyle, and urgency recommendations.' },
];

function ServiceCard({ title, subtitle, to, icon: Icon, variant, features }) {
  const styles = {
    light: {
      card: 'bg-light border-dark',
      shadow: 'shadow-[0_5px_0_0_#191A23]',
      hoverShadow: 'hover:shadow-[0_8px_0_0_#191A23]',
      tag: 'bg-lime',
      tagText: 'text-dark',
      title: 'text-dark',
      text: 'text-dark/60',
      arrow: 'bg-dark text-lime',
      dot: 'bg-dark',
    },
    lime: {
      card: 'bg-lime border-dark',
      shadow: 'shadow-[0_5px_0_0_#191A23]',
      hoverShadow: 'hover:shadow-[0_8px_0_0_#191A23]',
      tag: 'bg-white',
      tagText: 'text-dark',
      title: 'text-dark',
      text: 'text-dark/70',
      arrow: 'bg-dark text-lime',
      dot: 'bg-dark',
    },
    dark: {
      card: 'bg-dark border-dark',
      shadow: 'shadow-[0_5px_0_0_#B9FF66]',
      hoverShadow: 'hover:shadow-[0_8px_0_0_#B9FF66]',
      tag: 'bg-lime',
      tagText: 'text-dark',
      title: 'text-white',
      text: 'text-white/60',
      arrow: 'bg-lime text-dark',
      dot: 'bg-lime',
    },
  };
  const s = styles[variant];

  return (
    <Link
      to={to}
      className={`group block rounded-[2.5rem] border p-7 md:p-8 ${s.card} ${s.shadow} ${s.hoverShadow} hover:translate-y-[-3px] transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className={`inline-block ${s.tag} ${s.tagText} text-xl md:text-2xl font-bold px-3 py-0.5 rounded-lg`}>
            {title}
          </span>
          <p className={`${s.text} text-sm mt-2 font-medium`}>{subtitle}</p>
        </div>
        <div className={`${s.arrow} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 group-hover:rotate-[-30deg] transition-transform duration-300`}>
          <ArrowUpRight className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <Icon className={`h-16 w-16 ${variant === 'dark' ? 'text-lime/30' : 'text-dark/10'} flex-shrink-0`} strokeWidth={1} />
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className={`flex items-center gap-2 text-sm ${s.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}


function ProcessStep({ num, title, desc, isLast }) {
  return (
    <div className="group">
      <div className="bg-light rounded-[2.5rem] border border-dark shadow-[0_5px_0_0_#191A23] p-6 md:p-8 hover:bg-lime transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <span className="text-4xl md:text-5xl font-bold text-dark/20 group-hover:text-dark/40 transition-colors">
              {num}
            </span>
            <h3 className="text-lg md:text-xl font-bold text-dark">{title}</h3>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-dark flex items-center justify-center bg-light group-hover:bg-lime transition-colors">
            <span className="text-dark text-xl font-light group-hover:rotate-45 transition-transform duration-300">+</span>
          </div>
        </div>
        <div className="overflow-hidden max-h-0 group-hover:max-h-40 transition-all duration-500 ease-out">
          <div className="border-t border-dark/20 mt-5 pt-5">
            <p className="text-dark/70 text-sm md:text-base">{desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


export const Home = () => {
  return (
    <div className="min-h-screen bg-white">

      {/* ===== HERO SECTION ===== */}
      <section className="pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left */}
            <div className="animate-fade-in">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-dark leading-[1.05] mb-6">
                Your Health,
                <br />
                <span className="relative">
                  Intelligently
                  <span className="absolute bottom-1 left-0 w-full h-3 bg-lime -z-10 rounded" />
                </span>
                <br />
                Analyzed
              </h1>
              <p className="text-dark/60 text-lg md:text-xl max-w-lg mb-8 leading-relaxed">
                Advanced AI-powered health analysis with personalized medicines, diet, and lifestyle recommendations.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/face-scan" className="btn-lime inline-flex items-center gap-2 text-base">
                  Start Analysis
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#services" className="btn-outline inline-flex items-center gap-2 text-base">
                  Explore Tools
                </a>
              </div>
            </div>

            {/* Right — Decorative */}
            <div className="hidden lg:flex justify-center animate-slide-in-right">
              <div className="relative">
                {/* Main floating card */}
                <div className="bg-dark text-white rounded-[2.5rem] p-8 w-80 shadow-[0_8px_0_0_#B9FF66] border border-dark">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-lime animate-pulse" />
                    <span className="text-lime text-sm font-semibold tracking-wider uppercase">AI Core Active</span>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-white/50 text-xs mb-1">Prediction</p>
                      <p className="text-lg font-bold">Dermatitis</p>
                      <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                        <div className="bg-lime h-2 rounded-full" style={{ width: '87%' }} />
                      </div>
                      <p className="text-lime text-xs mt-1 font-medium">87% confidence</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-white/50 text-xs mb-1">Severity</p>
                      <span className="bg-lime/20 text-lime text-xs font-bold px-3 py-1 rounded-full">Minor</span>
                    </div>
                  </div>
                </div>
                {/* Floating accent elements */}
                <div className="absolute -top-6 -right-6 bg-lime w-20 h-20 rounded-2xl border border-dark shadow-[0_4px_0_0_#191A23] flex items-center justify-center animate-float">
                  <Sparkles className="h-8 w-8 text-dark" />
                </div>
                <div className="absolute -bottom-4 -left-8 bg-light w-28 h-14 rounded-2xl border border-dark shadow-[0_3px_0_0_#191A23] flex items-center justify-center gap-2 animate-bounce-gentle">
                  <Shield className="h-5 w-5 text-dark" />
                  <span className="text-xs font-bold text-dark">Privacy First</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARTNERS / TRUST BAR ===== */}
      <section className="py-8 bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {['EfficientNet', 'TensorFlow', 'HAM10000', 'Brain MRI', 'Scikit-Learn'].map((tech) => (
              <span key={tech} className="text-white/40 font-bold text-sm md:text-base tracking-wider uppercase hover:text-lime transition-colors cursor-default">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SERVICES SECTION ===== */}
      <section id="services" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header — Positivus style */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 mb-12">
            <h2 className="section-tag">AI Analysis Tools</h2>
            <p className="text-dark/60 max-w-md text-base">
              Upload scans or images for AI-powered disease detection with personalized health advice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <ServiceCard key={service.to} {...service} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-light rounded-[2.5rem] border border-dark shadow-[0_5px_0_0_#191A23] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-dark mb-2">
                Get comprehensive AI health advice
              </h3>
              <p className="text-dark/60 text-base">
                Every analysis includes medicines, diet, lifestyle, and urgency recommendations.
              </p>
            </div>
            <Link to="/face-scan" className="btn-lime whitespace-nowrap inline-flex items-center gap-2 flex-shrink-0">
              Try Now <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== AI FEATURES SECTION ===== */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 mb-12">
            <h2 className="section-tag-dark">AI Health Advisor</h2>
            <p className="text-dark/60 max-w-md text-base">
              Every analysis includes personalized recommendations powered by advanced AI.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { emoji: '💊', title: 'Medicines', desc: 'OTC medications with dosage and usage instructions' },
              { emoji: '🥗', title: 'Diet', desc: 'Foods to eat and avoid with nutritional reasoning' },
              { emoji: '🏃', title: 'Lifestyle', desc: 'Sleep, exercise, stress management tips' },
              { emoji: '⚠️', title: 'Warnings', desc: 'When to seek immediate medical attention' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="bg-light rounded-[2rem] border border-dark/10 p-6 hover:border-dark hover:shadow-[0_4px_0_0_#191A23] hover:translate-y-[-2px] transition-all duration-300">
                <div className="text-4xl mb-4">{emoji}</div>
                <h3 className="font-bold text-dark text-lg mb-2">{title}</h3>
                <p className="text-dark/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ===== HOW IT WORKS (Process Steps) ===== */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 mb-12">
            <h2 className="section-tag-dark">How It Works</h2>
            <p className="text-dark/60 max-w-md text-base">
              From upload to health advice in four simple steps.
            </p>
          </div>

          <div className="space-y-5">
            {PROCESS_STEPS.map((step, i) => (
              <ProcessStep key={step.num} {...step} isLast={i === PROCESS_STEPS.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE US ===== */}
      <section className="py-16 md:py-24 bg-dark rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose <span className="bg-lime text-dark px-3 py-1 rounded-lg">Health Predictor</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Trusted by researchers and students for AI-powered health analysis.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'AI Powered', desc: 'Advanced machine learning models including EfficientNet, ViT, and ensemble methods for accurate predictions.' },
              { icon: Shield, title: 'Privacy First', desc: 'Your data is processed locally and never stored permanently. Complete privacy and security.' },
              { icon: Activity, title: 'Actionable Insights', desc: 'Get comprehensive analysis with evidence-based medicines, diet, lifestyle, and urgency recommendations.' },
            ].map(({ icon: FeatIcon, title, desc }) => (
              <div key={title} className="text-center group">
                <div className="bg-lime w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-dark shadow-[0_4px_0_0_#B9FF66] group-hover:shadow-[0_6px_0_0_#B9FF66] group-hover:translate-y-[-2px] transition-all duration-300">
                  <FeatIcon className="h-7 w-7 text-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <Link to="/face-scan" className="btn-lime inline-flex items-center gap-2 text-lg py-4 px-10">
              Start Analysis Now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
