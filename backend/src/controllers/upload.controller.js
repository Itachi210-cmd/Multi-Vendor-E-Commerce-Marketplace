import { s3Service } from '../config/s3.js';
import { getApprovedVendorByUserId } from '../services/product.service.js';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FOLDERS = ['products', 'vendors'];

/**
 * Controller to generate a presigned PUT URL for direct browser uploads
 * POST /api/uploads/presign
 */
export const presignUpload = async (req, res, next) => {
  try {
    const { fileName, contentType, folder = 'products' } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Both fileName and contentType are required in request body',
      });
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid contentType '${contentType}'. Allowed types: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      });
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return res.status(400).json({
        success: false,
        message: `Invalid folder '${folder}'. Allowed folders: ${ALLOWED_FOLDERS.join(', ')}`,
      });
    }

    // Ensure user is an approved vendor
    const vendor = await getApprovedVendorByUserId(req.user._id);

    const presignedData = await s3Service.createPresignedUploadUrl({
      fileName,
      contentType,
      folder,
      vendorId: vendor._id.toString(),
    });

    res.status(200).json({
      success: true,
      ...presignedData,
    });
  } catch (error) {
    next(error);
  }
};
