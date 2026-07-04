const mongoose = require('mongoose');
const { GUIDE_STATUSES } = require('../utils/constants');

const guideSchema = new mongoose.Schema(
  {
    programTitle: { type: String, default: '' },
    producerName: { type: String, default: '' },
    broadcastDate: { type: String, default: '' },
    programDuration: { type: String, default: '' },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    theme: { type: String, default: '' },
    status: {
      type: String,
      enum: GUIDE_STATUSES,
      default: 'DRAFT',
    },
    version: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    liveStartedAt: { type: Date, default: null },
    liveStoppedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    occurrenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuideOccurrence', default: null },
  },
  { timestamps: true }
);

guideSchema.index({ status: 1 });

module.exports = mongoose.model('Guide', guideSchema);
