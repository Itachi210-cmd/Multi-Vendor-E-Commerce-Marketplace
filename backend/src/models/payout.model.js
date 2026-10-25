import mongoose from 'mongoose';

/**
 * Payout Schema per Marketplace documentation
 * Records platform vendor payouts per subOrder.
 */
const payoutSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    commission: {
      type: Number,
      required: true,
      min: 0,
    },
    transferId: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed', 'reversed'],
      default: 'pending',
      index: true,
    },
    failureReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Unique index on (orderId, vendorId) for strict idempotency
payoutSchema.index({ orderId: 1, vendorId: 1 }, { unique: true });

const Payout = mongoose.model('Payout', payoutSchema, 'payouts');

export default Payout;
