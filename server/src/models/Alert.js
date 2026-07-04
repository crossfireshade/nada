const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL', 'SUCCESS'],
      default: 'INFO',
    },
    messageKey: { type: String, default: '' },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    message: { type: String, default: '' },
    targetRole: { type: String, default: null },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['UNREAD', 'READ'],
      default: 'UNREAD',
    },
    isDeleted: { type: Boolean, default: false },
    dedupeKey: { type: String, default: null },
    relatedEntityType: { type: String, default: null },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

alertSchema.index({ targetUserId: 1, status: 1, isDeleted: 1 });
alertSchema.index({ targetRole: 1, status: 1, isDeleted: 1 });
alertSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Alert', alertSchema);
