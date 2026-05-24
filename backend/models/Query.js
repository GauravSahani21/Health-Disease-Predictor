const mongoose = require('mongoose');

const QuerySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'face-acne', 'brain-mri'],
      required: true,
      index: true,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    modelOutput: [
      {
        condition: {
          type: String,
          required: true,
        },
        score: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
        },
        severity: String,
        evidence: [String],
        affected_areas: [String],
      },
    ],
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe', 'mild', 'clear'],
      required: true,
      index: true,
    },
    advice: {
      type: String,
      default: '',
    },
    resources: {
      heatmapUrl: String,
      imageUrl: String,
      reportUrls: [String],
    },
    metadata: {
      processingTime: Number, // milliseconds
      modelVersion: String,
      backendVersion: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient history queries
QuerySchema.index({ userId: 1, createdAt: -1 });
QuerySchema.index({ userId: 1, type: 1, createdAt: -1 });
QuerySchema.index({ userId: 1, severity: 1, createdAt: -1 });

// Virtual for formatted date
QuerySchema.virtual('formattedDate').get(function () {
  return this.createdAt.toLocaleDateString();
});

// Method to get top prediction
QuerySchema.methods.getTopPrediction = function () {
  if (this.modelOutput && this.modelOutput.length > 0) {
    return this.modelOutput[0];
  }
  return null;
};

// Static method to get user statistics
QuerySchema.statics.getUserStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$metadata.processingTime' },
      },
    },
  ]);

  const severityStats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 },
      },
    },
  ]);

  return { queryTypes: stats, severityBreakdown: severityStats };
};

module.exports = mongoose.model('Query', QuerySchema);
