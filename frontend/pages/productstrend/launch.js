// pages/productstrend/launch.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { getToken } from '../../lib/api';
import {
  useLaunchProduct,
  useProductDetail,
  useInvalidateQueries,
} from '../../lib/queries';
import {
  FiArrowLeft,
  FiLoader,
  FiImage,
  FiLink,
  FiTag,
  FiFileText,
  FiUpload,
  FiGlobe,
  FiCheck,
  FiX,
  FiInfo,
  FiPlus,
  FiMinus,
  FiRefreshCw,
} from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'Tech', label: '💻 Tech' },
  { value: 'Design', label: '🎨 Design' },
  { value: 'AI', label: '🤖 AI' },
  { value: 'Productivity', label: '⚡ Productivity' },
  { value: 'Education', label: '📚 Education' },
  { value: 'Health', label: '❤️ Health' },
  { value: 'Fitness', label: '💪 Fitness' },
  { value: 'Gaming', label: '🎮 Gaming' },
  { value: 'Social', label: '👥 Social' },
  { value: 'Marketing', label: '📊 Marketing' },
  { value: 'SaaS', label: '☁️ SaaS' },
  { value: 'Developer Tools', label: '🛠️ Developer Tools' },
  { value: 'Other', label: '📌 Other' },
];

export default function LaunchProduct() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const launchMutation = useLaunchProduct();
  const { invalidateProductFeed, invalidateMyProducts, invalidateProductDetail } =
    useInvalidateQueries();

  const isEditing = !!id;

  const { data: existingProduct, isLoading: productLoading } = useProductDetail(
    id,
    isEditing && !!id
  );

  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    url: '',
    imageUrl: '',
    category: '',
    websiteTitle: '',
    websiteDescription: '',
    websiteImage: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaFetched, setMetaFetched] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name: existingProduct.name || '',
        tagline: existingProduct.tagline || '',
        description: existingProduct.description || '',
        url: existingProduct.url || '',
        imageUrl: existingProduct.imageUrl || '',
        category: existingProduct.category || '',
        websiteTitle: existingProduct.websiteTitle || '',
        websiteDescription: existingProduct.websiteDescription || '',
        websiteImage: existingProduct.websiteImage || '',
      });
      if (existingProduct.imageUrl) {
        setImagePreview(existingProduct.imageUrl);
      }
    }
  }, [existingProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
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
      return (
        parsed.protocol === 'https:' &&
        /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico)(\?.*)?$/i.test(parsed.pathname)
      );
    } catch {
      return false;
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

  // ── FRONTEND META FETCH using CORS proxy ──
  const fetchWebsiteMeta = async () => {
    const url = formData.url.trim();
    if (!url || !isValidUrl(url)) {
      setErrors({ url: 'Please enter a valid URL first' });
      return;
    }

    setIsFetchingMeta(true);
    setMetaFetched(false);

    try {
      // Use a free CORS proxy to fetch the HTML
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Failed to fetch website');

      const html = await response.text();

      // Extract meta data with regex
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      const descriptionMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';

      const imageMatch =
        html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
      let image = imageMatch ? imageMatch[1].trim() : '';

      // Convert relative image URL to absolute
      if (image && image.startsWith('/')) {
        try {
          const parsedUrl = new URL(url);
          image = `${parsedUrl.origin}${image}`;
        } catch (e) {
          // ignore
        }
      }

      setFormData((prev) => ({
        ...prev,
        websiteTitle: title || '',
        websiteDescription: description || '',
        websiteImage: image || '',
      }));
      setMetaFetched(true);
    } catch (err) {
      console.error('Meta fetch error:', err);
      setErrors({ meta: err.message || 'Failed to fetch website info' });
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const applyMetaData = () => {
    const { websiteTitle, websiteDescription, websiteImage } = formData;
    const updates = {};
    if (websiteTitle && !formData.name) updates.name = websiteTitle;
    if (websiteDescription && !formData.description) updates.description = websiteDescription;
    if (websiteImage && !formData.imageUrl) {
      updates.imageUrl = websiteImage;
      setImagePreview(websiteImage);
    }
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
    setMetaFetched(false);
  };

  // ── Image upload (unchanged) ──
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ imageUpload: 'Only JPEG, PNG, WEBP, and GIF are allowed' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ imageUpload: 'Image must be smaller than 5MB' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrors((prev) => ({ ...prev, imageUpload: '' }));

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload?folder=productstrend`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid response'));
            }
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formDataUpload);
      });

      if (response.success && response.url) {
        setFormData((prev) => ({ ...prev, imageUrl: response.url }));
        setImagePreview(response.url);
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrors({ imageUpload: err.message || 'Failed to upload image' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      const payload = {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        imageUrl: formData.imageUrl.trim(),
        category: formData.category || 'Other',
        websiteTitle: formData.websiteTitle?.trim() || '',
        websiteDescription: formData.websiteDescription?.trim() || '',
        websiteImage: formData.websiteImage?.trim() || '',
      };

      let result;
      if (isEditing) {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/productstrend/products/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Update failed');
        result = data;
        await invalidateProductDetail(id);
      } else {
        result = await launchMutation.mutateAsync(payload);
      }

      await invalidateProductFeed();
      await invalidateMyProducts();

      if (isEditing) {
        router.push(`/productstrend/${id}`);
      } else {
        router.push('/productstrend/my-products');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setErrors({ submit: err.message || 'Failed to save product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (productLoading && isEditing) {
    return (
      <>
        <Meta title="Loading..." />
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <FiLoader className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-slate-500">Loading product...</p>
        </div>
      </>
    );
  }

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
      <Meta
        title={`${isEditing ? 'Edit' : 'Launch'} a Product – ProductTrend`}
        description={isEditing ? 'Update your product details' : 'Share your creation with the community'}
      />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href={isEditing ? `/productstrend/${id}` : '/productstrend'}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 transition mb-6"
        >
          <FiArrowLeft className="w-4 h-4" />
          {isEditing ? 'Back to Product' : 'Back to ProductTrend'}
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <FaRocket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isEditing ? 'Edit Product' : 'Launch a Product'}
              </h1>
              <p className="text-sm text-slate-500">
                {isEditing ? 'Update your product details' : 'Share your creation with the community'}
              </p>
            </div>
          </div>

          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Product Name ── */}
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

            {/* ── Tagline ── */}
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

            {/* ── Description ── */}
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

            {/* ── Product URL ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product URL <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
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
                <button
                  type="button"
                  onClick={fetchWebsiteMeta}
                  disabled={isFetchingMeta || !formData.url}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {isFetchingMeta ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiGlobe className="w-4 h-4" />
                  )}
                  Fetch Info
                </button>
              </div>
              {errors.url && <p className="mt-1 text-sm text-red-600">{errors.url}</p>}
            </div>

            {/* ── Meta data preview ── */}
            {metaFetched && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-slideDown">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <FiCheck className="w-4 h-4" /> Website info fetched
                  </p>
                  <button
                    type="button"
                    onClick={applyMetaData}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition"
                  >
                    Apply to form →
                  </button>
                </div>
                <div className="space-y-1 text-xs text-emerald-600">
                  {formData.websiteTitle && <p>Title: {formData.websiteTitle}</p>}
                  {formData.websiteDescription && (
                    <p className="line-clamp-2">Description: {formData.websiteDescription}</p>
                  )}
                  {formData.websiteImage && (
                    <p className="truncate">Image: {formData.websiteImage}</p>
                  )}
                </div>
              </div>
            )}

            {errors.meta && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                {errors.meta}
              </div>
            )}

            {/* ── Image Upload ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Image <span className="text-slate-400 text-xs">(optional)</span>
              </label>

              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl text-sm text-slate-600 hover:text-purple-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Uploading... {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <FiUpload className="w-4 h-4" />
                        Upload Image
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>

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
                {errors.imageUpload && (
                  <p className="text-sm text-red-600">{errors.imageUpload}</p>
                )}
                {errors.imageUrl && <p className="text-sm text-red-600">{errors.imageUrl}</p>}
              </div>

              {imagePreview && (
                <div className="mt-3 relative w-40 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                </div>
              )}
            </div>

            {/* ── Category ── */}
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
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  {isEditing ? 'Updating...' : 'Launching...'}
                </>
              ) : (
                <>
                  <FaRocket className="w-5 h-5" />
                  {isEditing ? 'Update Product' : 'Launch Product'}
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              {isEditing
                ? 'Your changes will be visible immediately.'
                : 'By launching, you agree to our community guidelines. Your product will be visible immediately.'}
            </p>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </>
  );
}