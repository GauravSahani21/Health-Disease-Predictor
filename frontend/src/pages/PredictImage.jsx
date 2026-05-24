import { useState, useRef } from 'react';
import { predictionAPI } from '../services/api';
import { Image as ImageIcon, Upload, Camera, Send, X, Info } from 'lucide-react';
import { SeverityBadge, ConfidenceBar, LoadingSpinner, AIDiagnosticBadge, MainResultCard } from '../components/UIComponents';
import toast from 'react-hot-toast';

// ── Skin Condition Knowledge Base ─────────────────────────────────────────────
const SKIN_CLASSES = [
  {
    id: 'akiec',
    label: 'AKIEC',
    fullName: 'Actinic Keratosis / Intraepithelial Carcinoma',
    emoji: '🔴',
    color: 'border-orange-400 bg-orange-50',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-400',
    severity: 'Moderate – Pre-cancerous',
    description:
      'A rough, scaly patch on sun-damaged skin that can develop into squamous cell carcinoma if untreated. Often appears on the face, ears, scalp, neck, and hands.',
    causes: [
      'Prolonged UV radiation exposure (sun or tanning beds)',
      'Fair skin that burns easily',
      'Age over 40 with cumulative sun exposure',
      'Weakened immune system (transplant patients, HIV)',
      'Exposure to radiation or arsenic',
    ],
    solutions: [
      'Cryotherapy (liquid nitrogen freezing) – most common treatment',
      'Topical medications: Fluorouracil (5-FU), Imiquimod, or Diclofenac gel',
      'Photodynamic therapy (PDT) with light-activated cream',
      'Curettage & electrodesiccation for thicker lesions',
      'Daily SPF 50+ broad-spectrum sunscreen; avoid peak sun hours',
      'Annual full-body skin exam by a dermatologist',
    ],
  },
  {
    id: 'bcc',
    label: 'BCC',
    fullName: 'Basal Cell Carcinoma',
    emoji: '🟠',
    color: 'border-red-400 bg-red-50',
    badgeColor: 'bg-red-100 text-red-800 border-red-400',
    severity: 'Severe – Most Common Skin Cancer',
    description:
      'The most frequently occurring form of skin cancer. Appears as a pearly or waxy bump, flat flesh-colored lesion, or bleeding sore. Rarely spreads but can be locally destructive.',
    causes: [
      'Chronic UV exposure (sunlight, tanning beds)',
      'Light skin, blue/green eyes, blonde/red hair',
      'History of sunburns, especially in childhood',
      'Radiation therapy for other conditions',
      'Long-term arsenic exposure',
      'Rare inherited syndromes (Gorlin syndrome)',
    ],
    solutions: [
      'Mohs surgery – highest cure rate, tissue-sparing',
      'Standard surgical excision',
      'Radiation therapy for inoperable areas or elderly patients',
      'Topical Imiquimod or 5-FU for superficial BCC',
      'Photodynamic therapy for thin, superficial lesions',
      'Hedgehog pathway inhibitors (Vismodegib) for advanced BCC',
      'Strict sun protection: SPF 50+, UV-protective clothing, hats',
    ],
  },
  {
    id: 'bkl',
    label: 'BKL',
    fullName: 'Benign Keratosis-Like Lesions',
    emoji: '🟡',
    color: 'border-yellow-400 bg-yellow-50',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-400',
    severity: 'Minor – Benign',
    description:
      'A group of non-cancerous growths including seborrheic keratoses, solar lentigines, and lichen-planus like keratoses. They are harmless but can resemble malignant lesions.',
    causes: [
      'Aging (seborrheic keratoses are more common after 40)',
      'Sun exposure causing solar lentigines (age spots)',
      'Genetic predisposition',
      'Friction or irritation on skin',
    ],
    solutions: [
      'Usually no treatment required – purely cosmetic',
      'Cryotherapy to freeze and remove if desired',
      'Laser therapy for flatter lesions or age spots',
      'Electrosurgery or curettage for removal if irritated',
      'Topical retinoids or alpha hydroxy acids to reduce appearance',
      'Professional monitoring to distinguish from melanoma',
    ],
  },
  {
    id: 'df',
    label: 'DF',
    fullName: 'Dermatofibroma',
    emoji: '🟤',
    color: 'border-amber-400 bg-amber-50',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-400',
    severity: 'Minor – Benign',
    description:
      'A common, benign fibrous nodule that usually appears on the legs after a minor injury. It is firm to the touch, often brownish-red, and typically less than 1 cm in size.',
    causes: [
      'Reaction to minor skin injury (insect bite, thorn prick)',
      'Ingrown hair follicle reaction',
      'Unknown in many cases; may involve abnormal fibroblast proliferation',
      'More common in women aged 20–50',
    ],
    solutions: [
      'No treatment needed in most cases – benign and harmless',
      'Surgical excision if painful, rapidly growing, or cosmetically bothersome',
      'Liquid nitrogen cryotherapy to flatten the lesion',
      'Corticosteroid injection to reduce size/symptoms',
      'Laser therapy for cosmetic improvement',
      'Biopsy if unsure about diagnosis to rule out malignancy',
    ],
  },
  {
    id: 'mel',
    label: 'MEL',
    fullName: 'Melanoma',
    emoji: '🔴',
    color: 'border-rose-600 bg-rose-50',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-600',
    severity: '🚨 Critical – Malignant',
    description:
      'The most dangerous form of skin cancer. Develops from pigment-producing cells (melanocytes). Can spread rapidly to other organs if not caught early. Recognized by the ABCDE rule: Asymmetry, Border, Color, Diameter, Evolving.',
    causes: [
      'UV radiation from sunlight or tanning beds',
      'Large number of moles or atypical moles',
      'Fair skin, light eyes, light hair',
      'Personal or family history of melanoma',
      'Weakened immune system',
      'Rare gene mutations (BRAF, NRAS, NF1)',
    ],
    solutions: [
      '⚠️ Consult a dermatologist or oncologist immediately',
      'Wide local excision surgery – primary treatment',
      'Sentinel lymph node biopsy to check for spread',
      'Immunotherapy: Pembrolizumab, Nivolumab (checkpoint inhibitors)',
      'Targeted therapy: BRAF/MEK inhibitors (Vemurafenib, Dabrafenib)',
      'Radiation therapy for metastatic cases',
      'Frequent full-body skin exams; strict UV avoidance',
      'ABCDE self-check monthly; report any changing mole immediately',
    ],
  },
  {
    id: 'nv',
    label: 'NV',
    fullName: 'Melanocytic Nevi (Moles)',
    emoji: '🟢',
    color: 'border-emerald-400 bg-emerald-50',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-400',
    severity: 'Minor – Usually Benign',
    description:
      'Common benign growths formed by clusters of melanocytes. Most moles are harmless but atypical or dysplastic nevi carry a slightly higher risk of developing into melanoma.',
    causes: [
      'Congenital (present at birth) or acquired during childhood/young adulthood',
      'Sun exposure stimulating melanocyte growth',
      'Genetic factors – runs in families',
      'Hormonal changes (puberty, pregnancy)',
      'Immunosuppression',
    ],
    solutions: [
      'Regular self-monitoring using the ABCDE rule',
      'Annual dermatologist skin checks, especially for atypical nevi',
      'Dermoscopy evaluation for suspicious moles',
      'Surgical removal (excisional biopsy) if atypical or changing',
      'Avoid prolonged sun exposure; use SPF 50+ sunscreen daily',
      'No cosmetic treatments without professional evaluation first',
    ],
  },
  {
    id: 'vasc',
    label: 'VASC',
    fullName: 'Vascular Lesions',
    emoji: '🟣',
    color: 'border-purple-400 bg-purple-50',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-400',
    severity: 'Minor – Usually Benign',
    description:
      'Includes cherry angiomas, angiokeratomas, pyogenic granulomas, and hemangiomas. These are benign vascular anomalies that may bleed easily. Generally harmless but can indicate systemic disease in rare cases.',
    causes: [
      'Aging – cherry angiomas are very common after age 30',
      'Pregnancy or hormonal changes',
      'Minor skin trauma (pyogenic granuloma)',
      'Genetic predisposition',
      'Chemical or environmental exposure (rare)',
    ],
    solutions: [
      'Usually no treatment needed; observe for changes',
      'Laser therapy (pulsed dye or Nd:YAG laser) – most effective cosmetic removal',
      'Electrodesiccation and curettage for cherry angiomas',
      'Surgical excision for pyogenic granuloma or bleeding lesions',
      'Sclerotherapy for larger vascular anomalies',
      'Seek medical evaluation if lesion bleeds repeatedly or grows rapidly',
    ],
  },
];

export const PredictImage = () => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    age: '',
    sex: '',
  });
  const [result, setResult] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const closeModal = () => setSelectedClass(null);

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
      toast.error('Please select an image');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('image', imageFile);
      if (formData.age) formDataObj.append('age', formData.age);
      if (formData.sex) formDataObj.append('sex', formData.sex);

      const response = await predictionAPI.predictImage(formDataObj);
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
            Image Detection
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-dark flex items-center justify-center gap-3 mb-4">
            Skin Analysis
          </h1>
          <p className="text-lg text-dark/60 max-w-2xl mx-auto font-medium">
            Upload a clear photo of the affected skin area for instant AI analysis and treatment recommendations.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          
          {/* Left Column: Upload Form */}
          <div className="space-y-6 lg:space-y-8">
            <div className="card-flat p-0 overflow-hidden shadow-[0_5px_0_0_#191A23] border border-dark">
              <div className="p-6 md:p-8 bg-lime border-b-2 border-dark">
                <h2 className="text-xl md:text-2xl font-bold text-dark flex items-center gap-3">
                  <ImageIcon className="h-7 w-7 text-dark" />
                  Upload Image
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
                      <Upload className="h-12 w-12 text-dark/30 group-hover:text-dark mx-auto mb-4 transition-colors" />
                      <p className="font-bold text-dark mb-2 group-hover:text-lime transition-colors">Click to upload image</p>
                      <p className="text-sm text-dark/50 font-medium">JPEG, PNG, WebP (max 10MB)</p>
                    </div>
                  ) : (
                    <div className="relative rounded-3xl overflow-hidden shadow-[0_4px_0_0_#191A23] border border-dark group">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full object-cover"
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

                {/* Photo Tips */}
                <div className="bg-lime/20 border border-lime rounded-2xl p-5">
                  <h3 className="font-bold text-dark text-sm mb-2 flex items-center gap-2">
                    <span>📷</span> Photo Tips:
                  </h3>
                  <ul className="text-sm text-dark/70 space-y-1.5 font-medium ml-1">
                    <li>• Use good lighting (natural light preferred)</li>
                    <li>• Focus on the affected area</li>
                    <li>• Keep camera steady and close (but not blurry)</li>
                    <li>• Include a ruler or coin for scale if possible</li>
                  </ul>
                </div>

                {/* Age & Sex */}
                <div className="grid grid-cols-2 gap-5 pt-4">
                  <div>
                    <label className="block text-sm font-bold text-dark mb-2">Age (optional)</label>
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
                    <label className="block text-sm font-bold text-dark mb-2">Sex (optional)</label>
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
                      Analyze Image
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
                <Camera className="h-24 w-24 mb-6 opacity-40 bg-dark/5 p-4 rounded-[2rem]" />
                <h3 className="text-2xl font-bold text-dark/40 text-center mb-3">Awaiting Analysis</h3>
                <p className="text-base mt-2 text-center max-w-sm font-medium">
                  Results will appear here after analysis of your skin condition.
                </p>
              </div>
            )}

            {loading && (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-light rounded-[2.5rem] border border-dark/10 p-8">
                <LoadingSpinner text="Analyzing your image..." />
              </div>
            )}

            {!loading && result && (
              <div className="bg-light rounded-[2.5rem] border border-dark shadow-[0_5px_0_0_#191A23] overflow-hidden animate-fade-in">
                
                {/* Report Header */}
                <div className="p-6 md:p-8 bg-dark text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                      <ImageIcon className="h-6 w-6 text-lime" />
                      Analysis Results
                    </h2>
                    <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em] mt-2">
                      Ref: {Math.random().toString(36).substring(7).toUpperCase()}
                    </p>
                  </div>
                  <AIDiagnosticBadge modelName="SkinDetect-V2" />
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
                        Detected Conditions
                      </label>
                      <div className="space-y-4">
                        {result.predictions.map((pred, index) => (
                          <div key={index} className="bg-light border border-dark/10 rounded-2xl p-5">
                            <ConfidenceBar condition={pred.condition} score={pred.score} />
                          </div>
                        ))}
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

                  {/* Advice */}
                  {result.advice && (
                    <div className="bg-dark/5 border border-dark/10 rounded-2xl p-6">
                      <h3 className="font-bold text-dark mb-2 flex items-center gap-2">
                        <span className="text-xl">💡</span> Recommended Actions
                      </h3>
                      <p className="text-sm font-medium text-dark/70 leading-relaxed">{result.advice}</p>
                    </div>
                  )}

                  {/* Heatmap */}
                  {result.heatmap_url && (
                    <div className="border-t border-dark/10 pt-8">
                      <label className="block text-lg font-bold text-dark mb-4">
                        Heatmap Visualization
                      </label>
                      <div className="rounded-3xl border-2 border-dark shadow-[0_4px_0_0_#191A23] overflow-hidden">
                        <img
                          src={result.heatmap_url}
                          alt="Heatmap"
                          className="w-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium text-dark/50 mt-3 text-center">
                        Red areas show where the model focused its attention
                      </p>
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

        {/* ── 7 Skin Condition Classes Reference ── */}
        <div className="mt-16 animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-block bg-dark text-lime font-bold text-sm px-4 py-1.5 rounded-xl mb-4 border border-dark">
              HAM10000 Reference
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-dark mb-3">
              7 Skin Condition Classes
            </h2>
            <p className="text-dark/60 font-medium max-w-xl mx-auto">
              Click any class card to learn its causes and recommended solutions.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {SKIN_CLASSES.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`group flex flex-col items-center gap-3 p-5 rounded-3xl border-2 ${cls.color} hover:shadow-[0_6px_0_0_#191A23] hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left`}
              >
                <span className="text-4xl">{cls.emoji}</span>
                <div className="text-center">
                  <p className="font-black text-dark text-sm tracking-wide">{cls.label}</p>
                  <p className="text-[10px] font-medium text-dark/50 mt-1 leading-tight">{cls.fullName.split(' ')[0]}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${cls.badgeColor}`}>
                  {cls.severity.split(' – ')[0]}
                </span>
                <div className="flex items-center gap-1 text-dark/40 group-hover:text-dark transition-colors">
                  <Info className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Details</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Skin Class Detail Modal ── */}
      {selectedClass && (
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
                <span className="text-5xl">{selectedClass.emoji}</span>
                <div>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${selectedClass.badgeColor} inline-block mb-2`}>
                    {selectedClass.severity}
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                    {selectedClass.label} — {selectedClass.fullName}
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
              <div className={`p-5 rounded-2xl border-2 ${selectedClass.color}`}>
                <p className="text-dark font-medium leading-relaxed">{selectedClass.description}</p>
              </div>

              {/* Causes */}
              <div>
                <h4 className="flex items-center gap-3 text-lg font-black text-dark mb-4">
                  <span className="w-3 h-8 bg-red-400 rounded-lg border border-dark"></span>
                  Why It's Caused
                </h4>
                <ul className="space-y-3">
                  {selectedClass.causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-3 text-dark/80 font-medium">
                      <span className="mt-2 w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Solutions */}
              <div className="bg-dark rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-lime opacity-10 rounded-full blur-3xl"></div>
                <h4 className="flex items-center gap-3 text-lg font-black text-lime mb-5 relative z-10">
                  <span className="w-3 h-8 bg-lime rounded-lg border border-dark/50"></span>
                  Possible Solutions & Treatments
                </h4>
                <ul className="space-y-3 relative z-10">
                  {selectedClass.solutions.map((sol, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/85 font-medium text-sm md:text-base">
                      <span className="mt-2 w-2 h-2 bg-lime rounded-full flex-shrink-0"></span>
                      {sol}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[10px] text-dark/40 text-center font-bold uppercase tracking-widest">
                This information is for educational purposes only. Always consult a qualified dermatologist.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
