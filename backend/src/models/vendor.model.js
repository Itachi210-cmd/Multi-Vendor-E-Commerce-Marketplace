import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      minlength: [2, 'Store name must be at least 2 characters'],
      maxlength: [100, 'Store name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid vendor status',
      },
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    commissionPct: {
      type: Number,
      default: 10,
      min: [0, 'Commission cannot be negative'],
      max: [50, 'Commission cannot exceed 50%'],
    },
    razorpayLinkedAccountId: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
