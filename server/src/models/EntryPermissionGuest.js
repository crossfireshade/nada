const mongoose = require('mongoose');

const entryPermissionGuestSchema = new mongoose.Schema(
  {
    entryPermissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EntryPermission',
      required: true,
    },
    guestName: { type: String, required: true, trim: true },
    functionTitle: { type: String, default: '' },
    cin: { type: String, default: '' },
    checkinTime: { type: Date, default: null },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

entryPermissionGuestSchema.index({ entryPermissionId: 1 });

module.exports = mongoose.model('EntryPermissionGuest', entryPermissionGuestSchema);
