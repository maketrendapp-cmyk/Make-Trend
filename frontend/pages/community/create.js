// pages/community/create.js
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../components/AuthScreen';
import { useCreatePost, useUpdatePost, usePost } from '../../lib/queries';
import { getToken } from '../../lib/api';
import Meta from '../../components/Meta';
import {
  FiArrowLeft,
  FiUpload,
  FiX,
  FiLoader,
  FiCheck,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ── Constants ──
const POST_TYPES = [
  { value: 'general', label: 'General', icon: '📌' },
  { value: 'launch', label: 'Product Launch', icon: '🚀' },
  { value: 'update', label: 'Update', icon: '📢' },
  { value: 'job', label: 'Job / Hiring', icon: '💼' },
  { value: 'question', label: 'Question', icon: '❓' },
  { value: 'event', label: 'Event', icon: '📅' },
  { value: 'promotional', label: 'Promotional', icon: '💎' },
];

const CATEGORIES = [
  { value: 'general', label: '📌 General' },
  { value: 'web-dev', label: '💻 Web Dev' },
  { value: 'design', label: '🎨 Design' },
  { value: 'ai', label: '🤖 AI' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'content', label: '👑 Content' },
  { value: 'startup', label: '🚀 Startup' },
  { value: 'social', label: '📱 Social' },
  { value: 'coding', label: '💻 Coding' },
  { value: 'marketing', label: '📊 Marketing' },
  { value: 'other', label: '📌 Other' },
];

export default function CreatePost() {
  const router = useRouter();
  const { id } = router.query; // if present, we're in edit mode
  const isEdit = !!id;
  const { user, isAuthenticated } = useAuth();

  // ── Queries & Mutations ──
  const { data: existingPost, isLoading: postLoading } = usePost(id, isEdit);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();

  // ── Form state ──
  const [formData, setFormData] = useState({
    type: 'general',
    title: '',
    description: '',
    category: 'general',
    imageUrl: '',
    videoUrl: '',
    ctaText: '',
    ctaUrl: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

  // ── Populate form when editing ──
  useEffect(() => {
    if (existingPost) {
      setFormData({
        type: existingPost.type || 'general',
        title: existingPost.title || '',
        description: existingPost.description || '',
        category: existingPost.category || 'general',
        imageUrl: existingPost.imageUrl || '',
        videoUrl: existingPost.videoUrl || '',
        ctaText: existingPost.ctaText || '',
        ctaUrl: existingPost.ctaUrl || '',
      });
      if (existingPost.imageUrl) setImagePreview(existingPost.imageUrl);
    }
  }, [existingPost]);

  // ── Auth guard ──
  useEffect(() => {
    if (!isAuthenticated && !user) {
      router.push('/login?redirect=/community/create');
    }
  }, [isAuthenticated, user, router]);

  // ── Handlers ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const selectType = (value) => {
    setFormData((prev) => ({ ...prev, type: value }));
    if (errors.type) setErrors((prev) => ({ ...prev, type: '' }));
  };

  const selectCategory = (value) => {
    setFormData((prev) => ({ ...prev, category: value }));
    if (errors.category) setErrors((prev) => ({ ...prev, category: '' }));
  };

  // ── Image upload ──
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, WEBP, and GIF are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload?folder=community`, true);
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
        toast.success('Image uploaded!');
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Validation ──
  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.trim().length < 1 || formData.title.trim().length > 100) {
      newErrors.title = 'Title must be 1-100 characters';
    }
    if (!formData.description.trim() || formData.description.trim().length < 1 || formData.description.trim().length > 500) {
      newErrors.description = 'Description must be 1-500 characters';
    }
    if (formData.videoUrl && !/^https?:\/\/[^\s]+$/.test(formData.videoUrl.trim())) {
      newErrors.videoUrl = 'Please enter a valid URL (starting with http:// or https://)';
    }
    if (formData.ctaUrl && !/^https?:\/\/[^\s]+$/.test(formData.ctaUrl.trim())) {
      newErrors.ctaUrl = 'Please enter a valid URL (starting with http:// or https://)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const payload = {
      type: formData.type,
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      imageUrl: formData.imageUrl || '',
      videoUrl: formData.videoUrl ? formData.videoUrl.trim() : '',
      ctaText: formData.ctaText ? formData.ctaText.trim() : '',
      ctaUrl: formData.ctaUrl ? formData.ctaUrl.trim() : '',
    };

    try {
      if (isEdit) {
        await updatePost.mutateAsync({ id, ...payload });
        router.push(`/community/post/${id}`);
      } else {
        await createPost.mutateAsync(payload);
        router.push('/community/feed');
      }
    } catch (err) {
      // error already handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state for edit ──
  if (isEdit && postLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-32 bg-slate-200 rounded-lg mb-6" />
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-4">
          <div className="h-10 bg-slate-200 rounded-xl" />
          <div className="h-10 bg-slate-200 rounded-xl" />
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-10 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── If not authenticated, show nothing (will redirect) ──
  if (!isAuthenticated && !user) return null;

  return (
    <>
      <Meta title={isEdit ? 'Edit Post – Make Trend Community' : 'Create Post – Make Trend Community'} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href={isEdit ? `/community/post/${id}` : '/community/feed'}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 transition mb-6"
        >
          <FiArrowLeft className="w-4 h-4" /> {isEdit ? 'Back to Post' : 'Back to Feed'}
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isEdit ? 'Edit Post' : 'Create Post'}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            {isEdit ? 'Update your post' : 'Share something with the community'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Post Type ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Post Type</label>
              <div className="flex flex-wrap gap-2">
                {POST_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => selectType(type.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      formData.type === type.value
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="mr-1.5">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
              {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
            </div>

            {/* ── Title ── */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="What's the headline?"
                className={`w-full border ${errors.title ? 'border-red-300' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                maxLength={100}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              <p className="mt-1 text-xs text-slate-400">{formData.title.length}/100 characters</p>
            </div>

            {/* ── Description ── */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="What's on your mind? Share details about your post."
                className={`w-full border ${errors.description ? 'border-red-300' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition resize-none`}
                maxLength={500}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              <p className="mt-1 text-xs text-slate-400">{formData.description.length}/500 characters</p>
            </div>

            {/* ── Category ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => selectCategory(cat.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      formData.category === cat.value
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
            </div>

            {/* ── Image Upload ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Image (optional)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl text-sm text-slate-600 hover:text-purple-600 transition flex items-center gap-2 disabled:opacity-50"
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
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              {imagePreview && (
                <div className="mt-3 relative w-full aspect-[16/9] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-600 rounded-full p-1.5 shadow-md transition"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-slate-400">JPEG, PNG, WEBP, GIF up to 5MB</p>
            </div>

            {/* ── Video URL ── */}
            <div>
              <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-700 mb-1">
                Video URL (optional)
              </label>
              <input
                id="videoUrl"
                name="videoUrl"
                type="url"
                value={formData.videoUrl}
                onChange={handleChange}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`w-full border ${errors.videoUrl ? 'border-red-300' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
              />
              {errors.videoUrl && <p className="mt-1 text-sm text-red-600">{errors.videoUrl}</p>}
              <p className="mt-1 text-xs text-slate-400">YouTube, Vimeo, Loom, or direct video URL</p>
            </div>

            {/* ── Call to Action ── */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Call to Action (optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ctaText" className="block text-xs font-medium text-slate-600 mb-1">
                    Button Text
                  </label>
                  <input
                    id="ctaText"
                    name="ctaText"
                    type="text"
                    value={formData.ctaText}
                    onChange={handleChange}
                    placeholder="e.g. Visit Site"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label htmlFor="ctaUrl" className="block text-xs font-medium text-slate-600 mb-1">
                    Button URL
                  </label>
                  <input
                    id="ctaUrl"
                    name="ctaUrl"
                    type="url"
                    value={formData.ctaUrl}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className={`w-full border ${errors.ctaUrl ? 'border-red-300' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition`}
                  />
                  {errors.ctaUrl && <p className="mt-1 text-xs text-red-600">{errors.ctaUrl}</p>}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">Both fields must be filled to show a CTA button.</p>
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
                  {isEdit ? 'Updating...' : 'Publishing...'}
                </>
              ) : (
                <>
                  <FiCheck className="w-5 h-5" />
                  {isEdit ? 'Update Post' : 'Publish Post'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}