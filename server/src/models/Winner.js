const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
    },
    winnerName: { type: String, required: true, trim: true },
    prize: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    cin: { type: String, default: '' },
    blacklisted: { type: Boolean, default: false },
    blacklistedAt: { type: Date, default: null },
    filledByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sentToPublicityAt: { type: Date, default: null },
    receivedByPublicityAt: { type: Date, default: null },
    emailStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

winnerSchema.index({ guideId: 1 });

module.exports = mongoose.model('Winner', winnerSchema);
