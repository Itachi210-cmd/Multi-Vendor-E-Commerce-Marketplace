import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

export default function VendorProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);

  // Upload progress state
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setProducts([]);
  }, [user?._id]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/products');
      setProducts(response.data?.products || []);
    } catch (err) {
      if (!err?.isCanceled) {
        setError(err.message || 'Failed to fetch your products');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'vendor') {
      fetchProducts();
    }
  }, [user?._id, user?.role]);

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

  const setPrimaryImage = (indexToPrimary) => {
    if (indexToPrimary === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [chosen] = copy.splice(indexToPrimary, 1);
      return [chosen, ...copy];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !description.trim() || price === '' || stock === '') {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (title.trim().length < 3 || title.trim().length > 120) {
      setFormError('Product title must be between 3 and 120 characters.');
      return;
    }

    if (description.trim().length > 2000) {
      setFormError('Description cannot exceed 2000 characters.');
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 1 || numPrice > 1000000) {
      setFormError('Price must be between ₹1 and ₹1,000,000 INR.');
      return;
    }

    const numStock = Number(stock);
    if (!Number.isInteger(numStock) || numStock < 0 || numStock > 100000) {
      setFormError('Stock must be an integer between 0 and 100,000.');
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

  // Filtered Products List
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === 'All' || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate Overview Stats
  const totalCount = products.length;
  const activeCount = products.filter((p) => p.isActive).length;
  const lowStockCount = products.filter((p) => p.isActive && p.stock <= 5).length;
  const outOfStockCount = products.filter((p) => p.isActive && p.stock === 0).length;

  return (
    <div className="vendor-products-view">
      {/* Top Metric Cards */}
      <div className="stitch-vendor-stats-grid">
        <div className="stitch-vendor-stat-card">
          <div>
            <p className="stitch-stat-label">Total Products</p>
            <p className="stitch-stat-val primary">{totalCount}</p>
          </div>
          <div className="stitch-stat-icon-wrap primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
        </div>

        <div className="stitch-vendor-stat-card">
          <div>
            <p className="stitch-stat-label">Active Listings</p>
            <p className="stitch-stat-val success">{activeCount}</p>
          </div>
          <div className="stitch-stat-icon-wrap success">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>

        <div className="stitch-vendor-stat-card">
          <div>
            <p className="stitch-stat-label">Low Stock Alerts</p>
            <p className="stitch-stat-val warning">{lowStockCount}</p>
          </div>
          <div className="stitch-stat-icon-wrap warning">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        <div className="stitch-vendor-stat-card">
          <div>
            <p className="stitch-stat-label">Out of Stock</p>
            <p className="stitch-stat-val danger">{outOfStockCount}</p>
          </div>
          <div className="stitch-stat-icon-wrap danger">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="stitch-vendor-table-card">
        {/* Table Toolbar Header */}
        <div className="stitch-table-toolbar">
          <div className="stitch-table-title-cluster">
            <h2 className="stitch-table-main-title">Product Catalog</h2>
            <span className="stitch-table-count-badge">{filteredProducts.length} items</span>
          </div>

          <div className="stitch-table-controls-cluster">
            {/* Search Input */}
            <div className="stitch-table-search-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stitch-search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="stitch-table-search-input"
              />
            </div>

            {/* Category Filter Dropdown */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="stitch-table-filter-select"
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Fashion">Fashion</option>
              <option value="Audio">Audio</option>
              <option value="Accessories">Accessories</option>
              <option value="Bags">Bags</option>
              <option value="Home">Home</option>
              <option value="Books">Books</option>
            </select>

            <button
              type="button"
              onClick={openCreateModal}
              className="stitch-add-product-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="stitch-checkout-error-alert" style={{ margin: '1rem 1.5rem' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="stitch-cart-loading" style={{ padding: '4rem 1.5rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1.25rem' }}></div>
            <p>Loading your products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="stitch-empty-orders-card" style={{ margin: '3rem auto', maxWidth: '500px' }}>
            <div className="stitch-empty-orders-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </div>
            <h3 className="stitch-empty-orders-title" style={{ fontSize: 'var(--font-lg)' }}>
              {products.length === 0 ? 'No Products Listed Yet' : 'No Matching Products'}
            </h3>
            <p className="stitch-empty-orders-desc" style={{ marginBottom: '1.5rem' }}>
              {products.length === 0
                ? 'Start selling by listing your first product with images, pricing, and descriptions.'
                : 'Try adjusting your search query or category filter.'}
            </p>
            {products.length === 0 && (
              <button onClick={openCreateModal} className="stitch-explore-btn">
                Create First Product
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="stitch-data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isLowStock = product.stock > 0 && product.stock <= 5;
                  const isOutOfStock = product.stock === 0;

                  return (
                    <tr key={product._id}>
                      <td>
                        <div className="stitch-table-product-cell">
                          <img
                            src={product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg'}
                            alt={product.title}
                            className="stitch-table-thumb"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.svg';
                            }}
                          />
                          <div>
                            <span className="stitch-table-prod-title">{product.title}</span>
                            <span className="stitch-table-prod-id">ID: {product._id?.slice(-8)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="stitch-category-badge">{product.category}</span>
                      </td>
                      <td>
                        <span className="stitch-table-price">₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td>
                        {isOutOfStock ? (
                          <span className="stitch-stock-pill out-of-stock">
                            <span className="stock-dot"></span> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="stitch-stock-pill low-stock">
                            <span className="stock-dot"></span> Only {product.stock} left
                          </span>
                        ) : (
                          <span className="stitch-stock-pill in-stock">
                            {product.stock} units
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`stitch-status-badge ${product.isActive ? 'paid' : 'failed'}`}>
                          {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="stitch-table-actions-cell">
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="stitch-table-action-btn edit"
                            title="Edit product"
                            aria-label={`Edit ${product.title}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          {product.isActive && (
                            <button
                              type="button"
                              onClick={() => handleDelete(product._id)}
                              className="stitch-table-action-btn deactivate"
                              title="Soft delete (deactivate)"
                              aria-label={`Deactivate ${product.title}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                              <span>Deactivate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="stitch-table-footer">
          <span className="stitch-table-footer-text">
            Showing {filteredProducts.length} of {products.length} products
          </span>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="stitch-modal-overlay">
          <div className="stitch-gateway-modal" style={{ maxWidth: '640px' }}>
            <div className="stitch-modal-header">
              <div className="stitch-modal-header-left">
                <div className="stitch-modal-icon-badge">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </div>
                <div>
                  <h3 className="stitch-modal-title">
                    {editingProduct ? 'Edit Product Details' : 'Add New Product'}
                  </h3>
                  <p className="stitch-modal-subtitle">Configure inventory, images, and pricing for your store</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="stitch-modal-close-btn"
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="stitch-modal-body">
              {formError && (
                <div className="stitch-checkout-error-alert" style={{ marginBottom: '1.25rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="stitch-modal-form">
                <div className="stitch-form-group">
                  <label className="stitch-form-label">Product Title * (3 - 120 chars)</label>
                  <input
                    type="text"
                    className="stitch-form-input"
                    placeholder="e.g. Minimalist Ceramic Vase"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </div>

                <div className="stitch-form-row-2">
                  <div className="stitch-form-group">
                    <label className="stitch-form-label">Category *</label>
                    <select
                      className="stitch-form-input"
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

                  <div className="stitch-form-group">
                    <label className="stitch-form-label">Price (₹ INR) * (1 - 1,000,000)</label>
                    <input
                      type="number"
                      min="1"
                      max="1000000"
                      step="1"
                      className="stitch-form-input"
                      placeholder="1999"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="stitch-form-row-2">
                  <div className="stitch-form-group">
                    <label className="stitch-form-label">Stock Quantity * (0 - 100,000)</label>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      className="stitch-form-input"
                      placeholder="50"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      required
                    />
                  </div>

                  <div className="stitch-form-group">
                    <label className="stitch-form-label">Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="stitch-form-input"
                      placeholder="wireless, gaming, bluetooth"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                </div>

                <div className="stitch-form-group">
                  <label className="stitch-form-label">Description * (Max 2000 chars)</label>
                  <textarea
                    className="stitch-form-input"
                    rows={4}
                    placeholder="Provide comprehensive product specifications and details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    required
                    style={{ minHeight: '90px' }}
                  />
                </div>

                {/* S3 Presigned Multiple Image Upload */}
                <div className="stitch-form-group">
                  <label className="stitch-form-label">Product Images (Direct Supabase / S3 Upload)</label>
                  <div className="stitch-upload-dropzone">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)', margin: '0 auto 0.5rem' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="stitch-upload-prompt">Click or select images to upload</p>
                    <span className="stitch-upload-subhint">Supports JPEG, PNG, WebP up to 5 MB per file</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="stitch-file-input-hidden"
                    />
                  </div>

                  {/* Uploading Progress Bars */}
                  {uploadingFiles.length > 0 && (
                    <div className="stitch-uploading-list">
                      {uploadingFiles.map((uf) => (
                        <div key={uf.id} className="stitch-uploading-row">
                          <span className="stitch-uploading-name">{uf.name}</span>
                          <div className="stitch-uploading-bar-track">
                            <div className="stitch-uploading-bar-fill" style={{ width: `${uf.progress}%` }}></div>
                          </div>
                          <span className="stitch-uploading-pct">{uf.progress}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Uploaded Thumbnails Preview with Primary Selector */}
                  {images.length > 0 && (
                    <div className="stitch-uploaded-gallery-grid">
                      {images.map((imgUrl, idx) => (
                        <div key={idx} className={`stitch-uploaded-thumb-card ${idx === 0 ? 'primary-image' : ''}`}>
                          <img src={imgUrl} alt={`Product ${idx + 1}`} className="stitch-thumb-preview" />
                          {idx === 0 && (
                            <span className="stitch-primary-image-badge">Primary</span>
                          )}
                          <div className="stitch-thumb-overlay-actions">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => setPrimaryImage(idx)}
                                className="stitch-thumb-btn-set-primary"
                                title="Set as primary thumbnail"
                              >
                                Set Cover
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="stitch-thumb-btn-delete"
                              title="Remove image"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="stitch-modal-actions-row">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="stitch-modal-cancel-btn"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="stitch-modal-confirm-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
