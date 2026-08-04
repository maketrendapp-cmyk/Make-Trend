// pages/edit-profile.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useProfile, useInvalidateQueries } from '../lib/queries';
import { auth } from '../services/firebase';
import Meta from '../components/Meta';
import {
  FiArrowLeft,
  FiCamera,
  FiUser,
  FiMail,
  FiLock,
  FiCheck,
  FiX,
  FiLoader,
  FiPlus,
  FiTrash2,
  FiGlobe,
  FiMapPin,
  FiCalendar,
  FiPhone,
  FiLink,
  FiBookmark,
  FiUsers,
  FiAtSign,
  FiBriefcase,
  FiEdit2,
  FiHeart,
} from 'react-icons/fi';
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaLinkedin,
  FaGithub,
  FaTwitch,
  FaTiktok,
  FaSnapchat,
  FaPinterest,
  FaReddit,
} from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ── Country list ──
const COUNTRIES = [
  'Afghanistan',
  'Albania',
  // ... (full list from previous code, keep it)
  // I'll abbreviate here for brevity – include the full list from the previous version.
];

// ── Gender options ──
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

// ── Relationship status options ──
const RELATIONSHIP_STATUSES = [
  'Single',
  'In a relationship',
  'Married',
  'Divorced',
  'Widowed',
  'Complicated',
  'Prefer not to say',
];

// ── Platform icons ──
const PLATFORM_ICONS = {
  youtube: FaYoutube,
  facebook: FaFacebook,
  twitter: FaTwitter,
  instagram: FaInstagram,
  linkedin: FaLinkedin,
  github: FaGithub,
  twitch: FaTwitch,
  tiktok: FaTiktok,
  snapchat: FaSnapchat,
  pinterest: FaPinterest,
  reddit: FaReddit,
};

const PLATFORM_COLORS = {
  youtube: 'text-red-600',
  facebook: 'text-blue-700',
  twitter: 'text-blue-400',
  instagram: 'text-pink-600',
  linkedin: 'text-blue-600',
  github: 'text-gray-800',
  twitch: 'text-purple-600',
  tiktok: 'text-black',
  snapchat: 'text-yellow-500',
  pinterest: 'text-red-500',
  reddit: 'text-orange-500',
};

// ── Helper: get favicon URL ──
const getFavicon = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}`;
  } catch {
    return null;
  }
};

export default function EditProfile() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
  const { invalidateProfile } = useInvalidateQueries();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Basic Info ──
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // ── About ──
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('');

  // ── Hobbies ──
  const [hobbies, setHobbies] = useState([]);
  const [newHobby, setNewHobby] = useState('');

  // ── Avatar ──
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState('');

  // ── Skills ──
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');

  // ── Social Links ──
  const [socialLinks, setSocialLinks] = useState([]);
  const [newSocial, setNewSocial] = useState({ platform: '', channelName: '', url: '' });

  // ── Websites ──
  const [websites, setWebsites] = useState([]);
  const [newWebsite, setNewWebsite] = useState({ label: '', url: '' });

  // ── Additional Contacts ──
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ type: '', value: '' });

  // ── Availability states ──
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const usernameTimer = useRef(null);
  const emailTimer = useRef(null);

  // ── Populate form from profile ──
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullname || profile.name || '');
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setCurrentAvatar(profile.avatar || profile.profilePic || '');
      setAvatarPreview(profile.avatar || profile.profilePic || '');
      setBio(profile.bio || '');
      setAge(profile.age || '');
      setPhone(profile.phone || '');
      setCountry(profile.country || '');
      setGender(profile.gender || '');
      setRelationshipStatus(profile.relationshipStatus || '');
      setHobbies(profile.hobbies || []);
      setSkills(profile.skills || []);
      setSocialLinks(profile.socialLinks || []);
      setWebsites(profile.websites || []);
      setContacts(profile.additionalContacts || []);
      setLoading(false);
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profile, profileLoading]);

  // ── Redirect if not authenticated ──
  useEffect(() => {
    if (!profileLoading && !user) {
      router.push('/login');
    }
  }, [profileLoading, user, router]);

  // ── Check username availability ──
  useEffect(() => {
    clearTimeout(usernameTimer.current);
    if (!username || username === profile?.username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setIsCheckingUsername(true);
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        setUsernameAvailable(data.success ? data.available : false);
      } catch {
        setUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(usernameTimer.current);
  }, [username, profile]);

  // ── Check email availability ──
  useEffect(() => {
    clearTimeout(emailTimer.current);
    if (!email || email === profile?.email || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }
    setIsCheckingEmail(true);
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        setEmailAvailable(data.success ? !data.exists : false);
      } catch {
        setEmailAvailable(false);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);
    return () => clearTimeout(emailTimer.current);
  }, [email, profile]);

  // ── Avatar upload ──
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.');
      e.target.value = '';
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, WEBP, GIF allowed.');
      e.target.value = '';
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Add/Remove Hobbies ──
  const addHobby = () => {
    const hobby = newHobby.trim();
    if (!hobby) return;
    if (hobbies.includes(hobby)) {
      setError('Hobby already added.');
      return;
    }
    if (hobbies.length >= 50) {
      setError('Maximum 50 hobbies allowed.');
      return;
    }
    setHobbies([...hobbies, hobby]);
    setNewHobby('');
  };

  const removeHobby = (index) => {
    setHobbies(hobbies.filter((_, i) => i !== index));
  };

  // ── Add/Remove Skills ──
  const addSkill = () => {
    const skill = newSkill.trim();
    if (!skill) return;
    if (skills.includes(skill)) {
      setError('Skill already added.');
      return;
    }
    if (skills.length >= 50) {
      setError('Maximum 50 skills allowed.');
      return;
    }
    setSkills([...skills, skill]);
    setNewSkill('');
  };

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  // ── Add/Remove Social Links ──
  const addSocialLink = () => {
    const { platform, channelName, url } = newSocial;
    if (!platform || !channelName || !url) {
      setError('Please fill all social link fields.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Social URL must start with http:// or https://');
      return;
    }
    if (socialLinks.length >= 100) {
      setError('Maximum 100 social links allowed.');
      return;
    }
    setSocialLinks([...socialLinks, { platform, channelName, url: url.trim() }]);
    setNewSocial({ platform: '', channelName: '', url: '' });
  };

  const removeSocialLink = (index) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  // ── Add/Remove Websites ──
  const addWebsite = () => {
    const { label, url } = newWebsite;
    if (!label || !url) {
      setError('Please fill both label and URL.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Website URL must start with http:// or https://');
      return;
    }
    if (websites.length >= 100) {
      setError('Maximum 100 websites allowed.');
      return;
    }
    setWebsites([...websites, { label: label.trim(), url: url.trim() }]);
    setNewWebsite({ label: '', url: '' });
  };

  const removeWebsite = (index) => {
    setWebsites(websites.filter((_, i) => i !== index));
  };

  // ── Add/Remove Additional Contacts ──
  const addContact = () => {
    const { type, value } = newContact;
    if (!type || !value) {
      setError('Please fill both type and value.');
      return;
    }
    if (contacts.length >= 20) {
      setError('Maximum 20 contacts allowed.');
      return;
    }
    setContacts([...contacts, { type: type.trim(), value: value.trim() }]);
    setNewContact({ type: '', value: '' });
  };

  const removeContact = (index) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    // Validations
    if (fullName.length < 2) {
      setError('Full name must be at least 2 characters.');
      setSaving(false);
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      setSaving(false);
      return;
    }
    if (username !== profile?.username && usernameAvailable === false) {
      setError('Username is already taken.');
      setSaving(false);
      return;
    }
    if (email !== profile?.email && emailAvailable === false) {
      setError('Email is already registered.');
      setSaving(false);
      return;
    }
    if (age && (isNaN(age) || parseInt(age) < 1 || parseInt(age) > 150)) {
      setError('Age must be between 1 and 150.');
      setSaving(false);
      return;
    }
    if (phone && !/^[+]?[\d\s()-]{5,20}$/.test(phone)) {
      setError('Phone number is invalid (5-20 characters).');
      setSaving(false);
      return;
    }

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');
      const token = await firebaseUser.getIdToken();

      let avatarUrl = currentAvatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('image', avatarFile);
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          avatarUrl = uploadData.url;
        } else {
          throw new Error(uploadData.error || 'Avatar upload failed');
        }
      }

      const payload = {
        username: username.trim().toLowerCase(),
        fullname: fullName.trim(),
        email: email.trim().toLowerCase(),
        avatar: avatarUrl,
        bio: bio.trim(),
        age: age ? parseInt(age) : null,
        phone: phone.trim(),
        country: country.trim(),
        gender: gender.trim(),
        relationshipStatus: relationshipStatus.trim(),
        hobbies: hobbies,
        skills: skills,
        socialLinks: socialLinks,
        websites: websites,
        additionalContacts: contacts,
      };

      const updateRes = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const updateData = await updateRes.json();

      if (updateData.success) {
        setSuccess('Profile updated successfully! 🎉');
        await invalidateProfile();
        setTimeout(() => router.push('/profile'), 1500);
      } else {
        setError(updateData.error || 'Update failed');
      }
    } catch (err) {
      console.error('Submit error:', err);
      if (err.message === 'Not authenticated') {
        setError('You are not logged in. Please log in again.');
      } else if (err.message.includes('avatar')) {
        setError('Avatar upload failed. Please try a different image.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const showSkeleton = loading || profileLoading || (user && !profile);

  // ── Skeleton Loader ──
  if (showSkeleton) {
    return (
      <>
        <Meta title="Edit Profile | Make Trend" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="w-20 h-9 bg-gray-200 rounded-lg animate-pulse mb-4" />
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8">
              <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse mb-6" />
              <div className="space-y-6">
                <div className="flex flex-col items-center sm:flex-row gap-6">
                  <div className="w-28 h-28 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                  </div>
                ))}
                <div className="flex gap-3 pt-4">
                  <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main Render ──
  return (
    <>
      <Meta title="Edit Profile | Make Trend" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-4 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <FiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8 backdrop-blur-sm transition-all hover:shadow-2xl">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Edit
              </span>
              Profile
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2 animate-fadeIn">
                <FiX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-start gap-2 animate-fadeIn">
                <FiCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ── Avatar ── */}
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden flex items-center justify-center shadow-inner border-4 border-white shadow-md transition-all duration-300 group-hover:shadow-xl">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-2.5 cursor-pointer hover:shadow-lg transition-all duration-200 shadow-md hover:scale-110 hover:shadow-purple-200"
                  >
                    <FiCamera className="w-5 h-5" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={saving}
                    />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm font-medium text-gray-700">
                    Click the camera icon to change your profile picture.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPEG, PNG, WEBP, GIF up to 5MB
                  </p>
                </div>
              </div>

              {/* ── Basic Info ── */}
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiUser className="w-5 h-5 text-purple-600" /> Basic Information
                </h2>
                {/* Full Name, Username, Email – same as before */}
                {/* ... (keep full name, username, email fields) ... */}
              </div>

              {/* ── About You ── */}
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiEdit2 className="w-5 h-5 text-purple-600" /> About You
                </h2>

                {/* Bio, Age, Phone, Country – keep existing */}

                {/* Gender & Relationship Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Gender (optional)
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition bg-white"
                      disabled={saving}
                    >
                      <option value="">Select gender</option>
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Relationship Status (optional)
                    </label>
                    <select
                      value={relationshipStatus}
                      onChange={(e) => setRelationshipStatus(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition bg-white"
                      disabled={saving}
                    >
                      <option value="">Select status</option>
                      {RELATIONSHIP_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Hobbies ── */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiHeart className="w-5 h-5 text-purple-600" /> Hobbies (optional)
                </h2>
                <div className="flex flex-wrap gap-2">
                  {hobbies.map((hobby, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full text-sm font-medium"
                    >
                      {hobby}
                      <button
                        type="button"
                        onClick={() => removeHobby(idx)}
                        className="text-pink-400 hover:text-red-500 transition"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newHobby}
                    onChange={(e) => setNewHobby(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition disabled:opacity-50"
                    disabled={saving}
                    placeholder="e.g. Reading, Guitar, Gaming"
                    onKeyDown={(e) => e.key === 'Enter' && addHobby()}
                  />
                  <button
                    type="button"
                    onClick={addHobby}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
                    disabled={saving}
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400">Press Enter or click + to add hobby.</p>
              </div>

              {/* ── Skills ── (same as before) */}
              {/* ... */}

              {/* ── Social Links ── (same as before) */}
              {/* ... */}

              {/* ── Websites ── (with favicon) */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiGlobe className="w-5 h-5 text-purple-600" /> Websites (optional)
                </h2>
                <div className="space-y-2">
                  {websites.map((site, idx) => {
                    const favicon = getFavicon(site.url);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200"
                      >
                        {favicon ? (
                          <img src={favicon} alt="" className="w-5 h-5 rounded" />
                        ) : (
                          <FiLink className="w-5 h-5 text-purple-600" />
                        )}
                        <span className="font-medium text-sm text-gray-700">
                          {site.label}
                        </span>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm flex-1 truncate"
                        >
                          {site.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeWebsite(idx)}
                          className="text-gray-400 hover:text-red-500 transition"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newWebsite.label}
                    onChange={(e) => setNewWebsite({ ...newWebsite, label: e.target.value })}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                    placeholder="Label (e.g. Portfolio)"
                    disabled={saving}
                  />
                  <input
                    type="url"
                    value={newWebsite.url}
                    onChange={(e) => setNewWebsite({ ...newWebsite, url: e.target.value })}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                    placeholder="https://..."
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={addWebsite}
                    className="px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
                    disabled={saving}
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── Additional Contacts ── (same as before) */}
              {/* ... */}

              {/* ── Action Buttons ── */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-xl font-medium hover:shadow-lg transition-all duration-200 shadow-md hover:shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <FiLoader className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}