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
    } catch (err) {
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
  }, [productId, isAuthenticated, user?.role, user?._id]);

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
    <section className="reviews-section" style={{ marginTop: '3.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
            Customer Reviews & Ratings
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Verified customer ratings computed from real purchases
          </p>
        </div>
      </div>

      {/* Top Summary & Breakdown Grid */}
      <div className="reviews-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2.5rem', background: 'var(--color-bg-alt, #f8fafc)', padding: '1.75rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
        {/* Overall score */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRight: '1px solid var(--color-border)', paddingRight: '1rem' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
            {summary.average > 0 ? summary.average.toFixed(1) : '0.0'}
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            {renderStars(Math.round(summary.average))}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Based on {totalReviews} verified {totalReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        {/* Star Bars Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', justifyContent: 'center' }}>
          {[5, 4, 3, 2, 1].map((s) => {
            const count = summary.counts?.[s] || 0;
            const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ width: '45px', fontWeight: 600, color: '#475569' }}>{s} star</span>
                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ width: '40px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Eligibility & Submission Form */}
      <div style={{ marginBottom: '2.5rem' }}>
        {eligibility.canReview ? (
          <form onSubmit={handleSubmitReview} style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
              Write a Verified Review
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              You received this product in your delivered order. Share your honest feedback with fellow shoppers!
            </p>

            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {formSuccess}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Your Rating:
              </label>
              <div>{renderStars(rating, true, rating, setHoverRating, setRating)}</div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Review Comment (optional):
                </label>
                <span style={{ fontSize: '0.75rem', color: comment.length > 900 ? '#dc2626' : '#94a3b8' }}>
                  {comment.length} / 1000
                </span>
              </div>
              <textarea
                rows="4"
                maxLength="1000"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike? How was the build quality, performance, or comfort?"
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ fontWeight: 600 }}
            >
              {submitting ? 'Submitting Review...' : 'Post Verified Review'}
            </button>
          </form>
        ) : (
          <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🔒</span>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                  Reviews restricted to verified buyers
                </span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  {eligibility.reason || 'Only customers who have had this item delivered can leave a review.'}
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
      <div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' }}>
          Customer Feedback ({totalReviews})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
            Loading reviews...
          </div>
        ) : error ? (
          <div style={{ color: '#dc2626', fontSize: '0.9rem', padding: '1rem 0' }}>{error}</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#fafafa', borderRadius: '10px', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
            <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>No reviews yet for this product</p>
            <span style={{ fontSize: '0.85rem' }}>Be the first verified customer to share your thoughts once delivered!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {reviews.map((rev) => {
              const isOwner = user && rev.customerId && (user._id === rev.customerId || user._id === rev.customerId?._id);
              const isAdmin = user?.role === 'admin';
              const isEditing = editingId === rev._id;

              return (
                <div
                  key={rev._id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    transition: 'box-shadow 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-bg-soft)', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                        {rev.customerName ? rev.customerName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                            {rev.customerName || 'Verified Shopper'}
                          </span>
                          {rev.verifiedPurchase && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#ecfdf5', color: '#059669', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid #a7f3d0' }}>
                              ✓ Verified Purchase
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {(isOwner || isAdmin) && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isOwner && !isEditing && (
                          <button
                            onClick={() => handleStartEdit(rev)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReview(rev._id)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div style={{ marginTop: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                          Update Rating:
                        </label>
                        <div>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              onClick={() => setEditRating(s)}
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
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleSaveEdit(rev._id)}
                          disabled={editSubmitting}
                          className="btn btn-primary btn-sm"
                        >
                          {editSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '0.4rem' }}>{renderStars(rev.rating)}</div>
                      {rev.comment && (
                        <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                          {rev.comment}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => fetchReviews(page - 1)}
                  disabled={page <= 1}
                  className="btn btn-secondary btn-sm"
                >
                  ← Previous
                </button>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  Page {page} of {pages}
                </span>
                <button
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
