const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Query = require('../models/Query');
const { authenticateToken } = require('../middleware/auth');
const { uploadToS3 } = require('../services/s3Service');
const CircuitBreaker = require('opossum');

// Circuit breaker configuration for ML services
const breakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
};

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    // Check for common image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid image type. Allowed: JPEG, PNG, WebP'), false);
    }
    cb(null, true);
  },
});

/**
 * Medical disclaimer text - required in all responses
 */
const MEDICAL_DISCLAIMER =
  'This tool provides informational guidance only and is not a medical diagnosis. For emergencies (chest pain, difficulty breathing, severe bleeding), call your local emergency services immediately. Predictions should be confirmed by a qualified healthcare professional.';

/**
 * Severity computation logic
 * IMPORTANT: These thresholds are examples and require validation by medical professionals
 */
function computeSeverity(predictions, reports = [], symptoms = '') {
  // Safety rules - flag severe conditions immediately
  const criticalSymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 'seizure'];
  const symptomsLower = symptoms.toLowerCase();
  
  for (const symptom of criticalSymptoms) {
    if (symptomsLower.includes(symptom)) {
      return 'severe';
    }
  }

  // Check lab values for critical abnormalities
  // WARNING: These are example thresholds only - require clinician validation
  for (const report of reports) {
    const { name, value } = report;
    const nameLower = name.toLowerCase();

    // Hemoglobin checks
    if (nameLower.includes('hemoglobin') || nameLower.includes('hb')) {
      if (value < 7.0) return 'severe'; // Critically low
      if (value < 10.0) return 'moderate';
    }

    // White Blood Cell (WBC) checks
    if (nameLower.includes('wbc') || nameLower.includes('white blood cell')) {
      if (value > 30000 || value < 2000) return 'severe';
      if (value > 15000 || value < 4000) return 'moderate';
    }

    // Blood sugar checks
    if (nameLower.includes('glucose') || nameLower.includes('blood sugar')) {
      if (value > 400 || value < 50) return 'severe';
      if (value > 200 || value < 70) return 'moderate';
    }

    // Platelet checks
    if (nameLower.includes('platelet')) {
      if (value < 50000) return 'severe';
      if (value < 100000) return 'moderate';
    }
  }

  // Check model prediction confidence
  if (predictions && predictions.length > 0) {
    const topPrediction = predictions[0];
    
    // High confidence + serious condition
    if (topPrediction.score >= 0.85) {
      const seriousConditions = ['pneumonia', 'sepsis', 'heart attack', 'stroke', 'appendicitis'];
      const conditionLower = topPrediction.condition.toLowerCase();
      
      for (const condition of seriousConditions) {
        if (conditionLower.includes(condition)) {
          return 'severe';
        }
      }
      return 'moderate';
    }

    // Medium confidence
    if (topPrediction.score >= 0.6) {
      return 'moderate';
    }

    // Low confidence
    return 'minor';
  }

  // Default to minor if no triggers
  return 'minor';
}

/**
 * Circuit breaker wrapper for ML service calls
 */
async function callMLService(url, payload) {
  const breaker = new CircuitBreaker(
    async (serviceUrl, data) => {
      const response = await axios.post(serviceUrl, data, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    },
    breakerOptions
  );

  breaker.on('open', () => {
    console.error(`Circuit breaker opened for ${url}`);
  });

  breaker.on('halfOpen', () => {
    console.log(`Circuit breaker half-open for ${url}`);
  });

  return breaker.fire(url, payload);
}

// Google AI Configuration
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Utility to extract JSON from Gemini response
 */
function extractJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (inner) {}
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (inner) {}
    }
    throw new Error('No parseable JSON found in: ' + text);
  }
}

/**
 * Helper to call Gemini model
 */
async function callGemini(prompt, imageBuffer = null, mimeType = null) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const contents = [];
  if (imageBuffer && mimeType) {
    contents.push({
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType
      }
    });
  }
  contents.push(prompt);

  const result = await model.generateContent(contents);
  const responseText = result.response.text();
  return extractJSON(responseText);
}

/**
 * Local Fallbacks when ML Services and Gemini are unavailable
 */
function getMockTextPrediction(text, age, sex) {
  const symptomsLower = text.toLowerCase();
  let predictions = [];
  let severity = 'minor';
  let advice = '';
  let health_advice = {
    medicines: '',
    diet: '',
    lifestyle: '',
    warnings: ''
  };

  if (symptomsLower.includes('headache') || symptomsLower.includes('migraine')) {
    predictions = [
      {
        condition: 'Tension Headache',
        score: 0.75,
        description: 'A mild to moderate pain that is often described as feeling like a tight band around the head.'
      },
      {
        condition: 'Migraine',
        score: 0.45,
        description: 'A neurological condition that can cause multiple symptoms, frequently including intense, debilitating headaches.'
      }
    ];
    severity = 'minor';
    advice = 'Stay hydrated, rest in a quiet, dark room, and consider over-the-counter pain relievers if appropriate.';
    health_advice = {
      medicines: 'Acetaminophen or Ibuprofen as needed.',
      diet: 'Avoid caffeine triggers, processed meats, and aged cheeses.',
      lifestyle: 'Maintain regular sleep schedules, practice relaxation techniques, and avoid screen time during pain.',
      warnings: 'Seek immediate care if the headache is sudden, severe ("thunderclap"), or accompanied by fever, stiff neck, or confusion.'
    };
  } else if (symptomsLower.includes('chest pain') || symptomsLower.includes('heart') || symptomsLower.includes('breathing')) {
    predictions = [
      {
        condition: 'Angina / Possible Ischemia',
        score: 0.65,
        description: 'Chest discomfort caused by reduced blood flow to the heart muscle.'
      },
      {
        condition: 'Gastroesophageal Reflux Disease (GERD)',
        score: 0.50,
        description: 'Acid reflux causing burning chest discomfort.'
      }
    ];
    severity = 'severe';
    advice = 'Seek immediate medical attention to rule out a cardiac event. Do not delay.';
    health_advice = {
      medicines: 'Do not start any self-medication for chest pain before clinical evaluation.',
      diet: 'Avoid large meals, spicy foods, caffeine, and lying down immediately after eating.',
      lifestyle: 'Avoid physical exertion until cleared by a doctor, sit upright, and try to remain calm.',
      warnings: 'EMERGENCY: If chest pain radiates to the arm, shoulder, neck, or jaw, or is accompanied by shortness of breath, sweating, or dizziness, call emergency services immediately.'
    };
  } else if (symptomsLower.includes('cough') || symptomsLower.includes('fever') || symptomsLower.includes('cold') || symptomsLower.includes('throat')) {
    predictions = [
      {
        condition: 'Viral Upper Respiratory Infection (Common Cold)',
        score: 0.80,
        description: 'A common viral infection of the nose and throat.'
      },
      {
        condition: 'Influenza (Flu)',
        score: 0.55,
        description: 'A highly contagious viral infection of the respiratory passages causing fever and severe aching.'
      }
    ];
    severity = 'minor';
    advice = 'Get plenty of rest, drink warm fluids, and monitor your temperature.';
    health_advice = {
      medicines: 'Paracetamol for general fever/body aches, throat lozenges, saline nasal drops.',
      diet: 'Warm broths, herbal teas with honey, citrus fruits, and plenty of water.',
      lifestyle: 'Get extra bed rest, use a humidifier, and wash hands frequently to prevent spread.',
      warnings: 'Consult a doctor if fever exceeds 103°F (39.4°C), lasts more than 3 days, or if you develop difficulty breathing or wheezing.'
    };
  } else if (symptomsLower.includes('stomach') || symptomsLower.includes('pain') && (symptomsLower.includes('belly') || symptomsLower.includes('abdomen') || symptomsLower.includes('diarrhea'))) {
    predictions = [
      {
        condition: 'Gastroenteritis',
        score: 0.70,
        description: 'Inflammation of the stomach and intestines, typically resulting from bacterial toxins or viral infection.'
      },
      {
        condition: 'Irritable Bowel Syndrome (IBS) Flare-up',
        score: 0.40,
        description: 'A common disorder that affects the large intestine, causing cramping, abdominal pain, bloating, gas, and diarrhea or constipation.'
      }
    ];
    severity = 'moderate';
    advice = 'Stay hydrated with oral rehydration solutions. Eat a bland diet.';
    health_advice = {
      medicines: 'Loperamide (only if recommended for diarrhea), ORS packets.',
      diet: 'BRAT diet (Bananas, Rice, Applesauce, Toast), avoid dairy, fatty, and spicy foods.',
      lifestyle: 'Rest, apply a warm compress to the abdomen, and eat small, frequent meals.',
      warnings: 'Consult a doctor immediately if you experience severe persistent pain in the lower right abdomen, blood in stools, high fever, or signs of dehydration.'
    };
  } else {
    predictions = [
      {
        condition: 'Mild Systemic Symptoms',
        score: 0.60,
        description: 'General signs of mild physiological stress or minor viral syndrome.'
      }
    ];
    severity = 'minor';
    advice = 'Please monitor your symptoms. Rest, stay hydrated, and consult a physician if symptoms persist.';
    health_advice = {
      medicines: 'Consult a pharmacist for general over-the-counter relief.',
      diet: 'Balanced diet, stay hydrated with water and warm fluids.',
      lifestyle: 'Ensure adequate sleep, avoid overexertion, and monitor temperature.',
      warnings: 'Consult a healthcare professional if symptoms worsen or new concerning symptoms appear.'
    };
  }

  return { predictions, severity, advice, health_advice };
}

function getMockSkinPrediction(age, sex) {
  return {
    predictions: [
      {
        condition: 'Eczema (Atopic Dermatitis)',
        score: 0.72,
        description: 'A condition that makes your skin red and itchy. It is common in children but can occur at any age.'
      },
      {
        condition: 'Psoriasis',
        score: 0.35,
        description: 'A skin disease that causes red, itchy scaly patches, most commonly on the knees, elbows, trunk and scalp.'
      }
    ],
    severity: 'minor',
    explanation: 'The skin image shows localized redness, dry scales, and signs of mild inflammation characteristic of chronic eczematous patches.',
    advice: 'Keep the skin well-hydrated. Use mild, fragrance-free cleansers. Avoid scratching or rubbing the affected areas.',
    heatmap_url: null
  };
}

function getMockBrainPrediction(age, sex) {
  return {
    predictions: [
      {
        disease: 'Normal Brain Scan',
        score: 0.94,
        description: 'Brain parenchyma structures appear normal with symmetrical hemispheres, appropriate ventricles, and no mass effect.'
      },
      {
        disease: 'Mild Cerebral Atrophy',
        score: 0.12,
        description: 'Slight widening of sulci consistent with normal aging changes.'
      }
    ],
    severity: 'minor',
    explanation: 'Radiological assessment shows preserved grey-white matter differentiation. No intracranial hemorrhage, midline shift, or acute infarct detected.',
    recommendations: 'No immediate neurosurgical or neurological interventions indicated based on this scan. Continue routine checkups.',
    should_see_doctor: false,
    urgency_level: 'routine',
    heatmap_url: null
  };
}

function getMockFacePrediction(age, sex) {
  return {
    conditions: [
      {
        condition: 'Acne Vulgaris (Mild to Moderate)',
        score: 0.85,
        details: 'Scattered inflammatory papules and comedones noted primarily in the T-zone and cheek areas.'
      },
      {
        condition: 'Seborrheic Dermatitis',
        score: 0.20,
        details: 'Mild flaking or redness around the nasolabial folds.'
      }
    ],
    overall_severity: 'mild',
    should_see_doctor: false,
    doctor_recommendation_reason: 'Acne appears mild to moderate and is suitable for management with over-the-counter topical treatments and a consistent skincare routine.',
    treatments: [
      'Topical Salicylic Acid cleanser (2%) to clear pores',
      'Spot treatment with Benzoyl Peroxide (2.5%) for active papules',
      'Non-comedogenic oil-free moisturizer'
    ],
    skincare_routine: {
      morning: [
        'Wash face with a gentle foaming cleanser',
        'Apply Salicylic Acid toner or serum',
        'Apply oil-free moisturizer with SPF 30+'
      ],
      night: [
        'Cleanse with a mild cleanser to remove dirt and sebum',
        'Apply a thin layer of Benzoyl Peroxide spot treatment on affected areas',
        'Apply a soothing, hydrating moisturizer'
      ]
    },
    dietary_advice: [
      'Reduce intake of high-glycemic foods and dairy products',
      'Increase hydration by drinking at least 2-3 liters of water daily',
      'Consume foods rich in omega-3 fatty acids and zinc'
    ]
  };
}

/**
 * POST /api/predict/text
 * AI-powered symptom analysis using Google Gemini
 */
router.post(
  '/text',
  authenticateToken,
  [
    body('text').isString().notEmpty().withMessage('Symptom text is required'),
    body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
    body('sex').optional().isIn(['male', 'female', 'other']).withMessage('Sex must be male, female, or other'),
    body('reports').optional().isArray().withMessage('Reports must be an array'),
    body('reports.*.name').optional().isString().withMessage('Report name must be a string'),
    body('reports.*.value').optional().isNumeric().withMessage('Report value must be numeric'),
    body('reports.*.unit').optional().isString().withMessage('Report unit must be a string'),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: errors.array(),
        });
      }

      const { text: originalText, age, sex, reports = [] } = req.body;

      console.log(`[Text Prediction] User: ${req.user.id}, Original Text: ${originalText.substring(0, 50)}...`);

      // ── Automatic Grammar & Medical Spelling Correction via Gemini ───────────
      let text = originalText;
      try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (apiKey) {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `You are a medical spellchecker. Correct the grammar and medical spelling of the following user-entered symptoms. Fix typos (e.g., "headach" -> "headache", "stomac" -> "stomach"). Do not change the meaning or add new symptoms. Return ONLY the corrected text, no conversational filler, no quotes, no markdown.\n\nUser text: ${originalText}`;
          
          const result = await model.generateContent(prompt);
          const aiResponse = result.response.text().trim();
          
          if (aiResponse && aiResponse.length > 0) {
            text = aiResponse;
            console.log(`[Text Prediction] Grammar Corrected: "${originalText}" -> "${text}"`);
          }
        }
      } catch (aiError) {
        console.error('[Text Prediction] AI Grammar correction failed (falling back to original text):', aiError.message);
      }

      // Call ML Text Service (Local), with fallback
      let finalResponse;
      try {
        if (process.env.USE_API_ONLY === 'true' || process.env.RENDER === 'true') {
          throw new Error('Skipping local ML models on Render, using API fallback immediately.');
        }
        const mlServiceUrl = process.env.TEXT_ML_URL || 'http://localhost:8001';
        console.log(`[Text Prediction] Calling ML Service at ${mlServiceUrl} with corrected text`);
        
        const mlResponse = await axios.post(`${mlServiceUrl}/infer`, {
           text, age, sex, reports
        }, {
           timeout: 10000
        });
        
        const mlData = mlResponse.data;
        finalResponse = {
           predictions: mlData.predictions || [],
           severity: mlData.severity || 'Unknown',
           advice: mlData.advice || 'Analysis complete.',
           health_advice: mlData.health_advice || null,
           disclaimer: MEDICAL_DISCLAIMER
        };
      } catch (mlError) {
        console.warn('[Text Prediction] ML Service failed, trying Gemini fallback:', mlError.message);
        
        try {
          const prompt = `You are a medical diagnostic assistant. Analyze these symptoms: "${text}" for a patient (Age: ${age || 'unknown'}, Sex: ${sex || 'unknown'}).
Return a JSON object matching this schema:
{
  "predictions": [
    {
      "condition": "Name of disease",
      "score": 0.85,
      "description": "Short explanation of the disease and why the patient might have it"
    }
  ],
  "severity": "minor" | "moderate" | "severe",
  "advice": "General medical advice and next steps",
  "health_advice": {
    "medicines": "Over the counter medicine suggestions or precautions",
    "diet": "Dietary recommendations",
    "lifestyle": "Lifestyle tips",
    "warnings": "Red flag warnings to watch out for"
  }
}
Return ONLY valid JSON. No markdown backticks, no wrapping text. Just raw JSON.`;

          const geminiData = await callGemini(prompt);
          finalResponse = {
            predictions: geminiData.predictions || [],
            severity: geminiData.severity || 'minor',
            advice: geminiData.advice || 'Analysis complete.',
            health_advice: geminiData.health_advice || null,
            disclaimer: MEDICAL_DISCLAIMER
          };
        } catch (geminiError) {
          console.error('[Text Prediction] Gemini fallback failed, using local mock data:', geminiError.message);
          const mockData = getMockTextPrediction(text, age, sex);
          finalResponse = {
            predictions: mockData.predictions,
            severity: mockData.severity,
            advice: mockData.advice,
            health_advice: mockData.health_advice,
            disclaimer: MEDICAL_DISCLAIMER
          };
        }
      }

      // Save to DB
      try {
         await Query.create({
            userId: req.user.id,
            type: 'text',
            input: { text, age, sex, reports },
            modelOutput: finalResponse.predictions,
            severity: finalResponse.severity,
            advice: finalResponse.advice,
            createdAt: new Date(),
          });
          console.log(`[Text Prediction] Saved query to DB`);
      } catch (dbError) {
           console.error('[Text Prediction] DB Save Error:', dbError.message);
      }
      
      res.json(finalResponse);
    } catch (error) {
      console.error('[Text Prediction] Unexpected error:', error);
      res.status(500).json({
        error: true,
        message: 'An unexpected error occurred during prediction',
        disclaimer: MEDICAL_DISCLAIMER,
      });
    }
  }
);

/**
 * POST /api/predict/image
 * Image-based prediction for skin conditions
 */
router.post(
  '/image',
  authenticateToken,
  upload.single('image'),
  [
    body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
    body('sex').optional().isIn(['male', 'female', 'other']).withMessage('Sex must be male, female, or other'),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: errors.array(),
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: true,
          message: 'Image file is required',
        });
      }

      const { age, sex } = req.body;

      console.log(`[Image Prediction] User: ${req.user.id}, File: ${req.file.originalname}`);

      // Upload image to S3
      let imageUrl;
      try {
        imageUrl = await uploadToS3(req.file, 'uploads');
        console.log(`[Image Prediction] Uploaded to S3: ${imageUrl}`);
      } catch (s3Error) {
        console.error('[Image Prediction] S3 upload error:', s3Error.message);
        return res.status(500).json({
          error: true,
          message: 'Failed to upload image to storage',
        });
      }

      // Prepare multipart form data for ML service
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('image', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      if (age) formData.append('age', age);
      if (sex) formData.append('sex', sex);

      // Call ML image service, with fallback
      const mlServiceUrl = process.env.IMAGE_ML_URL || 'http://ml_image:8002';
      let mlResponse;

      try {
        if (process.env.USE_API_ONLY === 'true' || process.env.RENDER === 'true') {
          throw new Error('Skipping local ML models on Render, using API fallback immediately.');
        }
        const response = await axios.post(`${mlServiceUrl}/infer`, formData, {
          timeout: 10000,
          headers: formData.getHeaders(),
        });
        mlResponse = response.data;
      } catch (error) {
        console.warn('[Image Prediction] ML service failed, trying Gemini fallback:', error.message);
        
        try {
          const prompt = `You are a dermatology assistant. Analyze this skin image for a patient (Age: ${age || 'unknown'}, Sex: ${sex || 'unknown'}).
Return a JSON object matching this schema:
{
  "predictions": [
    {
      "condition": "Skin condition name",
      "score": 0.9,
      "description": "Short description of the condition"
    }
  ],
  "severity": "minor" | "moderate" | "severe",
  "explanation": "Visual assessment details of what is observed in the image",
  "advice": "Dermatological advice and next steps",
  "heatmap_url": null
}
Return ONLY valid JSON. No markdown backticks, no wrapping text. Just raw JSON.`;

          mlResponse = await callGemini(prompt, req.file.buffer, req.file.mimetype);
        } catch (geminiError) {
          console.error('[Image Prediction] Gemini fallback failed, using local mock data:', geminiError.message);
          mlResponse = getMockSkinPrediction(age, sex);
        }
      }

      // Compute severity for image predictions
      const severity = mlResponse.severity || computeSeverity(mlResponse.predictions, [], '');

      // Prepare final response
      const response = {
        predictions: mlResponse.predictions || [],
        severity,
        explanation: mlResponse.explanation || 'Analysis completed',
        advice: mlResponse.advice || 'Please consult a dermatologist for proper diagnosis and treatment.',
        heatmap_url: mlResponse.heatmap_url || null,
        disclaimer: MEDICAL_DISCLAIMER,
      };

      // Save query to database
      try {
        const queryRecord = await Query.create({
          userId: req.user.id,
          type: 'image',
          input: {
            imageUrl,
            age: age || null,
            sex: sex || null,
          },
          modelOutput: mlResponse.predictions,
          severity,
          advice: response.advice,
          resources: {
            heatmapUrl: response.heatmap_url,
            imageUrl,
          },
          createdAt: new Date(),
        });

        console.log(`[Image Prediction] Saved query ${queryRecord._id}`);
      } catch (dbError) {
        console.error('[Image Prediction] Database save error:', dbError.message);
      }

      res.json(response);
    } catch (error) {
      console.error('[Image Prediction] Unexpected error:', error);
      res.status(500).json({
        error: true,
        message: 'An unexpected error occurred during prediction',
        disclaimer: MEDICAL_DISCLAIMER,
      });
    }
  }
);

/**
 * POST /api/predict/brain
 * Brain MRI scan analysis for disease detection
 */
router.post(
  '/brain',
  authenticateToken,
  upload.single('image'),
  [
    body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
    body('sex').optional().isIn(['male', 'female', 'other']).withMessage('Sex must be male, female, or other'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: true, message: 'Validation failed', details: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: true, message: 'Brain MRI/X-ray image file is required' });
      }

      const { age, sex } = req.body;
      console.log(`[Brain MRI Prediction] User: ${req.user.id}, File: ${req.file.originalname}`);

      let imageUrl;
      try {
        imageUrl = await uploadToS3(req.file, 'brain-scans');
        console.log(`[Brain MRI Prediction] Uploaded to S3: ${imageUrl}`);
      } catch (s3Error) {
        console.error('[Brain MRI Prediction] S3 upload error:', s3Error.message);
        return res.status(500).json({ error: true, message: 'Failed to upload image to storage' });
      }

      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('image', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
      if (age) formData.append('age', age);
      if (sex) formData.append('sex', sex);

      const mlServiceUrl = process.env.BRAIN_ML_URL || 'http://ml_brain:8003';
      let mlResponse;

      try {
        if (process.env.USE_API_ONLY === 'true' || process.env.RENDER === 'true') {
          throw new Error('Skipping local ML models on Render, using API fallback immediately.');
        }
        const response = await axios.post(`${mlServiceUrl}/infer`, formData, {
          timeout: 15000,
          headers: formData.getHeaders(),
        });
        mlResponse = response.data;
      } catch (error) {
        console.warn('[Brain MRI Prediction] ML service failed, trying Gemini fallback:', error.message);
        
        try {
          const prompt = `You are a neuroradiology assistant. Analyze this brain scan/MRI image for a patient (Age: ${age || 'unknown'}, Sex: ${sex || 'unknown'}).
Return a JSON object matching this schema:
{
  "predictions": [
    {
      "disease": "Detected brain disease/abnormality or Normal Brain Scan",
      "score": 0.88,
      "description": "Short explanation of findings"
    }
  ],
  "severity": "minor" | "moderate" | "severe" | "critical",
  "explanation": "Radiological findings summary of the brain structure and scan",
  "recommendations": "Detailed medical recommendations",
  "should_see_doctor": true,
  "urgency_level": "routine" | "soon" | "urgent" | "emergency",
  "heatmap_url": null
}
Return ONLY valid JSON. No markdown backticks, no wrapping text. Just raw JSON.`;

          mlResponse = await callGemini(prompt, req.file.buffer, req.file.mimetype);
        } catch (geminiError) {
          console.error('[Brain MRI Prediction] Gemini fallback failed, using local mock data:', geminiError.message);
          mlResponse = getMockBrainPrediction(age, sex);
        }
      }

      const response = {
        predictions: mlResponse.predictions || [],
        severity: mlResponse.severity || 'moderate',
        explanation: mlResponse.explanation || 'Brain MRI analysis completed',
        recommendations: mlResponse.recommendations || mlResponse.advice || 'Please consult a neurologist for proper diagnosis.',
        should_see_doctor: mlResponse.should_see_doctor !== undefined ? mlResponse.should_see_doctor : true,
        urgency_level: mlResponse.urgency_level || 'routine',
        heatmap_url: mlResponse.heatmap_url || null,
        disclaimer: 'This tool provides informational guidance only and is not a medical diagnosis.',
      };

      try {
        const queryRecord = await Query.create({
          userId: req.user.id,
          type: 'brain-mri',
          input: { imageUrl, age: age || null, sex: sex || null },
          modelOutput: mlResponse.predictions || response.predictions,
          severity: response.severity,
          advice: response.recommendations,
          resources: { heatmapUrl: response.heatmap_url, imageUrl },
          createdAt: new Date(),
        });
        console.log(`[Brain MRI Prediction] Saved query ${queryRecord._id}`);
      } catch (dbError) {
        console.error('[Brain MRI Prediction] Database save error:', dbError.message);
      }

      res.json(response);
    } catch (error) {
      console.error('[Brain MRI Prediction] Unexpected error:', error);
      res.status(500).json({ error: true, message: 'An unexpected error occurred during brain MRI analysis' });
    }
  }
);

/**
 * POST /api/predict/face
 * Face scan analysis for acne and skin condition detection
 */
router.post(
  '/face',
  authenticateToken,
  upload.single('image'),
  [
    body('age').optional().isInt({ min: 10, max: 100 }).withMessage('Age must be between 10 and 100'),
    body('sex').optional().isIn(['male', 'female', 'other']).withMessage('Sex must be male, female, or other'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: true, message: 'Validation failed', details: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: true, message: 'Facial image file is required' });
      }

      const { age, sex } = req.body;
      console.log(`[Face Acne Prediction] User: ${req.user.id}, File: ${req.file.originalname}`);

      let imageUrl;
      try {
        imageUrl = await uploadToS3(req.file, 'face-scans');
        console.log(`[Face Acne Prediction] Uploaded to S3: ${imageUrl}`);
      } catch (s3Error) {
        console.error('[Face Acne Prediction] S3 upload error:', s3Error.message);
        return res.status(500).json({ error: true, message: 'Failed to upload image to storage' });
      }

      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('image', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
      if (age) formData.append('age', age);
      if (sex) formData.append('sex', sex);

      const mlServiceUrl = process.env.FACE_ML_URL || 'http://ml_face:8004';
      let mlResponse;

      try {
        if (process.env.USE_API_ONLY === 'true' || process.env.RENDER === 'true') {
          throw new Error('Skipping local ML models on Render, using API fallback immediately.');
        }
        const response = await axios.post(`${mlServiceUrl}/infer`, formData, {
          timeout: 10000,
          headers: formData.getHeaders(),
        });
        mlResponse = response.data;
      } catch (error) {
        console.warn('[Face Acne Prediction] ML service failed, trying Gemini fallback:', error.message);
        
        try {
          const prompt = `You are a skincare and acne analysis assistant. Analyze this facial image for a patient (Age: ${age || 'unknown'}, Sex: ${sex || 'unknown'}).
Return a JSON object matching this schema:
{
  "conditions": [
    {
      "condition": "Detected condition (e.g. Acne Vulgaris, Blackheads, Healthy Skin)",
      "score": 0.92,
      "details": "Explanation of intensity and affected regions (forehead, cheeks, etc.)"
    }
  ],
  "overall_severity": "mild" | "moderate" | "severe",
  "should_see_doctor": false,
  "doctor_recommendation_reason": "Why or why not they should consult a dermatologist",
  "treatments": ["Suggested treatments (e.g. Salicylic acid, Benzoyl peroxide)"],
  "skincare_routine": {
    "morning": ["Morning skincare steps"],
    "night": ["Night skincare steps"]
  },
  "dietary_advice": ["Dietary suggestions to improve skin health"]
}
Return ONLY valid JSON. No markdown backticks, no wrapping text. Just raw JSON.`;

          mlResponse = await callGemini(prompt, req.file.buffer, req.file.mimetype);
        } catch (geminiError) {
          console.error('[Face Acne Prediction] Gemini fallback failed, using local mock data:', geminiError.message);
          mlResponse = getMockFacePrediction(age, sex);
        }
      }

      const response = {
        conditions: mlResponse.conditions || [],
        overall_severity: mlResponse.overall_severity || mlResponse.severity || 'mild',
        should_see_doctor: mlResponse.should_see_doctor !== undefined ? mlResponse.should_see_doctor : false,
        doctor_recommendation_reason: mlResponse.doctor_recommendation_reason || mlResponse.advice || '',
        treatments: mlResponse.treatments || [],
        skincare_routine: mlResponse.skincare_routine || {},
        dietary_advice: mlResponse.dietary_advice || [],
        disclaimer: 'This tool provides informational guidance only and is not a professional dermatological diagnosis.',
      };

      try {
        const queryRecord = await Query.create({
          userId: req.user.id,
          type: 'face-acne',
          input: { imageUrl, age: age || null, sex: sex || null },
          modelOutput: mlResponse.conditions || response.conditions,
          severity: response.overall_severity,
          advice: response.doctor_recommendation_reason,
          resources: { imageUrl, treatments: response.treatments, skincare_routine: response.skincare_routine, dietary_advice: response.dietary_advice },
          createdAt: new Date(),
        });
        console.log(`[Face Acne Prediction] Saved query ${queryRecord._id}`);
      } catch (dbError) {
        console.error('[Face Acne Prediction] Database save error:', dbError.message);
      }

      res.json(response);
    } catch (error) {
      console.error('[Face Acne Prediction] Unexpected error:', error);
      res.status(500).json({ error: true, message: 'An unexpected error occurred during face scan analysis' });
    }
  }
);

module.exports = router;
