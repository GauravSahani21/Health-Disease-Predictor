import { useState } from 'react';
import { predictionAPI } from '../services/api';
import { FileText, Plus, X, Send } from 'lucide-react';
import { SeverityBadge, ConfidenceBar, EvidenceChips, LoadingSpinner, AIDiagnosticBadge } from '../components/UIComponents';
import toast from 'react-hot-toast';

export const PredictText = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    age: '',
    sex: '',
    reports: [],
  });
  const [result, setResult] = useState(null);

  const [newReport, setNewReport] = useState({ name: '', value: '', unit: '' });

  const handleAddReport = () => {
    if (newReport.name && newReport.value && newReport.unit) {
      setFormData({
        ...formData,
        reports: [...formData.reports, { ...newReport, value: parseFloat(newReport.value) }],
      });
      setNewReport({ name: '', value: '', unit: '' });
    }
  };

  const handleRemoveReport = (index) => {
    setFormData({
      ...formData,
      reports: formData.reports.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        text: formData.text,
        age: formData.age ? parseInt(formData.age) : undefined,
        sex: formData.sex || undefined,
        reports: formData.reports,
      };

      const response = await predictionAPI.predictText(payload);
      setResult(response.data);
      toast.success('Analysis complete!');
    } catch (error) {
      const message = error.response?.data?.message || 'Prediction failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block section-tag-dark mb-4 drop-shadow-md">
            Symptom AI
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-dark flex items-center justify-center gap-3 mb-4">
            Health Check
          </h1>
          <p className="text-lg text-dark/60 max-w-2xl mx-auto font-medium">
            Describe your symptoms or paste clinical notes to get AI-powered health insights instantly.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          
          {/* Left Column: Input Form */}
          <div className="space-y-6 lg:space-y-8">
            <div className="card-flat p-0 overflow-hidden shadow-[0_5px_0_0_#191A23] border border-dark">
              <div className="p-6 md:p-8 bg-lime border-b-2 border-dark">
                <h2 className="text-xl md:text-2xl font-bold text-dark flex items-center gap-3">
                  <FileText className="h-7 w-7 text-dark" />
                  Enter Details
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 bg-white">
                
                {/* Symptoms */}
                <div>
                  <label className="block text-sm font-bold text-dark mb-2">
                    Symptoms or Clinical Text *
                  </label>
                  <textarea
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    required
                    rows={5}
                    className="input-field resize-none shadow-inner"
                    placeholder="Example: I have had fever for 3 days, sore throat, low appetite, feeling very tired..."
                  />
                </div>

                {/* Age & Sex */}
                <div className="grid grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">Age</label>
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="input-field"
                      placeholder="e.g. 29"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">Gender</label>
                    <select
                      value={formData.sex}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Lab Reports */}
                <div className="bg-light p-5 rounded-2xl border border-dark/10">
                  <label className="block text-sm font-bold text-dark mb-3">
                    Lab Reports (optional)
                  </label>
                  
                  {/* Existing Reports */}
                  {formData.reports.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {formData.reports.map((report, index) => (
                        <div key={index} className="flex items-center justify-between bg-white border border-dark/10 p-3 rounded-xl shadow-sm">
                          <span className="text-sm text-dark font-medium">
                            <strong>{report.name}:</strong> {report.value} <span className="text-dark/50">{report.unit}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReport(index)}
                            className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Report */}
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={newReport.name}
                      onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                      placeholder="Test name"
                      className="col-span-5 input-field py-2 text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={newReport.value}
                      onChange={(e) => setNewReport({ ...newReport, value: e.target.value })}
                      placeholder="Value"
                      className="col-span-3 input-field py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={newReport.unit}
                      onChange={(e) => setNewReport({ ...newReport, unit: e.target.value })}
                      placeholder="Unit"
                      className="col-span-3 input-field py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddReport}
                      className="col-span-1 bg-dark hover:bg-dark/80 text-white flex items-center justify-center rounded-xl transition-colors shadow-[0_2px_0_0_#B9FF66]"
                      title="Add report"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-dark/50 mt-3 pt-3 border-t border-dark/10">
                    Example: Hemoglobin, 9.2, g/dL
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-lime text-lg py-4 flex items-center justify-center gap-3 mt-4"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" color="dark" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="h-6 w-6" />
                      Analyze Symptoms
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6 lg:space-y-8">
            {!loading && !result && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-light rounded-[2.5rem] border border-dark/10 text-dark/30 p-8 md:p-12">
                <FileText className="h-24 w-24 mb-6 opacity-40 bg-dark/5 p-4 rounded-[2rem]" />
                <h3 className="text-2xl font-bold text-dark/40 text-center mb-3">Awaiting Analysis</h3>
                <p className="text-base mt-2 text-center max-w-sm font-medium">
                  Results will appear here after analysis of your symptoms.
                </p>
              </div>
            )}

            {loading && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-light rounded-[2.5rem] border border-dark/10 p-8">
                <LoadingSpinner text="Analyzing your symptoms..." />
              </div>
            )}

            {!loading && result && (
              <div className="bg-light rounded-[2.5rem] border border-dark shadow-[0_5px_0_0_#191A23] overflow-hidden animate-fade-in">
                
                {/* Report Header */}
                <div className="p-6 md:p-8 bg-dark text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                      <FileText className="h-6 w-6 text-lime" />
                      Analysis Results
                    </h2>
                    <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em] mt-2">
                      Ref: {Math.random().toString(36).substring(7).toUpperCase()}
                    </p>
                  </div>
                  <AIDiagnosticBadge modelName="Symptom-AI-V3" />
                </div>

                <div className="p-6 md:p-8 space-y-8 bg-white">
                  
                  {/* Severity */}
                  <div className="flex items-center justify-between p-5 bg-light rounded-2xl border border-dark/10">
                    <span className="font-bold text-dark/40 uppercase tracking-widest text-xs">Diagnostic Severity</span>
                    <SeverityBadge severity={result.severity} />
                  </div>

                  {/* Predictions */}
                  {result.predictions && result.predictions.length > 0 && (
                    <div className="border-t border-dark/10 pt-8">
                      <label className="block text-xl font-bold text-dark mb-5 flex items-center gap-3">
                         <span className="w-3 h-8 bg-dark rounded-lg"></span>
                        Possible Conditions
                      </label>
                      <div className="space-y-4">
                        {result.predictions.map((pred, index) => (
                          <div key={index} className="bg-light border border-dark/10 rounded-2xl p-5">
                            <ConfidenceBar condition={pred.condition} score={pred.score} />
                            {pred.evidence && <EvidenceChips evidence={pred.evidence} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advice */}
                  {result.advice && (
                    <div className="bg-lime/10 border border-lime rounded-2xl p-6">
                      <h3 className="font-bold text-dark mb-2 flex items-center gap-2">
                        <span className="text-xl">💡</span> Recommended Actions
                      </h3>
                      <p className="text-sm font-medium text-dark/70 leading-relaxed">{result.advice}</p>
                    </div>
                  )}

                  {/* AI Health Advice */}
                  {result.health_advice && (
                    <div className="border-2 border-dark rounded-[2rem] overflow-hidden shadow-[0_4px_0_0_#191A23] mt-8">
                      <div className="bg-lime px-6 md:px-8 py-5 border-b-2 border-dark">
                        <h3 className="font-bold text-xl text-dark flex items-center gap-3">
                          <span className="text-2xl">🤖</span> AI Health Advisor
                        </h3>
                      </div>
                      
                      <div className="p-6 md:p-8 space-y-6 bg-white">
                        {/* Severity Badge Block */}
                        {result.health_advice.severity && (
                          <div className={`p-5 rounded-2xl flex items-center border-2 shadow-sm ${
                            result.health_advice.severity.toLowerCase().includes('minor') 
                              ? 'bg-emerald-50 border-emerald-400' 
                              : 'bg-red-50 border-red-400'
                          }`}>
                            <span className="text-4xl mr-4 flex-shrink-0 drop-shadow-sm">
                              {result.health_advice.severity.toLowerCase().includes('minor') ? '🟢' : '🔴'}
                            </span>
                            <div>
                              <h4 className={`font-bold text-lg ${result.health_advice.severity.toLowerCase().includes('minor') ? 'text-emerald-900' : 'text-red-900'}`}>
                                {result.health_advice.severity} Issue
                              </h4>
                              <p className={`text-sm font-medium ${result.health_advice.severity.toLowerCase().includes('minor') ? 'text-emerald-700' : 'text-red-700'}`}>
                                {result.health_advice.severity.toLowerCase().includes('minor') 
                                  ? 'Can likely be managed at home' 
                                  : 'Requires medical attention'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Precautions */}
                        {result.health_advice.precautions && (
                          <div className="bg-light rounded-2xl p-5 border border-dark/10">
                            <h4 className="font-bold text-dark text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span>🛡️</span> Precautions
                            </h4>
                            <p className="text-sm font-medium text-dark/70 whitespace-pre-line">{result.health_advice.precautions}</p>
                          </div>
                        )}
                        
                        {/* Recommended Medicines */}
                        {result.health_advice.medicines && (
                          <div className="bg-light rounded-2xl p-5 border border-dark/10">
                            <h4 className="font-bold text-dark text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span>💊</span> Recommended Medicines
                            </h4>
                            <p className="text-sm font-medium text-dark/70 whitespace-pre-line">{result.health_advice.medicines}</p>
                          </div>
                        )}
                        
                        {/* Diet & Lifestyle (Grid) */}
                        <div className="grid sm:grid-cols-2 gap-5">
                          {result.health_advice.diet && (
                            <div className="bg-light rounded-2xl p-5 border border-dark/10">
                              <h4 className="font-bold text-dark text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span>🥗</span> Diet Tips
                              </h4>
                              <p className="text-sm font-medium text-dark/70 whitespace-pre-line">{result.health_advice.diet}</p>
                            </div>
                          )}
                          
                          {result.health_advice.lifestyle && (
                            <div className="bg-light rounded-2xl p-5 border border-dark/10">
                              <h4 className="font-bold text-dark text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span>🏃</span> Lifestyle
                              </h4>
                              <p className="text-sm font-medium text-dark/70 whitespace-pre-line">{result.health_advice.lifestyle}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Urgency */}
                        {result.health_advice.urgency && (
                          <div className="bg-red-50 rounded-2xl p-5 border-2 border-red-200">
                            <h4 className="font-bold text-red-800 text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span>⚠️</span> When to See a Doctor
                            </h4>
                            <p className="text-sm font-medium text-red-700 whitespace-pre-line">{result.health_advice.urgency}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="bg-dark/5 border border-dark/10 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-bold font-mono text-dark/50 uppercase tracking-widest">{result.disclaimer}</p>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
