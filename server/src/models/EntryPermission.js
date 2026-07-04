const mongoose = require('mongoose');

const entryPermissionSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      default: null,
    },
    date: { type: Date, required: true },
    producerName: { type: String, default: '' },
    programTitle: { type: String, default: '' },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sentToReceiverAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'PENDING', 'RECEIVED', 'COMPLETED', 'VALIDATED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

entryPermissionSchema.index({ date: 1 });
entryPermissionSchema.index({ status: 1 });

module.exports = mongoose.model('EntryPermission', entryPermissionSchema);
