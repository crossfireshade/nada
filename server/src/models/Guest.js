const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    titleFunction: { type: String, default: '' },
    participationMode: {
      type: String,
      enum: ['PRESENT_STUDIO', 'TELEPHONE'],
      required: true,
    },
    phone: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    photoUrls: { type: [String], default: [] },
    presentLive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

guestSchema.index({ guideId: 1 });

module.exports = mongoose.model('Guest', guestSchema);
