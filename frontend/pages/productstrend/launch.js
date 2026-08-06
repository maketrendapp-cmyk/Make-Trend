// pages/productstrend/launch.js
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { useLaunchProduct, useInvalidateQueries } from '../../lib/queries';
import {
  FiArrowLeft,
  FiCheck,
  FiLoader,
  FiX,
  FiImage,
  FiLink,
  FiTag,
  FiFileText,
} from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';

const CATEGORIES = [
  'Tech',
  'Design',
  'AI',
  'Productivity',
  'Education',
  'Health',
  'Fitness',
  'Gaming',
  'Social',
  'Marketing',
  'SaaS',
  'Developer Tools',
  'Other',
];

export default function LaunchProduct() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const launchMutation = useLaunchProduct();
  const { invalidateProductFeed } = useInvalidateQueries();

  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    url: '',
    imageUrl: '',
    category: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim() || formData.name.trim().length < 1 || formData.name.trim().length > 100) {
      newErrors.name = 'Name must be 1-100 characters';
    }
    if (!formData.tagline.trim() || formData.tagline.trim().length < 1 || formData.tagline.trim().length > 200) {
      newErrors.tagline = 'Tagline must be 1-200 characters';
    }
    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }
    if (formData.url && !isValidUrl(formData.url.trim())) {
      newErrors.url = 'Please enter a valid URL (e.g., https://example.com)';
    }
    if (formData.imageUrl && !isValidImageUrl(formData.imageUrl.trim())) {
      newErrors.imageUrl = 'Please enter a valid image URL (HTTPS)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isValidImageUrl = (url) => {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' &&
        /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico)(\?.*)?$/i.test(parsed.pathname);
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        imageUrl: formData.imageUrl.trim(),
        category: formData.category || 'Other',
      };
      await launchMutation.mutateAsync(payload);
      await invalidateProductFeed();
      router.push('/productstrend/my-products');
    } catch (err) {
      // Error is handled by the mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Launch a Product – ProductTrend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
              <FaRocket className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Sign In Required</h2>
            <p className="text-slate-500 text-sm mb-6">Please sign in to launch a product.</p>
            <button
              onClick={() => router.push('/login?redirect=/productstrend/launch')}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title="Launch a Product – ProductTrend" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/productstrend" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 transition mb-6">
          <FiArrowLeft className="w-4 h-4" /> Back to ProductTrend
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <FaRocket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Launch a Product</h1>
              <p className="text-sm text-slate-500">Share your creation with the community</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Make Trend"
                className={`w-full border ${errors.name ? 'border-red-300' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                maxLength="100"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              <p className="mt-1 text-xs text-slate-400">{formData.name.length}/100 characters</p>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tagline <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="A short, catchy description"
                className={`w-full border ${errors.tagline ? 'border-red-300' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                maxLength="200"
              />
              {errors.tagline && <p className="mt-1 text-sm text-red-600">{errors.tagline}</p>}
              <p className="mt-1 text-xs text-slate-400">{formData.tagline.length}/200 characters</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                placeholder="Describe your product in detail..."
                className={`w-full border ${errors.description ? 'border-red-300' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition resize-y`}
                maxLength="2000"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              <p className="mt-1 text-xs text-slate-400">{formData.description.length}/2000 characters</p>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product URL <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <div className="relative">
                <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://your-product.com"
                  className={`w-full border ${errors.url ? 'border-red-300' : 'border-slate-200'} rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                />
              </div>
              {errors.url && <p className="mt-1 text-sm text-red-600">{errors.url}</p>}
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Image URL <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <div className="relative">
                <FiImage className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/image.png"
                  className={`w-full border ${errors.imageUrl ? 'border-red-300' : 'border-slate-200'} rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                />
              </div>
              {errors.imageUrl && <p className="mt-1 text-sm text-red-600">{errors.imageUrl}</p>}
              {formData.imageUrl && !errors.imageUrl && (
                <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <div className="relative">
                <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition appearance-none bg-white"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <FaRocket className="w-5 h-5" />
                  Launch Product
                </>
              )}
            </button>

            {/* Info note */}
            <p className="text-center text-xs text-slate-400">
              By launching, you agree to our community guidelines. Your product will be visible immediately.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}