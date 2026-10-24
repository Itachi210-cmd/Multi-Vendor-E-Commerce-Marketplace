import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock must be greater than or equal to 0'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not a valid integer for stock quantity',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    ratingAvg: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes per Section 4 of doc
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ vendorId: 1, isActive: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
