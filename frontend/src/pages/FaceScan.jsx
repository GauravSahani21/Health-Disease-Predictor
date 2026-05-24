import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { predictionAPI } from '../services/api';
import { Scan, Upload, Camera, Send, X, RefreshCw } from 'lucide-react';
import { LoadingSpinner, ModelSpecsBadge, PredictionInfoBox, MainResultCard, AIDiagnosticBadge, ConfidenceBar } from '../components/UIComponents';
import toast from 'react-hot-toast';

export const FaceScan = () => {

  const fileInputRef = useRef(null);
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [usingWebcam, setUsingWebcam] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    sex: '',
  });
  const [result, setResult] = useState(null);

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setImagePreview(imageSrc);

      // Convert base64 to File object
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "face-capture.jpg", { type: "image/jpeg" });
          setImageFile(file);
          setUsingWebcam(false);
        });
    }
  }, [webcamRef]);

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
      toast.error('Please upload or capture a facial image');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('image', imageFile);
      if (formData.age) formDataObj.append('age', formData.age);
      if (formData.sex) formDataObj.append('sex', formData.sex);

      const response = await predictionAPI.predictFaceAcne(formDataObj);
      setResult(response.data);
      toast.success('Face scan analysis complete!');
    } catch (error) {
      const message = error.response?.data?.message || 'Analysis failed. Please try again.';
      toast.error(message);
      console.error('Face Scan Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      clear: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      mild: 'bg-sky-100 text-sky-800 border-sky-300',
      moderate: 'bg-amber-100 text-amber-800 border-amber-300',
      severe: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[severity?.toLowerCase()] || colors.mild;
  };

  const resetAnalysis = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setUsingWebcam(false);
  };

  // ── Modal close on backdrop click ──────────────────────────────────────────
  const closeModal = () => setSelectedClass(null);

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-lime text-dark font-bold text-lg px-4 py-1.5 rounded-xl mb-4 border border-dark">
            AI Dermatology
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-dark flex items-center justify-center gap-3 mb-6">
            Face Scan
          </h1>
          <div className="flex justify-center mb-4">
            <ModelSpecsBadge type="Vision Transformer (ViT)" dataset="Facial Photos / Webcam" />
          </div>
          <p className="text-lg text-dark/60 max-w-2xl mx-auto font-medium">
            Advanced AI dermatoscope for acne, texture, and skin health analysis.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Left Column: Capture/Upload */}
          <div className="space-y-6 lg:space-y-8">
            <div className="bg-light rounded-[2.5rem] border border-dark overflow-hidden shadow-[0_5px_0_0_#191A23]">
              <div className="p-6 md:p-8 bg-dark border-b border-dark">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                  <Camera className="h-7 w-7 text-lime" />
                  1. Capture Image
                </h2>
              </div>

              <div className="p-6 md:p-8 space-y-6 bg-white">
                {!imagePreview && !usingWebcam && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setUsingWebcam(true)}
                      className="flex flex-col items-center justify-center p-6 md:p-8 border-2 border-dashed border-dark/20 rounded-3xl hover:border-lime hover:bg-lime/10 transition-all group"
                    >
                      <Camera className="h-10 w-10 md:h-12 md:w-12 text-dark/30 group-hover:text-dark mb-4 transition-colors" />
                      <span className="font-bold text-sm md:text-base text-dark/50 group-hover:text-dark transition-colors">Use Webcam</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-6 md:p-8 border-2 border-dashed border-dark/20 rounded-3xl hover:border-lime hover:bg-lime/10 transition-all group"
                    >
                      <Upload className="h-10 w-10 md:h-12 md:w-12 text-dark/30 group-hover:text-dark mb-4 transition-colors" />
                      <span className="font-bold text-sm md:text-base text-dark/50 group-hover:text-dark transition-colors">Upload Photo</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </button>
                  </div>
                )}

                {usingWebcam && (
                  <div className="relative bg-dark rounded-3xl overflow-hidden border border-dark">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full h-auto"
                      videoConstraints={{
                         facingMode: "user",
                        aspectRatio: 1
                      }}
                    />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <button
                        onClick={capturePhoto}
                        className="bg-lime text-dark rounded-2xl p-4 border border-dark shadow-[0_4px_0_0_#191A23] hover:translate-y-[-2px] hover:shadow-[0_6px_0_0_#191A23] transition-all"
                      >
                        <Camera className="h-7 w-7" />
                      </button>
                      <button
                        onClick={() => setUsingWebcam(false)}
                        className="bg-light text-dark rounded-2xl p-4 border border-dark shadow-[0_4px_0_0_#191A23] hover:translate-y-[-2px] hover:shadow-[0_6px_0_0_#191A23] transition-all"
                      >
                        <X className="h-7 w-7" />
                      </button>
                    </div>
                  </div>
                )}

                {imagePreview && (
                  <div className="relative rounded-3xl overflow-hidden shadow-[0_4px_0_0_#191A23] border border-dark group">
                    <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover" />
                    <button
                      onClick={resetAnalysis}
                      className="absolute top-4 right-4 bg-white p-3 rounded-2xl border border-dark shadow-[0_4px_0_0_#191A23] text-dark hover:bg-lime transition-colors"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Form Inputs */}
                <div className="grid grid-cols-2 gap-5 pt-6 border-t border-dark/10">
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">Age</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="input-field"
                      placeholder="e.g. 25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">Gender</label>
                    <select
                      value={formData.sex}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
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
                      Analyze Skin Condition
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-lime/20 border border-lime rounded-3xl p-6 md:p-8">
              <h3 className="font-bold text-dark mb-3 flex items-center gap-2">
                <span className="text-xl">💡</span> Tips for best results:
              </h3>
              <ul className="text-dark/70 text-sm md:text-base space-y-2 list-disc pl-5 font-medium">
                <li>Ensure good, natural lighting on your face</li>
                <li>Remove glasses and pull back hair</li>
                <li>Clean camera lens for sharp focus</li>
                <li>Keep a neutral expression</li>
              </ul>
            </div>

            <PredictionInfoBox
              steps={[
                "User-captured image is processed for feature clarity and noise reduction.",
                "Vision Transformer (ViT) architecture identifies subtle dermatological markers.",
                "AI compares scan patterns against thousands of clinical data points.",
                "Comprehensive diagnostic breakdown is generated with severity assessment."
              ]}
            />
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6 lg:space-y-8">
            {!result && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-light rounded-[2.5rem] border border-dark/10 text-dark/30 p-8 md:p-12">
                <Scan className="h-24 w-24 mb-6 opacity-40 bg-dark/5 p-4 rounded-[2rem]" />
                <h3 className="text-2xl font-bold text-dark/40 text-center mb-3">Awaiting Analysis</h3>
                <p className="text-base mt-2 text-center max-w-sm font-medium">
                  Upload an image or take a photo to get detailed insights about your skin condition.
                </p>
              </div>
            )}

            {result && (
              <div className="bg-light rounded-[2.5rem] border border-dark shadow-[0_5px_0_0_#191A23] overflow-hidden animate-fade-in">
                <div className="p-6 md:p-8 bg-dark text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                      <Scan className="h-6 w-6 text-lime" />
                      Clinical Analysis Report
                    </h2>
                    <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em] mt-2">Ref: FAC-{Math.random().toString(36).substring(7).toUpperCase()}</p>
                  </div>
                  <AIDiagnosticBadge modelName="ViT-B16-Derm" />
                </div>

                <div className="p-6 md:p-8 space-y-8 bg-white">
                  <MainResultCard
                    value={`Overall Analysis: ${result.overall_severity}`}
                    severity={result.overall_severity}
                    type="Clinical Assessment"
                  />

                  {/* Doctor Recommendation */}
                  <div className={`p-5 rounded-2xl border-2 ${result.should_see_doctor ? 'bg-red-50 border-red-500 shadow-[0_4px_0_0_#EF4444]' : 'bg-lime/20 border-lime shadow-[0_4px_0_0_#B9FF66]'}`}>
                    <h4 className={`font-bold flex items-center gap-2 ${result.should_see_doctor ? 'text-red-900' : 'text-dark'}`}>
                      {result.should_see_doctor ?
                        '⚠️ Dermatologist Visit Recommended' :
                        '✅ Manageable with Self-Care'}
                    </h4>
                    <p className={`mt-2 font-medium text-sm md:text-base ${result.should_see_doctor ? 'text-red-800' : 'text-dark/70'}`}>
                      {result.doctor_recommendation_reason}
                    </p>
                  </div>

                  {/* Conditions List */}
                  {result.conditions && result.conditions.length > 0 && (
                    <div className="border-t border-dark/10 pt-8">
                      <h3 className="text-xl font-bold text-dark mb-6 flex items-center gap-3">
                        <span className="w-3 h-8 bg-black rounded-lg"></span>
                        AI Diagnostic Findings
                      </h3>
                      <div className="space-y-4">
                        {result.conditions.map((cond, i) => (
                          <div key={i} className="bg-light p-5 md:p-6 rounded-3xl border border-dark/10">
                            <ConfidenceBar
                              condition={cond.condition}
                              value={cond.score * 100}
                            />
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                              <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${getSeverityColor(cond.severity)}`}>
                                Detection Severity: {cond.severity}
                              </span>
                              {cond.affected_areas && (
                                <span className="text-[10px] font-mono text-dark/50 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-dark/10">
                                  Scope: {cond.affected_areas.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Treatments */}
                  {result.treatments && (
                    <div className="border-t border-dark/10 pt-8">
                      <h3 className="text-xl font-bold text-dark mb-6 flex items-center gap-3">
                        <span className="w-3 h-8 bg-lime rounded-lg border border-dark"></span>
                        Treatment Plan
                      </h3>
                      <div className="space-y-4">
                        {result.treatments.map((t, i) => (
                          <div key={i} className="bg-dark text-white rounded-3xl p-6 md:p-8 relative overflow-hidden group">
                            {/* Decorative background circle */}
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-lime opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <h4 className="font-bold text-lime text-lg mb-4 relative z-10">{t.category}</h4>
                            <ul className="space-y-3 relative z-10">
                              {t.recommendations.map((rec, j) => (
                                <li key={j} className="flex items-start gap-4 text-sm md:text-base text-white/80">
                                  <span className="mt-2 w-2 h-2 bg-lime rounded-full flex-shrink-0"></span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Advice */}
                  {result.ai_health_advice && (
                    <div className="border-2 border-dark rounded-[2rem] overflow-hidden shadow-[0_4px_0_0_#191A23]">
                      <div className="bg-lime px-6 md:px-8 py-5 border-b-2 border-dark">
                        <h3 className="font-bold text-xl text-dark flex items-center gap-3">
                          <span className="text-2xl">🤖</span> AI Recommendations
                        </h3>
                      </div>
                      <div className="p-6 md:p-8 grid gap-8 bg-white">
                        {result.ai_health_advice.medicines && (
                          <div>
                            <h4 className="text-sm font-bold text-dark/40 uppercase tracking-widest mb-3">Medicines</h4>
                            <p className="text-dark font-medium leading-relaxed bg-light p-5 rounded-2xl border border-dark/5 whitespace-pre-wrap">{result.ai_health_advice.medicines}</p>
                          </div>
                        )}
                        {result.ai_health_advice.lifestyle && (
                          <div>
                            <h4 className="text-sm font-bold text-dark/40 uppercase tracking-widest mb-3">Lifestyle</h4>
                            <p className="text-dark font-medium leading-relaxed bg-light p-5 rounded-2xl border border-dark/5 whitespace-pre-wrap">{result.ai_health_advice.lifestyle}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-dark/40 text-center pt-6 border-t border-dark/10 font-bold uppercase tracking-widest">
                    {result.disclaimer}
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
