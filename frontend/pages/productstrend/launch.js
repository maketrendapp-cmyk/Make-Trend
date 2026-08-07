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
  FiList,
  FiDollarSign,
  FiUsers,
  FiGithub,
  FiTwitter,
  FiCpu,
  FiCalendar,
  FiVideo,
  FiChevronDown,
  FiChevronUp,
  FiLink2,
  FiCode,
  FiBriefcase,
  FiShare2,
  FiAtSign,
  FiShoppingBag,
} from 'react-icons/fi';
import { FaRocket, FaTwitter as FaTwitterBrand } from 'react-icons/fa';

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

const PRICING_OPTIONS = ['Free', 'Freemium', 'Paid', 'Enterprise', 'Contact for Pricing'];
const STATUS_OPTIONS = ['Live', 'Beta', 'Coming Soon', 'In Development'];

const SOCIAL_PLATFORMS = [
  { value: 'twitter', label: 'Twitter' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'github', label: 'GitHub' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'other', label: 'Other' },
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

  // ── Form state ──
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    url: '',
    logo: '',
    thumbnail: '',
    category: '',
    websiteTitle: '',
    websiteDescription: '',
    websiteImage: '',
    features: [],
    pricing: 'Free',
    productStatus: 'Live',
    targetAudience: '',
    demoUrl: '',
    twitter: '',
    techStack: [],
    releaseDate: '',
    socialLinks: [],
    referralCode: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaFetched, setMetaFetched] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logoPreview, setLogoPreview] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newTech, setNewTech] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newSocial, setNewSocial] = useState({ platform: '', url: '' });

  const logoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name: existingProduct.name || '',
        tagline: existingProduct.tagline || '',
        description: existingProduct.description || '',
        url: existingProduct.url || '',
        logo: existingProduct.logo || '',
        thumbnail: existingProduct.thumbnail || '',
        category: existingProduct.category || '',
        websiteTitle: existingProduct.websiteTitle || '',
        websiteDescription: existingProduct.websiteDescription || '',
        websiteImage: existingProduct.websiteImage || '',
        features: existingProduct.features || [],
        pricing: existingProduct.pricing || 'Free',
        productStatus: existingProduct.productStatus || 'Live',
        targetAudience: existingProduct.targetAudience || '',
        demoUrl: existingProduct.demoUrl || '',
        twitter: existingProduct.twitter || '',
        techStack: existingProduct.techStack || [],
        releaseDate: existingProduct.releaseDate || '',
        socialLinks: existingProduct.socialLinks || [],
        referralCode: existingProduct.referralCode || '',
      });
      if (existingProduct.logo) setLogoPreview(existingProduct.logo);
      if (existingProduct.thumbnail) setThumbnailPreview(existingProduct.thumbnail);
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
    if (formData.logo && !isValidUrl(formData.logo.trim())) {
      newErrors.logo = 'Please enter a valid HTTPS URL';
    }
    if (formData.thumbnail && !isValidUrl(formData.thumbnail.trim())) {
      newErrors.thumbnail = 'Please enter a valid HTTPS URL';
    }
    if (formData.demoUrl && !isValidUrl(formData.demoUrl.trim())) {
      newErrors.demoUrl = 'Please enter a valid demo URL';
    }
    if (formData.twitter && !formData.twitter.startsWith('@') && formData.twitter.trim()) {
      newErrors.twitter = 'Twitter handle should start with @';
    }
    formData.socialLinks.forEach((link, idx) => {
      if (link.url && !isValidUrl(link.url.trim())) {
        newErrors[`social_${idx}`] = 'Invalid URL';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Meta fetch ──
  const fetchWebsiteMeta = async () => {
    const url = formData.url.trim();
    if (!url || !isValidUrl(url)) {
      setErrors({ url: 'Please enter a valid URL first' });
      return;
    }

    setIsFetchingMeta(true);
    setMetaFetched(false);
    setErrors((prev) => ({ ...prev, meta: '' }));

    try {
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      ];

      let html = null;
      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
          if (response.ok) {
            html = await response.text();
            break;
          }
        } catch {
          continue;
        }
      }

      if (!html) throw new Error('Could not fetch website');

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

      if (image && image.startsWith('/')) {
        try {
          const parsedUrl = new URL(url);
          image = `${parsedUrl.origin}${image}`;
        } catch {
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
      setErrors({ meta: 'Could not fetch website info. Please enter the details manually.' });
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const applyMetaData = () => {
    const { websiteTitle, websiteDescription, websiteImage } = formData;
    const updates = {};
    if (websiteTitle && !formData.name) updates.name = websiteTitle;
    if (websiteDescription && !formData.description) updates.description = websiteDescription;
    if (websiteImage && !formData.logo) {
      updates.logo = websiteImage;
      setLogoPreview(websiteImage);
    }
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
    setMetaFetched(false);
  };

  // ── Image upload ──
  const uploadImage = async (file, folder = 'productstrend') => {
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload?folder=${folder}`, true);

      getToken().then(token => {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
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
      }).catch(reject);
    });
  };

  const handleImageUpload = async (e, type) => {
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
      const result = await uploadImage(file, 'productstrend');
      if (result.success && result.url) {
        if (type === 'logo') {
          setFormData(prev => ({ ...prev, logo: result.url }));
          setLogoPreview(result.url);
        } else {
          setFormData(prev => ({ ...prev, thumbnail: result.url }));
          setThumbnailPreview(result.url);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrors({ imageUpload: err.message || 'Failed to upload image' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (type === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
      if (type === 'thumbnail' && thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const removeImage = (type) => {
    if (type === 'logo') {
      setFormData(prev => ({ ...prev, logo: '' }));
      setLogoPreview('');
    } else {
      setFormData(prev => ({ ...prev, thumbnail: '' }));
      setThumbnailPreview('');
    }
  };

  // ── Features ──
  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  // ── Tech Stack ──
  const addTech = () => {
    if (newTech.trim()) {
      setFormData((prev) => ({
        ...prev,
        techStack: [...prev.techStack, newTech.trim()],
      }));
      setNewTech('');
    }
  };

  const removeTech = (index) => {
    setFormData((prev) => ({
      ...prev,
      techStack: prev.techStack.filter((_, i) => i !== index),
    }));
  };

  // ── Social Links ──
  const addSocial = () => {
    if (newSocial.platform && newSocial.url.trim()) {
      setFormData((prev) => ({
        ...prev,
        socialLinks: [...prev.socialLinks, { platform: newSocial.platform, url: newSocial.url.trim() }],
      }));
      setNewSocial({ platform: '', url: '' });
    }
  };

  const removeSocial = (index) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  };

  // ── Submit ──
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
        logo: formData.logo.trim(),
        thumbnail: formData.thumbnail.trim(),
        category: formData.category || 'Other',
        websiteTitle: formData.websiteTitle?.trim() || '',
        websiteDescription: formData.websiteDescription?.trim() || '',
        websiteImage: formData.websiteImage?.trim() || '',
        features: formData.features || [],
        pricing: formData.pricing || 'Free',
        productStatus: formData.productStatus || 'Live',
        targetAudience: formData.targetAudience?.trim() || '',
        demoUrl: formData.demoUrl?.trim() || '',
        twitter: formData.twitter?.trim() || '',
        techStack: formData.techStack || [],
        releaseDate: formData.releaseDate || '',
        socialLinks: formData.socialLinks || [],
        referralCode: formData.referralCode?.trim() || '',
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
      <div className="max-w-3xl mx-auto px-4 py-8">
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Basic Info ── */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <FiInfo className="text-purple-500" /> Basic Information
              </h3>

              <div className="mb-4">
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tagline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleChange}
                  placeholder="A short, catchy description (max 200 chars)"
                  className={`w-full border ${errors.tagline ? 'border-red-300' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                  maxLength="200"
                />
                {errors.tagline && <p className="mt-1 text-sm text-red-600">{errors.tagline}</p>}
                <p className="mt-1 text-xs text-slate-400">{formData.tagline.length}/200 characters</p>
              </div>

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
            </div>

            {/* ── Media ── */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <FiImage className="text-purple-500" /> Media & Links
              </h3>

              {/* URL and Meta Fetch */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product Website URL
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
                {metaFetched && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
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
              </div>

              {/* Logo */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Logo <span className="text-slate-400 text-xs">(square, shown as circle in feed)</span>
                </label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
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
                            Upload Logo
                          </>
                        )}
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleImageUpload(e, 'logo')}
                        className="hidden"
                      />
                    </div>
                    <div className="relative">
                      <FiImage className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="logo"
                        value={formData.logo}
                        onChange={handleChange}
                        placeholder="https://example.com/logo.png"
                        className={`w-full border ${errors.logo ? 'border-red-300' : 'border-slate-200'} rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                      />
                    </div>
                    {errors.logo && <p className="mt-1 text-sm text-red-600">{errors.logo}</p>}
                  </div>
                  {logoPreview && (
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-200 bg-white shadow-sm">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage('logo')}
                        className="mt-1 text-xs text-red-500 hover:text-red-700 transition"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnail */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Thumbnail / Hero Image <span className="text-slate-400 text-xs">(16:9, shown in detail page)</span>
                </label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
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
                            Upload Thumbnail
                          </>
                        )}
                      </button>
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleImageUpload(e, 'thumbnail')}
                        className="hidden"
                      />
                    </div>
                    <div className="relative">
                      <FiImage className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="thumbnail"
                        value={formData.thumbnail}
                        onChange={handleChange}
                        placeholder="https://example.com/thumbnail.png"
                        className={`w-full border ${errors.thumbnail ? 'border-red-300' : 'border-slate-200'} rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                      />
                    </div>
                    {errors.thumbnail && <p className="mt-1 text-sm text-red-600">{errors.thumbnail}</p>}
                  </div>
                  {thumbnailPreview && (
                    <div className="flex-shrink-0">
                      <div className="w-32 h-18 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm aspect-video">
                        <Image
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          width={128}
                          height={72}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage('thumbnail')}
                        className="mt-1 text-xs text-red-500 hover:text-red-700 transition block text-center"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Demo URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Demo / Video URL <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <FiVideo className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    name="demoUrl"
                    value={formData.demoUrl}
                    onChange={handleChange}
                    placeholder="https://demo.your-product.com"
                    className={`w-full border ${errors.demoUrl ? 'border-red-300' : 'border-slate-200'} rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                  />
                </div>
                {errors.demoUrl && <p className="mt-1 text-sm text-red-600">{errors.demoUrl}</p>}
              </div>
            </div>

            {/* ── Product Details ── */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <FiTag className="text-purple-500" /> Product Details
              </h3>

              <div className="mb-4">
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Audience <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleChange}
                    placeholder="e.g., Product Managers, Developers, Marketers"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                  />
                </div>
              </div>
            </div>

            {/* ── Advanced Options (collapsible) ── */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FiList className="text-purple-500" /> Advanced Options
                </span>
                {showAdvanced ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
              </button>
              {showAdvanced && (
                <div className="p-4 space-y-4 border-t border-slate-100">
                  {/* Pricing */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Pricing <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        name="pricing"
                        value={formData.pricing}
                        onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition appearance-none bg-white"
                      >
                        {PRICING_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Product Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Product Status <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        name="productStatus"
                        value={formData.productStatus}
                        onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition appearance-none bg-white"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Twitter Handle */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Twitter Handle <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <FiTwitter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleChange}
                        placeholder="@yourhandle"
                        className={`w-full border ${errors.twitter ? 'border-red-300' : 'border-slate-200'} rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                      />
                    </div>
                    {errors.twitter && <p className="mt-1 text-sm text-red-600">{errors.twitter}</p>}
                  </div>

                  {/* Release Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Release Date <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        name="releaseDate"
                        value={formData.releaseDate}
                        onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                      />
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Key Features <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Add a feature..."
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      />
                      <button
                        type="button"
                        onClick={addFeature}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.features.map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs border border-purple-200"
                        >
                          {feature}
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="hover:text-red-500 transition"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tech Stack */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tech Stack <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTech}
                        onChange={(e) => setNewTech(e.target.value)}
                        placeholder="e.g., React, Node.js, Python"
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                      />
                      <button
                        type="button"
                        onClick={addTech}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.techStack.map((tech, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs border border-indigo-200"
                        >
                          <FiCpu className="w-3 h-3" />
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeTech(index)}
                            className="hover:text-red-500 transition"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Social Links */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Social Links <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <select
                        value={newSocial.platform}
                        onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}
                        className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition bg-white"
                      >
                        <option value="">Platform</option>
                        {SOCIAL_PLATFORMS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <input
                        type="url"
                        value={newSocial.url}
                        onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
                        placeholder="https://..."
                        className="flex-1 min-w-[150px] border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                      />
                      <button
                        type="button"
                        onClick={addSocial}
                        disabled={!newSocial.platform || !newSocial.url}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm disabled:opacity-50"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.socialLinks.map((link, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs border border-blue-200"
                        >
                          <FiLink2 className="w-3 h-3" />
                          {link.platform}: <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">{link.url}</a>
                          <button
                            type="button"
                            onClick={() => removeSocial(index)}
                            className="hover:text-red-500 transition"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Referral Code */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Referral / Affiliate Code <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <FiAtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="referralCode"
                        value={formData.referralCode}
                        onChange={handleChange}
                        placeholder="e.g., MAKETREND2024"
                        className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                      />
                    </div>
                  </div>
                </div>
              )}
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
    </>
  );
}