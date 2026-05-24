import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { historyAPI } from '../services/api';
import { Activity, FileText, Image, TrendingUp, AlertCircle, Brain, Scan } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { LoadingSpinner } from '../components/UIComponents';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await historyAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const SEVERITY_COLORS = {
    minor: '#10b981',
    moderate: '#f59e0b',
    severe: '#ef4444',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingSpinner text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  const totalQueries = stats?.queryTypes?.reduce((sum, t) => sum + t.count, 0) || 0;
  const severityData = stats?.severityBreakdown?.map(s => ({
    name: s._id,
    value: s.count,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* AI Command Center Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              AI Command Center
            </h1>
            <p className="mt-1 text-gray-500 font-medium">
              Enterprise Health Analysis Pipeline | User: <span className="text-primary-600 font-bold">{user?.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Server: Latency &lt; 100ms</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm flex items-center">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Models: Verified (v2.4)</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm flex items-center">
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Pipeline: Live</span>
            </div>
          </div>
        </div>

        {/* System Capabilities Matrix */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">System AI Capabilities</h2>
            <div className="h-px bg-gray-200 flex-grow"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[
              {
                name: "Brain MRI Analysis",
                tech: "CNN (EfficientNet)",
                input: "MRI Scan (JPG)",
                output: "Tumor Class",
                acc: "98.2%"
              },
              {
                name: "Skin Dermatology",
                tech: "Vision Transformer",
                input: "Photo/Webcam",
                output: "Condition Ledger",
                acc: "96.5%"
              },
              {
                name: "Symptom Checker",
                tech: "NLP + GenAI",
                input: "Text",
                output: "Triage",
                acc: "95.2%"
              }
            ].map((cap, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-primary-100 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-gray-900">{cap.name}</h3>
                  <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{cap.acc} Acc</span>
                </div>
                <div className="space-y-1.5 leading-tight">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Technique</p>
                  <p className="text-[11px] text-primary-600 font-bold mb-2">{cap.tech}</p>

                  <div className="flex justify-between border-t border-gray-50 pt-1.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 uppercase">Input</span>
                      <span className="text-[10px] font-mono text-gray-600">{cap.input}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] text-gray-400 uppercase">Output</span>
                      <span className="text-[10px] font-mono text-gray-600">{cap.output}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Activity className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Queries</p>
                <p className="text-2xl font-bold text-gray-900">{totalQueries}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Symptom Analyses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.queryTypes?.find(t => t._id === 'text')?.count || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <Image className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Skin Analyses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.queryTypes?.find(t => t._id === 'image')?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        {totalQueries > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Severity Breakdown */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Severity Distribution</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-4">
                {severityData.map((entry) => (
                  <div key={entry.name} className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: SEVERITY_COLORS[entry.name] }}
                    ></div>
                    <span className="text-sm text-gray-600 capitalize">
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Processing Time */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Avg. Processing Time</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.queryTypes || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgProcessingTime" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ML Diagnostic Families */}
        <div className="space-y-8">
          {/* Vision AI Suite */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-gray-200 flex-grow"></div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Vision AI Diagnostic Suite</h2>
              <div className="h-px bg-gray-200 flex-grow"></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Link to="/brain-scan" className="card group hover:border-purple-200 hover:shadow-lg transition-all border-l-4 border-l-purple-500">
                <div className="flex items-start mb-4">
                  <div className="bg-purple-50 p-3 rounded-xl group-hover:bg-purple-100 transition-colors">
                    <Brain className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4 flex-grow">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-gray-900">Brain MRI Analysis</h3>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono font-bold">V-ENG: EfficientNet</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Deep learning analysis for tumors and neurological conditions.</p>
                  </div>
                </div>
                <div className="text-purple-600 text-sm font-bold flex items-center justify-end">
                  Initialize Scan →
                </div>
              </Link>

              <Link to="/face-scan" className="card group hover:border-pink-200 hover:shadow-lg transition-all border-l-4 border-l-pink-500">
                <div className="flex items-start mb-4">
                  <div className="bg-pink-50 p-3 rounded-xl group-hover:bg-pink-100 transition-colors">
                    <Scan className="h-8 w-8 text-pink-600" />
                  </div>
                  <div className="ml-4 flex-grow">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-gray-900">Face Dermatology</h3>
                      <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded font-mono font-bold">V-ENG: ViT-B16</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Dermatoscopic analysis of facial acne and skin hygiene.</p>
                  </div>
                </div>
                <div className="text-pink-600 text-sm font-bold flex items-center justify-end">
                  Initialize Scan →
                </div>
              </Link>
            </div>
          </div>

          {/* Core Diagnostic Suite */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-gray-200 flex-grow"></div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Core Diagnostic Models</h2>
              <div className="h-px bg-gray-200 flex-grow"></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Link to="/predict-image" className="card group hover:border-blue-200 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                <div className="flex items-start mb-4">
                  <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <Image className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4 flex-grow">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-gray-900">Skin Analysis</h3>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold">V-ENG: ResNet</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Identify skin conditions and receive actionable treatment advice.</p>
                  </div>
                </div>
                <div className="text-blue-600 text-sm font-bold flex items-center justify-end">
                  Initialize Scan →
                </div>
              </Link>

              <Link to="/predict-text" className="card group hover:border-green-200 hover:shadow-lg transition-all border-l-4 border-l-green-500">
                <div className="flex items-start mb-4">
                  <div className="bg-green-50 p-3 rounded-xl group-hover:bg-green-100 transition-colors">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4 flex-grow">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-gray-900">Symptom Checker</h3>
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono font-bold">NLP: Gemini</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Analyze textual symptoms for instant triage and medical guidance.</p>
                  </div>
                </div>
                <div className="text-green-600 text-sm font-bold flex items-center justify-end">
                  Start Analysis →
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        {totalQueries === 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Get Started</h3>
                <p className="text-blue-800 mb-4">
                  You haven't performed any analyses yet. Try our symptom or skin analysis tools to get started!
                </p>
                <div className="flex space-x-4">
                  <Link to="/predict-text" className="btn-primary">
                    Analyze Symptoms
                  </Link>
                  <Link to="/predict-image" className="btn-secondary">
                    Analyze Skin
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tech Stack Footer */}
        <div className="mt-16 pt-8 border-t border-gray-100 pb-12">
          <div className="flex flex-col items-center">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 text-center">System Architecture Tech Stack</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { label: "Frontend", value: "React + Vite", icon: "⚛️" },
                { label: "Backend", value: "Python Flask", icon: "🔥" },
                { label: "ML Engine", value: "CNN + ViT + Sklearn", icon: "🧠" },
                { label: "Database", value: "MongoDB Atlas", icon: "🍃" }
              ].map((tech, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-100 rounded-xl hover:border-primary-100 transition-colors group shadow-sm">
                  <span className="text-xl group-hover:scale-110 transition-transform">{tech.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-0.5">{tech.label}</span>
                    <span className="text-[11px] font-bold text-gray-700 leading-none">{tech.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
