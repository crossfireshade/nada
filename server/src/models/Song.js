const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    artist: { type: String, default: '' },
    duration: { type: String, default: '' },
    order: { type: Number, default: 0 },
    passageTime: { type: String, default: '' },
    validatedLive: { type: Boolean, default: false },
    streaming: { type: Boolean, default: false },
    validatedAt: { type: Date },
    genre: { type: String, enum: ['TUNISIEN', 'ORIENTAL', 'OCCIDENTAL', 'AUTRE', ''], default: '' },
    artistCountry: { type: String, default: '' },
    spotifyId: { type: String, default: '' },
  },
  { timestamps: true }
);

songSchema.index({ guideId: 1, order: 1 });

module.exports = mongoose.model('Song', songSchema);
