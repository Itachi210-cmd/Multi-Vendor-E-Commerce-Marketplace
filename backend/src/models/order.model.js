import mongoose from 'mongoose';

const timelineEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['placed', 'packed', 'shipped', 'delivered', 'cancelled'],
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    image: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const subOrderSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  commission: {
    type: Number,
    required: true,
    min: 0,
  },
  vendorPayout: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['placed', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'placed',
  },
  timeline: {
    type: [timelineEntrySchema],
    default: () => [{ status: 'placed', at: new Date() }],
  },
});

const shippingAddressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    line1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
    },
    line2: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    items: [orderItemSchema],
    subOrders: [subOrderSchema],
    couponCode: {
      type: String,
      default: '',
      trim: true,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    payment: {
      provider: {
        type: String,
        default: 'mock',
        trim: true,
      },
      providerOrderId: {
        type: String,
        default: '',
        trim: true,
      },
      providerPaymentId: {
        type: String,
        default: '',
        trim: true,
      },
      method: {
        type: String,
        enum: ['', 'card', 'upi'],
        default: '',
      },
      failureReason: {
        type: String,
        default: '',
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
        index: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes specified in marketplace documentation
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ 'subOrders.vendorId': 1 });
orderSchema.index({ 'payment.providerOrderId': 1 });

/**
 * Generate human-readable unique order number: ORD-YYYYMMDD-XXXX
 */
export const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${dateStr}-${rand}`;
};

const Order = mongoose.model('Order', orderSchema);

export default Order;
