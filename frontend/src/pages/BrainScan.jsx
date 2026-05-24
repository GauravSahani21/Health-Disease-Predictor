import { useState, useRef } from 'react';
import { predictionAPI } from '../services/api';
import { Brain, Upload, AlertTriangle, Send, Activity, X, Info } from 'lucide-react';
import { ConfidenceBar, LoadingSpinner, ModelSpecsBadge, PredictionInfoBox, MainResultCard, AIDiagnosticBadge } from '../components/UIComponents';
import toast from 'react-hot-toast';

// ── Brain Tumor Knowledge Base ─────────────────────────────────────────────
const TUMOR_CLASSES = [
  {
    id: 'glioma',
    label: 'Glioma',
    fullName: 'Glioma Tumor',
    emoji: '🧠',
    color: 'border-red-400 bg-red-50',
    badgeColor: 'bg-red-100 text-red-800 border-red-400',
    severity: 'Varies – Requires Medical Attention',
    description: 'A glioma is a type of tumor that starts in the glial cells of the brain or the spine. Glial cells support and nourish neurons. It can be benign or malignant.',
    encouragement: 'A glioma diagnosis can be frightening, but please remember you are not alone. Medicine has made incredible bounds in neuro-oncology, and there are many advanced treatments available today. Keep your hope alive, lean on your support network, and take things one day at a time. Your journey matters and there is always hope.',
    hospitals: [
      'Mayo Clinic (Rochester, MN, USA)',
      'Johns Hopkins Hospital (Baltimore, MD, USA)',
      'MD Anderson Cancer Center (Houston, TX, USA)',
      'NIMHANS (Bengaluru, India)',
      'AIIMS (New Delhi, India)'
    ]
  },
  {
    id: 'meningioma',
    label: 'Meningioma',
    fullName: 'Meningioma Tumor',
    emoji: '🎗️',
    color: 'border-amber-400 bg-amber-50',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-400',
    severity: 'Usually Benign',
    description: 'A meningioma is a tumor that arises from the meninges — the membranes that surround your brain and spinal cord. Most meningiomas grow very slowly over many years without causing symptoms.',
    encouragement: 'Here is the good news: the vast majority of meningiomas are non-cancerous (benign) and grow very slowly. Many people live full, healthy lives during and after a meningioma diagnosis. Trust your medical team and stay positive; the prognosis for this type of tumor is generally very good.',
    hospitals: [
      'Johns Hopkins Hospital (Baltimore, MD, USA)',
      'Massachusetts General Hospital (Boston, MA, USA)',
      'UCSF Medical Center (San Francisco, CA, USA)',
      'Tata Memorial Hospital (Mumbai, India)',
      'AIIMS (New Delhi, India)'
    ]
  },
  {
    id: 'pituitary',
    label: 'Pituitary',
    fullName: 'Pituitary Adenoma',
    emoji: '⚛️',
    color: 'border-purple-400 bg-purple-50',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-400',
    severity: 'Usually Benign',
    description: 'Pituitary tumors are abnormal growths that develop in your pituitary gland. Some pituitary tumors result in too many of the hormones that regulate important functions of your body, while others do not.',
    encouragement: 'Pituitary tumors are overwhelmingly benign (they do not spread to other parts of the body). Most are highly treatable, either with medications to regulate hormones or by safe, minimally invasive procedures. Stay strong—this is absolutely manageable and your doctors will guide you every step of the way.',
    hospitals: [
      'Mayo Clinic - Pituitary Center (Rochester, MN, USA)',
      'Cleveland Clinic (Cleveland, OH, USA)',
      'Stanford Health Care (Stanford, CA, USA)',
      'Apollo Hospitals (Multiple Locations, India)',
      'AIIMS (New Delhi, India)'
    ]
  },
  {
    id: 'notumor',
    label: 'No Tumor',
    fullName: 'Healthy Brain Scan',
    emoji: '✅',
    color: 'border-emerald-400 bg-emerald-50',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-400',
    severity: 'Normal',
    description: 'No significant tumorous structures or masses were detected in the provided MRI scan. The brain tissue density appears normal from the AI\'s perspective.',
    encouragement: 'Great news! The AI scan does not show any signs of a tumor. However, if you are experiencing severe symptoms like persistent headaches, vision changes, or dizziness, do not ignore them. Always follow up with a neurologist for a professional evaluation to give you perfect peace of mind.',
    hospitals: [
      'Any local certified Neurologist or General Physician',
      'Your Primary Care Doctor for routine health checkups'
    ]
  }
];

export const BrainScan = () => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    age: '',
    sex: '',
  });
  const [result, setResult] = useState(null);
  const [selectedTumor, setSelectedTumor] = useState(null);

  const closeModal = () => setSelectedTumor(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      toast.error('Please select a brain MRI/X-ray image');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('image', imageFile);
      if (formData.age) formDataObj.append('age', formData.age);
      if (formData.sex) formDataObj.append('sex', formData.sex);

      const response = await predictionAPI.predictBrainMRI(formDataObj);
      setResult(response.data);
      toast.success('Brain MRI analysis complete!');
    } catch (error) {
      const message = error.response?.data?.message || 'Analysis failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      minor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      moderate: 'bg-amber-100 text-amber-800 border-amber-300',
      severe: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[severity?.toLowerCase()] || colors.moderate;
  };

  const getUrgencyBadge = (urgency) => {
    const badges = {
      emergency: { text: '🚨 EMERGENCY', color: 'bg-red-500 text-white border-red-600' },
      urgent: { text: '⚠️ Urgent', color: 'bg-orange-500 text-white border-orange-600' },
      soon: { text: '⏰ Soon', color: 'bg-amber-400 text-dark border-amber-500' },
      routine: { text: '✓ Routine', color: 'bg-lime text-dark border-dark' },
      low: { text: 'Low Priority', color: 'bg-light text-dark/70 border-dark/20' },
    };
    const badge = badges[urgency?.toLowerCase()] || badges.routine;
    return <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold border shadow-sm ${badge.color}`}>{badge.text}</span>;
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block section-tag mb-4 shadow-[0_3px_0_0_#191A23]">
            MRI Analysis
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-dark flex items-center justify-center gap-3 mb-6">
            Brain Scan
          </h1>
          <div className="flex justify-center mb-4">
            <ModelSpecsBadge type="CNN (EfficientNet)" dataset="MRI Scan (JPG/DICOM)" />
          </div>
          <p className="text-lg text-dark/60 max-w-2xl mx-auto font-medium">
            Upload a brain MRI or X-ray image for AI-powered disease detection.
          </p>
          
          <div className="mt-6 max-w-2xl mx-auto bg-red-50 border-2 border-red-400 p-5 rounded-2xl shadow-[0_4px_0_0_#F87171] text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">
                  Medical Emergency Notice:
                </p>
                <p className="text-sm text-red-700 mt-1">
                  If you're experiencing severe headache, loss of consciousness, seizures, or stroke symptoms, call emergency services immediately. Do not wait for scan results.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          
          {/* Left Column: Upload Form */}
          <div className="space-y-6 lg:space-y-8">
            <div className="card-flat p-0 overflow-hidden shadow-[0_5px_0_0_#191A23] border-dark">
              <div className="p-6 md:p-8 bg-dark border-b border-dark">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                  <Upload className="h-7 w-7 text-lime" />
                  Upload Brain Scan
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 bg-white">
                
                {/* Image Upload */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!imagePreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-dark/20 bg-light rounded-3xl p-12 text-center cursor-pointer hover:border-lime hover:bg-lime/10 transition-all group"
                    >
                      <Brain className="h-12 w-12 text-dark/30 group-hover:text-dark mx-auto mb-4 transition-colors" />
                      <p className="text-dark font-bold mb-2 group-hover:text-lime transition-colors">Click to upload brain scan</p>
                      <p className="text-sm text-dark/50 font-medium">MRI, CT, X-ray images supported</p>
                      <p className="text-xs text-dark/40 mt-2">JPEG, PNG, DICOM (max 10MB)</p>
                    </div>
                  ) : (
                    <div className="relative rounded-3xl overflow-hidden shadow-[0_4px_0_0_#191A23] border border-dark group">
                      <img
                        src={imagePreview}
                        alt="Brain scan preview"
                        className="w-full bg-dark object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setResult(null);
                        }}
                        className="absolute top-4 right-4 bg-white hover:bg-lime text-dark p-3 rounded-2xl border border-dark shadow-[0_4px_0_0_#191A23] transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Scan Tips */}
                <div className="bg-lime/20 border border-lime rounded-2xl p-5">
                  <h3 className="font-bold text-dark text-sm mb-2 flex items-center gap-2">
                    <span>💡</span> Upload Guidelines:
                  </h3>
                  <ul className="text-sm text-dark/70 space-y-1.5 font-medium ml-1">
                    <li>• Ensure the scan is clear and properly oriented</li>
                    <li>• Include the entire brain region if possible</li>
                    <li>• Grayscale medical scans work best</li>
                    <li>• Remove any patient identifiers for privacy</li>
                  </ul>
                </div>

                {/* Age & Sex */}
                <div className="grid grid-cols-2 gap-5 pt-4">
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">
                      Age (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="input-field"
                      placeholder="35"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">
                      Sex (optional)
                    </label>
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

                <button
                  type="submit"
                  disabled={loading || !imageFile}
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
                      Analyze Scan
                    </>
                  )}
                </button>
              </form>
            </div>

            <PredictionInfoBox
              steps={[
                "Scan image is preprocessed for optimal feature clarity.",
                "Deep learning engine (EfficientNet) extracts diagnostic markers.",
                "AI analyzes patterns against a library of clinical cases.",
                "Result is generated with a model certainty score."
              ]}
            />
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6 lg:space-y-8">
            {!loading && !result && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-light rounded-[2.5rem] border border-dark/10 text-dark/30 p-8 md:p-12">
                <Activity className="h-24 w-24 mb-6 opacity-40 bg-dark/5 p-4 rounded-[2rem]" />
                <h3 className="text-2xl font-bold text-dark/40 text-center mb-3">Awaiting Analysis</h3>
                <p className="text-base mt-2 text-center max-w-sm font-medium">
                  Results will appear here after analysis of your brain scan.
                </p>
              </div>
            )}

            {loading && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-light rounded-[2.5rem] border border-dark/10 p-8">
                <LoadingSpinner text="Analyzing brain scan... This may take a moment." />
              </div>
            )}

            {!loading && result && (
              <div className="bg-light rounded-[2.5rem] border border-dark shadow-[0_5px_0_0_#191A23] overflow-hidden animate-fade-in">
                
                {/* Report Header */}
                <div className="p-6 md:p-8 bg-dark text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                      <Brain className="h-6 w-6 text-lime" />
                      Analysis Report
                    </h2>
                    <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em] mt-2">
                      Ref: {Math.random().toString(36).substring(7).toUpperCase()} | EfficientNetB0_V2
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-lime uppercase mb-1">Status</p>
                    <p className="text-xs font-bold text-white px-3 py-1 bg-lime/20 rounded-full border border-lime inline-block">VERIFIED</p>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-8 bg-white">
                  
                  {/* Main Diagnostic Result Card */}
                  <MainResultCard
                    value={result.predictions?.[0]?.disease || "No abnormality detected"}
                    confidence={result.predictions?.[0]?.score}
                    severity={result.severity}
                    type="Prediction Result"
                  />

                  {/* Severity & Urgency */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-light p-5 rounded-2xl border border-dark/10">
                      <label className="block text-[10px] font-bold text-dark/40 uppercase mb-2">Severity Index</label>
                      <div className={`font-bold text-lg capitalize px-3 py-1 rounded-full inline-block border ${getSeverityColor(result?.severity)}`}>
                        {result?.severity || 'Normal'}
                      </div>
                    </div>
                    <div className="bg-light p-5 rounded-2xl border border-dark/10">
                      <label className="block text-[10px] font-bold text-dark/40 uppercase mb-2">Clinical Urgency</label>
                      {getUrgencyBadge(result?.urgency_level || 'routine')}
                    </div>
                  </div>

                  {/* Doctor Visit Recommendation */}
                  {result.should_see_doctor && (
                    <div className="bg-orange-50 border-2 border-orange-500 rounded-2xl p-5 shadow-[0_4px_0_0_#F97316]">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0" />
                        <div>
                          <p className="text-base font-bold text-orange-900">Doctor Consultation Recommended</p>
                          <p className="text-sm font-medium text-orange-800 mt-1">
                            Based on the analysis, professional medical evaluation is advised.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detected Conditions */}
                  {result.predictions && result.predictions.length > 0 && (
                    <div className="border-t border-dark/10 pt-8">
                      <label className="block text-xl font-bold text-dark mb-5 flex items-center gap-3">
                         <span className="w-3 h-8 bg-dark rounded-lg"></span>
                        Detected Conditions
                      </label>
                      <div className="space-y-4">
                        {result.predictions.map((pred, index) => {
                          const matchingClass = TUMOR_CLASSES.find(
                            c => c.label.toLowerCase() === pred.disease.toLowerCase() || 
                                 c.id.toLowerCase() === pred.disease.toLowerCase() ||
                                 (pred.disease.toLowerCase() === 'no tumor' && c.id === 'notumor')
                          );

                          return (
                            <button 
                              key={index} 
                              onClick={() => { if (matchingClass) setSelectedTumor(matchingClass) }}
                              className={`w-full text-left bg-light border rounded-2xl p-5 ${matchingClass ? 'border-dark/30 cursor-pointer hover:border-lime hover:shadow-[0_4px_0_0_#191A23] hover:-translate-y-1 transition-all' : 'border-dark/10'}`}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-dark text-lg flex items-center gap-2">
                                  {matchingClass && <span className="text-2xl">{matchingClass.emoji}</span>}
                                  {pred.disease}
                                </span>
                                <span className="text-sm font-bold text-dark px-2 py-1 bg-lime border border-dark rounded-md">{(pred.score * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-dark/10 rounded-full h-3 border-r-2 border-dark/20 overflow-hidden">
                                <div
                                  className="bg-lime h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${pred.score * 100}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center mt-3">
                                {pred.description ? (
                                  <p className="text-sm font-medium text-dark/60">{pred.description}</p>
                                ) : (
                                  <div></div>
                                )}
                                {matchingClass && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-lime bg-dark px-2 py-1 rounded-md border border-dark">
                                    <Info className="h-3 w-3" /> View Details
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {result.explanation && (
                    <div className="bg-lime/10 border border-lime rounded-2xl p-6">
                      <h3 className="font-bold text-dark mb-2 flex items-center gap-2">
                        <span className="text-xl">📊</span> Analysis Explanation
                      </h3>
                      <p className="text-sm font-medium text-dark/70 leading-relaxed">{result.explanation}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations && (
                    <div className="bg-dark/5 border border-dark/10 rounded-2xl p-6">
                      <h3 className="font-bold text-dark mb-2 flex items-center gap-2">
                        <span className="text-xl">💡</span> Recommendations
                      </h3>
                      <p className="text-sm font-medium text-dark/70 whitespace-pre-line leading-relaxed">{result.recommendations}</p>
                    </div>
                  )}

                  {/* Heatmap */}
                  {result.heatmap_url && (
                    <div className="border-t border-dark/10 pt-8">
                      <label className="block text-lg font-bold text-dark mb-4">
                        Analysis Heatmap
                      </label>
                      <div className="rounded-3xl border-2 border-dark shadow-[0_4px_0_0_#191A23] overflow-hidden">
                        <img
                          src={result.heatmap_url}
                          alt="Brain scan heatmap"
                          className="w-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium text-dark/50 mt-3 text-center">
                        Highlighted areas indicate regions of interest detected by the AI model
                      </p>
                    </div>
                  )}

                  {/* AI Health Advice */}
                  {result.ai_health_advice && (
                    <div className="border-2 border-dark rounded-[2rem] overflow-hidden shadow-[0_4px_0_0_#191A23] mt-8">
                      <div className="bg-lime px-6 md:px-8 py-5 border-b-2 border-dark">
                        <h3 className="font-bold text-xl text-dark flex items-center gap-3">
                          <span className="text-2xl">🤖</span> AI Health Advisor
                        </h3>
                      </div>

                      <div className="p-6 md:p-8 space-y-6 bg-white">
                        {/* Symptomatic Relief */}
                        {result.ai_health_advice.medicines && (
                          <div className="bg-light rounded-2xl p-5 border border-dark/10">
                            <h4 className="font-bold text-dark text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span>💊</span> Symptomatic Relief
                            </h4>
                            <p className="text-sm font-medium text-dark/70 whitespace-pre-line">{result.ai_health_advice.medicines}</p>
                          </div>
                        )}

                        {/* Brain-Healthy Diet */}
                        {result.ai_health_advice.diet && (
                          <div className="bg-light rounded-2xl p-5 border border-dark/10">
                            <h4 className="font-bold text-dark text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span>🧠</span> Brain-Healthy Diet
                            </h4>
                            <p className="text-sm font-medium text-dark/70 whitespace-pre-line">{result.ai_health_advice.diet}</p>
                          </div>
                        )}

                        {/* Lifestyle Modifications */}
                        {result.ai_health_advice.lifestyle && (
                          <div className="bg-light rounded-2xl p-5 border border-dark/10">
                            <h4 className="font-bold text-dark text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span>🏃</span> Lifestyle Modifications
                            </h4>
                            <p className="text-sm font-medium text-dark/70 whitespace-pre-line">{result.ai_health_advice.lifestyle}</p>
                          </div>
                        )}

                        {/* Emergency Warning Signs */}
                        {result.ai_health_advice.warnings && (
                          <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
                            <h4 className="font-bold text-red-800 text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span>🚨</span> Emergency Warning Signs
                            </h4>
                            <p className="text-sm font-medium text-red-700 whitespace-pre-line">{result.ai_health_advice.warnings}</p>
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

      {/* ── Brain Tumor Detail Modal ── */}
      {selectedTumor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-[2.5rem] border-2 border-dark shadow-[0_8px_0_0_#191A23] max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-dark rounded-t-[2.4rem] p-6 md:p-8 flex items-start justify-between gap-4 border-b-2 border-dark z-10">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{selectedTumor.emoji}</span>
                <div>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${selectedTumor.badgeColor} inline-block mb-2`}>
                    {selectedTumor.severity}
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                    {selectedTumor.label}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="flex-shrink-0 bg-white/10 hover:bg-lime text-white hover:text-dark p-2.5 rounded-2xl border border-white/20 hover:border-dark transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-8">
              {/* Description */}
              <div className={`p-5 rounded-2xl border-2 ${selectedTumor.color}`}>
                <h4 className="font-bold text-dark mb-2 text-lg">What does this mean?</h4>
                <p className="text-dark font-medium leading-relaxed">{selectedTumor.description}</p>
              </div>

              {/* Encouragement / Support */}
              <div className="bg-lime/20 rounded-3xl p-6 relative overflow-hidden border border-lime">
                <h4 className="flex items-center gap-2 text-lg font-black text-dark mb-3 relative z-10">
                  <span className="text-xl">❤️</span> Don't Lose Hope
                </h4>
                <p className="text-dark/80 font-medium text-sm md:text-base italic leading-relaxed relative z-10">
                  "{selectedTumor.encouragement}"
                </p>
              </div>

              {/* Hospitals */}
              <div className="bg-dark rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-lime opacity-10 rounded-full blur-3xl"></div>
                <h4 className="flex items-center gap-3 text-lg font-black text-lime mb-5 relative z-10">
                  <span className="w-3 h-8 bg-lime rounded-lg border border-dark/50"></span>
                  Top Recommended Hospitals
                </h4>
                <ul className="space-y-3 relative z-10">
                  {selectedTumor.hospitals.map((hospital, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/85 font-medium text-sm md:text-base">
                      <span className="mt-2 w-2 h-2 bg-lime rounded-full flex-shrink-0"></span>
                      {hospital}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[10px] text-dark/40 text-center font-bold uppercase tracking-widest">
                This information is for guidance and emotional support only. Always consult a certified neuro-oncologist.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
