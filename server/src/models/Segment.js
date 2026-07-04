const mongoose = require('mongoose');

const segmentSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
    },
    order: { type: Number, required: true },
    rowType: { type: String, enum: ['PROGRAMME', 'LIGNE_PROGRAMME'], default: 'PROGRAMME' },
    startTime: { type: String, default: '' },
    duration: { type: String, default: '' },
    content: { type: String, default: '' },
    guestFullName: { type: String, default: '' },
    guestTitleFunction: { type: String, default: '' },
    guestAttendanceMode: { type: String, enum: ['PRESENT_STUDIO', 'TELEPHONE'], default: 'PRESENT_STUDIO' },
    guestPhone: { type: String, default: '' },
    guestPhotoUrl: { type: String, default: '' },
    completedLive: { type: Boolean, default: false },
    streaming: { type: Boolean, default: false },
  },
  { timestamps: true }
);

segmentSchema.index({ guideId: 1, order: 1 });

module.exports = mongoose.model('Segment', segmentSchema);
