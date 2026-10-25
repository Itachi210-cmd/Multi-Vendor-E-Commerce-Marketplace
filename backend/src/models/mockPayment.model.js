import mongoose from 'mongoose';

/**
 * MockPayment Schema for Test Gateway Sandbox
 * Represents transactions processed in test mode.
 */
const mockPaymentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerOrderId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    method: {
      type: String,
      enum: ['card', 'upi'],
      required: true,
    },
    status: {
      type: String,
      enum: ['created', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    cardLast4: {
      type: String,
      default: '',
    },
    cardBrand: {
      type: String,
      default: '',
    },
    upiVpa: {
      type: String,
      default: '',
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

const MockPayment = mongoose.model('MockPayment', mockPaymentSchema, 'mock_payments');

export default MockPayment;
