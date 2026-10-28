import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

export default function ProductReviewsSection({ productId }) {
  const { user, isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    average: 0,
    totalCount: 0,
    counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Eligibility
  const [eligibility, setEligibility] = useState({ canReview: false, reason: '' });
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  // Form
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchReviews = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/products/${productId}/reviews?page=${targetPage}&limit=5`);
      setReviews(res.data?.reviews || []);
      setSummary(res.data?.summary || { average: 0, totalCount: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
      setPage(res.data?.page || 1);
      setPages(res.data?.pages || 1);
    } catch {
      setError('Failed to load customer reviews');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchEligibility = useCallback(async () => {
    if (!isAuthenticated) {
      setEligibility({ canReview: false, reason: 'Log in as a customer to review this product' });
      return;
    }
    if (user?.role !== 'customer') {
      setEligibility({
        canReview: false,
        reason:
          user?.role === 'vendor'
            ? 'Vendor accounts cannot review products.'
            : 'Administrator accounts cannot review products.',
      });
      return;
    }
    setLoadingEligibility(true);
    try {
      const res = await api.get(`/products/${productId}/reviews/eligibility`);
      setEligibility(res.data);
    } catch (err) {
      if (!err?.isCanceled) {
        setEligibility({
          canReview: false,
          reason: err.response?.data?.message || 'Unable to check review eligibility',
        });
      }
    } finally {
      setLoadingEligibility(false);
    }
  }, [productId, isAuthenticated, user]);

  useEffect(() => {
    setEditingId(null);
    setComment('');
    setFormError('');
    setFormSuccess('');
  }, [user?._id]);

  useEffect(() => {
    fetchReviews(1);
    fetchEligibility();
  }, [fetchReviews, fetchEligibility]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (rating < 1 || rating > 5) {
      setFormError('Please select a star rating between 1 and 5');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/products/${productId}/reviews`, {
        rating,
        comment: comment.trim(),
      });
      setFormSuccess('Thank you! Your verified review has been published.');
      setComment('');
      setRating(5);
      await fetchReviews(1);
      await fetchEligibility();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (rev) => {
    setEditingId(rev._id);
    setEditRating(rev.rating);
    setEditComment(rev.comment || '');
  };

  const handleSaveEdit = async (reviewId) => {
    setEditSubmitting(true);
    try {
      await api.put(`/reviews/${reviewId}`, {
        rating: editRating,
        comment: editComment.trim(),
      });
      setEditingId(null);
      await fetchReviews(page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update review');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      await fetchReviews(page);
      await fetchEligibility();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete review');
    }
  };

  const renderStars = (starCount, interactive = false, currentVal = 0, onHover = () => {}, onClick = () => {}) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = interactive ? i <= (hoverRating || currentVal) : i <= starCount;
      stars.push(
        <span
          key={i}
          className={`star-icon ${isFilled ? 'filled' : 'empty'}`}
          style={{
            cursor: interactive ? 'pointer' : 'default',
            color: isFilled ? '#f59e0b' : '#cbd5e1',
            fontSize: interactive ? '1.8rem' : '1.1rem',
            marginRight: '2px',
            userSelect: 'none',
            transition: 'transform 0.1s ease',
          }}
          onMouseEnter={() => interactive && onHover(i)}
          onMouseLeave={() => interactive && onHover(0)}
          onClick={() => interactive && onClick(i)}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  const totalReviews = summary.totalCount || 0;

  return (
    <section className="stitch-reviews-section">
      <div className="stitch-reviews-header">
        <h2 className="stitch-reviews-title">
          Customer Reviews & Ratings
        </h2>
        <p className="stitch-reviews-subtitle">
          Verified customer ratings computed from delivered purchases
        </p>
      </div>

      {/* Top Summary & Breakdown Grid: Left Score + Right 5 Horizontal Bars */}
      <div className="stitch-reviews-summary-card">
        {/* Left: Overall score + star cluster */}
        <div className="stitch-score-col">
          <div className="stitch-score-num">
            {summary.average > 0 ? summary.average.toFixed(1) : '0.0'}
          </div>
          <div className="stitch-score-stars">
            {renderStars(Math.round(summary.average))}
          </div>
          <span className="stitch-score-meta">
            Based on {totalReviews} verified {totalReviews === 1 ? 'rating' : 'ratings'}
          </span>
        </div>

        {/* Right: 5 Horizontal Bars matching Stitch */}
        <div className="stitch-bars-col">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = summary.counts?.[s] || 0;
            const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={s} className="stitch-bar-row">
                <span className="stitch-bar-label">{s} {s === 1 ? 'Star' : 'Stars'}</span>
                <div className="stitch-bar-track">
                  <div
                    className="stitch-bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="stitch-bar-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Eligibility & Submission Form */}
      <div className="stitch-review-form-area">
        {loadingEligibility ? (
          <div className="stitch-restricted-review-box">
            <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Checking review eligibility...
            </span>
          </div>
        ) : eligibility.canReview ? (
          <form onSubmit={handleSubmitReview} className="stitch-review-form-card">
            <h3 className="stitch-form-title">
              Write a Verified Review
            </h3>
            <p className="stitch-form-sub">
              You received this product in a delivered order. Share your honest feedback with fellow shoppers!
            </p>

            {formError && (
              <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
                <span>✓</span>
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="stitch-form-group">
              <label className="stitch-form-label">
                Your Rating:
              </label>
              <div className="interactive-stars-wrap">
                {renderStars(rating, true, rating, setHoverRating, setRating)}
              </div>
            </div>

            <div className="stitch-form-group">
              <div className="stitch-label-row">
                <label className="stitch-form-label">
                  Review Comment:
                </label>
                <span className="stitch-char-counter">
                  {comment.length} / 1000
                </span>
              </div>
              <textarea
                rows="4"
                maxLength="1000"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike? How was the build quality, sound profile, fit, or comfort?"
                className="stitch-textarea"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-md"
            >
              {submitting ? 'Submitting Review...' : 'Post Verified Review'}
            </button>
          </form>
        ) : (
          <div className="stitch-restricted-review-box">
            <div className="stitch-restricted-left">
              <div className="stitch-lock-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <span className="stitch-restricted-title">
                  Reviews restricted to verified buyers
                </span>
                <p className="stitch-restricted-desc">
                  {eligibility.reason || 'Only customers who have had this item delivered can leave a verified review.'}
                </p>
              </div>
            </div>
            {!isAuthenticated && (
              <a href="/login" className="btn btn-secondary btn-sm">
                Log In
              </a>
            )}
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="stitch-reviews-list-section">
        <h3 className="stitch-list-heading">
          Customer Feedback ({totalReviews})
        </h3>

        {loading ? (
          <div className="stitch-reviews-loading">
            <div className="spinner"></div>
            <span>Loading reviews...</span>
          </div>
        ) : error ? (
          <div className="alert-box alert-error">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="stitch-empty-reviews-card">
            <div className="empty-bubble-icon">💬</div>
            <p className="empty-reviews-title">No reviews yet for this product</p>
            <span className="empty-reviews-sub">Be the first verified customer to share your thoughts once your order is delivered!</span>
          </div>
        ) : (
          <div className="stitch-reviews-stream">
            {reviews.map((rev) => {
              const isOwner = user && rev.customerId && (user._id === rev.customerId || user._id === rev.customerId?._id);
              const isAdmin = user?.role === 'admin';
              const isEditing = editingId === rev._id;

              return (
                <div key={rev._id} className="stitch-review-card">
                  <div className="stitch-review-card-top">
                    <div className="stitch-reviewer-info">
                      <div className="stitch-reviewer-avatar">
                        {rev.customerName ? rev.customerName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="stitch-reviewer-name-row">
                          <h5 className="stitch-reviewer-name">
                            {rev.customerName || 'Verified Shopper'}
                          </h5>
                          {rev.verifiedPurchase && (
                            <span className="stitch-verified-badge">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <span className="stitch-review-date">
                          Reviewed on {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="stitch-review-top-right">
                      <div className="stitch-review-stars">
                        {renderStars(rev.rating)}
                      </div>

                      {(isOwner || isAdmin) && (
                        <div className="stitch-review-actions-menu">
                          {isOwner && !isEditing && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(rev)}
                              className="btn btn-secondary btn-sm"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev._id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="stitch-review-edit-box">
                      <div className="edit-rating-group">
                        <label className="edit-rating-label">Update Rating:</label>
                        <div className="interactive-stars-wrap">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              onClick={() => setEditRating(s)}
                              className={`star-icon ${s <= editRating ? 'filled' : 'empty'}`}
                              style={{ cursor: 'pointer', fontSize: '1.4rem', color: s <= editRating ? '#f59e0b' : '#cbd5e1', marginRight: '4px' }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <textarea
                        rows="3"
                        maxLength="1000"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="stitch-textarea"
                      />
                      <div className="edit-actions-btns">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(rev._id)}
                          disabled={editSubmitting}
                          className="btn btn-primary btn-sm"
                        >
                          {editSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    rev.comment && (
                      <p className="stitch-review-comment">
                        {rev.comment}
                      </p>
                    )
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {pages > 1 && (
              <div className="stitch-reviews-pagination">
                <button
                  type="button"
                  onClick={() => fetchReviews(page - 1)}
                  disabled={page <= 1}
                  className="btn btn-secondary btn-sm"
                >
                  ← Previous
                </button>
                <span className="pagination-text">
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  onClick={() => fetchReviews(page + 1)}
                  disabled={page >= pages}
                  className="btn btn-secondary btn-sm"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
