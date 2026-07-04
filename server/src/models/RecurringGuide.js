const mongoose = require('mongoose');

// weekday: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
const recurringGuideSchema = new mongoose.Schema(
  {
    programName: { type: String, required: true, trim: true },
    weekday: { type: Number, required: true, min: 0, max: 6 }, // 0=Mon … 6=Sun
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "10:00"
    producerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productionChiefId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submissionDeadlineHours: { type: Number, required: true }, // 24, 35, 48, 72, custom
    isActive: { type: Boolean, default: true },
    weeksAhead: { type: Number, default: 4 },   // how many weeks to maintain ahead
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, default: '' },
    groupId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

recurringGuideSchema.index({ producerId: 1, isActive: 1 });
recurringGuideSchema.index({ weekday: 1, isActive: 1 });

module.exports = mongoose.model('RecurringGuide', recurringGuideSchema);
