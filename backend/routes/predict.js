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
          // Use gemini-1.5-flash for very fast, lightweight text correction
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

      // Call ML Text Service (Local)
      try {
        const mlServiceUrl = process.env.TEXT_ML_URL || 'http://localhost:8001';
        
        console.log(`[Text Prediction] Calling ML Service at ${mlServiceUrl} with corrected text`);
        
        const mlResponse = await axios.post(`${mlServiceUrl}/infer`, {
           text, age, sex, reports
        }, {
           timeout: 10000
        });
        
        const mlData = mlResponse.data;
        
        // Structure response
        const finalResponse = {
           predictions: mlData.predictions || [],
           severity: mlData.severity || 'Unknown',
           advice: mlData.advice || 'Analysis complete.',
           health_advice: mlData.health_advice || null,
           disclaimer: MEDICAL_DISCLAIMER
        };
        
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
        
      } catch (mlError) {
          console.error('[Text Prediction] ML Service Error:', mlError.message);
          if (mlError.response) {
            console.error('ML Service Response:', mlError.response.data);
          }
          
          return res.status(503).json({
             error: true,
             message: 'Symptom analysis service is unavailable. Please check if ml_text is running.',
             disclaimer: MEDICAL_DISCLAIMER
          });
      }

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

      // Call ML image service
      const mlServiceUrl = process.env.IMAGE_ML_URL || 'http://ml_image:8002';
      let mlResponse;

      try {
        const response = await axios.post(`${mlServiceUrl}/infer`, formData, {
          timeout: 10000,
          headers: formData.getHeaders(),
        });
        mlResponse = response.data;
      } catch (error) {
        console.error('[Image Prediction] ML service error:', error.message);
        
        return res.status(503).json({
          error: true,
          message: 'ML prediction service is currently unavailable. Please try again later.',
          disclaimer: MEDICAL_DISCLAIMER,
        });
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
        // Continue with response even if DB save fails
      }

      // Return successful prediction
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
        const response = await axios.post(`${mlServiceUrl}/infer`, formData, {
          timeout: 15000,
          headers: formData.getHeaders(),
        });
        mlResponse = response.data;
      } catch (error) {
        console.error('[Brain MRI Prediction] ML service error:', error.message);
        return res.status(503).json({
          error: true,
          message: 'Brain MRI analysis service is currently unavailable. Please try again later.',
          disclaimer: 'This tool provides informational guidance only. For emergencies, call emergency services immediately.',
        });
      }

      const response = {
        predictions: mlResponse.predictions || [],
        severity: mlResponse.severity || 'moderate',
        explanation: mlResponse.explanation || 'Brain MRI analysis completed',
        recommendations: mlResponse.recommendations || 'Please consult a neurologist for proper diagnosis.',
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
          modelOutput: mlResponse.predictions,
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

      const mlServiceUrl = process.env.FACE_ML_URL ||'http://ml_face:8004';
      let mlResponse;

      try {
        const response = await axios.post(`${mlServiceUrl}/infer`, formData, {
          timeout: 10000,
          headers: formData.getHeaders(),
        });
        mlResponse = response.data;
      } catch (error) {
        console.error('[Face Acne Prediction] ML service error:', error.message);
        return res.status(503).json({
          error: true,
          message: 'Face acne detection service is currently unavailable. Please try again later.',
          disclaimer: 'This tool provides informational guidance only. For severe skin conditions, consult a dermatologist.',
        });
      }

      const response = {
        conditions: mlResponse.conditions || [],
        overall_severity: mlResponse.overall_severity || 'mild',
        should_see_doctor: mlResponse.should_see_doctor !== undefined ? mlResponse.should_see_doctor : false,
        doctor_recommendation_reason: mlResponse.doctor_recommendation_reason || '',
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
          modelOutput: mlResponse.conditions,
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
