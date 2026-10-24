import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api/axios';

export default function VendorProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);

  // Upload progress state
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/products');
      setProducts(response.data?.products || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch your products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setStock('');
    setCategory('Electronics');
    setTags('');
    setImages([]);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setTitle(product.title);
    setDescription(product.description);
    setPrice(product.price);
    setStock(product.stock);
    setCategory(product.category);
    setTags((product.tags || []).join(', '));
    setImages(product.images || []);
    setFormError('');
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFormError(`Unsupported file format '${file.name}'. Only JPEG, PNG, and WebP are allowed.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFormError(`File '${file.name}' exceeds the 5 MB maximum size limit.`);
        continue;
      }

      const fileId = `${file.name}-${Date.now()}`;
      setUploadingFiles((prev) => [...prev, { id: fileId, name: file.name, progress: 10 }]);

      try {
        // Step 1: Request presigned PUT URL from backend
        const presignRes = await api.post('/uploads/presign', {
          fileName: file.name,
          contentType: file.type,
          folder: 'products',
        });

        const { uploadUrl, fileUrl } = presignRes.data;

        // Step 2: Directly upload raw file bytes to S3/MinIO
        await axios.put(uploadUrl, file, {
          headers: {
            'Content-Type': file.type,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadingFiles((prev) =>
              prev.map((item) => (item.id === fileId ? { ...item, progress: percentCompleted } : item))
            );
          },
        });

        // Step 3: Save permanent fileUrl to images array
        setImages((prev) => [...prev, fileUrl]);
      } catch (uploadErr) {
        setFormError(`Failed to upload '${file.name}': ${uploadErr.message}`);
      } finally {
        setUploadingFiles((prev) => prev.filter((item) => item.id !== fileId));
      }
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !description.trim() || price === '' || stock === '') {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (Number(price) < 0) {
      setFormError('Price must be greater than or equal to 0.');
      return;
    }

    if (parseInt(stock, 10) < 0 || !Number.isInteger(Number(stock))) {
      setFormError('Stock must be a valid integer >= 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        stock: parseInt(stock, 10),
        category: category.trim(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Error saving product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to deactivate (soft-delete) this product?')) return;
    try {
      await api.delete(`/products/${productId}`);
      fetchProducts();
    } catch (err) {
      alert(`Failed to deactivate product: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="content-header-row">
        <div>
          <h1 className="section-title">My Products</h1>
          <p className="section-subtitle">Manage catalog inventory, update pricing, and upload images to S3/MinIO.</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          + Add New Product
        </button>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ margin: '1rem 0' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="auth-loading-screen">
          <div className="spinner"></div>
          <p>Loading your products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state-card">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3>No Products Listed Yet</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1.5rem' }}>
            Start selling by listing your first product with images and descriptions.
          </p>
          <button onClick={openCreateModal} className="btn btn-primary btn-sm">
            Create First Product
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="table-img-thumb"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/60?text=No+Img';
                        }}
                      />
                    ) : (
                      <div className="table-img-placeholder">N/A</div>
                    )}
                  </td>
                  <td>
                    <strong>{product.title}</strong>
                  </td>
                  <td>
                    <span className="badge badge-secondary">{product.category}</span>
                  </td>
                  <td>₹{product.price.toLocaleString()}</td>
                  <td>{product.stock}</td>
                  <td>
                    <span className={`badge ${product.isActive ? 'badge-connected' : 'badge-error'}`}>
                      <span className="badge-dot"></span>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(product)}
                        className="btn btn-secondary btn-sm"
                        title="Edit product"
                      >
                        Edit
                      </button>
                      {product.isActive && (
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          title="Soft delete (deactivate)"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close-btn">
                ✕
              </button>
            </div>

            {formError && (
              <div className="alert-box alert-error" style={{ margin: '1rem 0' }}>
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Product Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Wireless Ergonomic Keyboard"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Audio">Audio</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Bags">Bags</option>
                    <option value="Home">Home</option>
                    <option value="Books">Books</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="1999"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="50"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="wireless, gaming, bluetooth"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Provide comprehensive product specifications and details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* S3 Presigned Multiple Image Upload */}
              <div className="form-group">
                <label className="form-label">Product Images (Direct S3 / MinIO Upload)</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="form-input"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Upload JPEG, PNG, or WebP files (max 5 MB each). Images upload directly to storage via pre-signed URLs.
                </span>

                {/* Uploading progress bars */}
                {uploadingFiles.map((uf) => (
                  <div key={uf.id} className="upload-progress-item">
                    <span>{uf.name}</span>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${uf.progress}%` }}></div>
                    </div>
                    <span>{uf.progress}%</span>
                  </div>
                ))}

                {/* Uploaded thumbnails preview */}
                {images.length > 0 && (
                  <div className="image-previews-grid">
                    {images.map((imgUrl, idx) => (
                      <div key={idx} className="image-preview-thumb">
                        <img src={imgUrl} alt={`Uploaded ${idx + 1}`} />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="image-remove-btn"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
