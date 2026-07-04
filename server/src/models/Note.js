const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

noteSchema.index({ guideId: 1 });

module.exports = mongoose.model('Note', noteSchema);
