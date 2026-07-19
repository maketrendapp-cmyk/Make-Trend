// pages/contact.js
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthScreen';
import { useProfile } from '../lib/queries';
import Meta from '../components/Meta';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  FiMail,
  FiSend,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiArrowLeft,
  FiMapPin,
  FiClock,
  FiMessageCircle,
  FiUser,
  FiFileText,
  FiPhone,
  FiGlobe,
  FiHeart,
  FiSend as FiSendIcon,
} from 'react-icons/fi';
import { FaWhatsapp, FaTelegram, FaTwitter } from 'react-icons/fa';

export default function Contact() {
 const { user, isAuthenticated } = useAuth();
const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);

  // ── Get username for welcome message ──
  const username = profile?.username || user?.username || user?.email?.split('@')[0] || 'User';
  const displayName = profile?.fullname || user?.fullName || user?.fullname || user?.displayName || 'User';

  const [formData, setFormData] = useState({
    name: user?.fullName || user?.fullname || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [isFocused, setIsFocused] = useState({});

  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.6]);

  // ── Handle input change ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Handle focus ──
  const handleFocus = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: false }));
  };

  // ── Handle form submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ── Validation ──
    if (!formData.name.trim()) {
      setToastMessage('Please enter your name.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setToastMessage('Please enter a valid email address.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }
    if (!formData.subject.trim()) {
      setToastMessage('Please enter a subject.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setToastMessage('Please enter a message (at least 10 characters).');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }

    setIsSubmitting(true);

    // ── Send email using mailto: with pre-filled content ──
    try {
      const subject = encodeURIComponent(formData.subject);
      const body = encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
      );
      
      window.location.href = `mailto:maketrendsupport@gmail.com?subject=${subject}&body=${body}`;
      
      setToastMessage('📧 Opening your email app! Feel free to send us your message.');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      
      // Reset form after successful send
      setFormData({
        name: user?.fullName || user?.fullname || '',
        email: user?.email || '',
        subject: '',
        message: '',
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setToastMessage('Something went wrong. Please try again.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Email handler for direct button ──
  const handleEmailNow = () => {
    window.location.href = 'mailto:maketrendsupport@gmail.com?subject=Make Trend Support Inquiry';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
    hover: {
      y: -6,
      boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
      transition: { duration: 0.3 },
    },
  };

  const floatAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  const contactOptions = [
    {
      icon: <FaWhatsapp className="w-6 h-6" />,
      title: 'WhatsApp',
      value: '+977 986-123-4567',
      link: 'https://wa.me/9779861234567',
      color: 'bg-green-100 text-green-600 hover:bg-green-200',
    },
    {
      icon: <FiMail className="w-6 h-6" />,
      title: 'Email',
      value: 'maketrendsupport@gmail.com',
      link: 'mailto:maketrendsupport@gmail.com',
      color: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
    },
    {
      icon: <FaTelegram className="w-6 h-6" />,
      title: 'Telegram',
      value: '@maketrend_support',
      link: 'https://t.me/maketrend_support',
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    },
  ];

  return (
    <>
      <Meta
        title="Contact Us | Make Trend"
        description="Get in touch with Make Trend support. We're here to help you with any questions or issues."
        image="https://maketrend.vercel.app/og-contact.jpg"
        url="https://maketrend.vercel.app/contact"
      />

      <div ref={sectionRef} className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 overflow-hidden">
        
        {/* ── Hero Section ── */}
        <motion.div 
          style={{ opacity }}
          className="relative overflow-hidden pt-12 pb-8 px-4 sm:px-6"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
          
          <div className="max-w-4xl mx-auto text-center relative">
            <motion.div
              animate={floatAnimation}
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl shadow-2xl mb-6"
            >
              <FiMessageCircle className="w-12 h-12 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-6xl font-extrabold text-gray-900 mb-4"
            >
              Get in{' '}
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Touch
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto"
            >
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </motion.p>

            {/* ── Welcome Message ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 inline-flex items-center gap-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-2xl px-6 py-3 shadow-lg"
            >
              {profileLoading || (user && !profile) ? (
                <>
                  <div className="w-5 h-5 bg-purple-200 rounded-full animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <FiUser className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700 font-medium">
                    Welcome,{' '}
                    <span className="font-bold text-purple-700">
                      @{user ? username : 'User'}
                    </span>
                    {user && (
                      <span className="text-gray-400 text-sm ml-1">
                        ({displayName})
                      </span>
                    )}
                  </span>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* ── Main Content ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto px-4 sm:px-6 pb-12"
        >
          
          {/* ── Contact Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* ── Contact Form ── */}
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 sm:p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <FiMail className="w-6 h-6 text-purple-600" />
                Send a Message
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Fill out the form below and we'll get back to you within 24 hours.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name *
                    </label>
                    <div className={`
                      flex items-center border-2 rounded-xl transition-all duration-200
                      ${isFocused.name ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-gray-200'}
                      ${formData.name ? 'bg-white' : 'bg-gray-50'}
                    `}>
                      <FiUser className={`w-5 h-5 ml-3 transition-colors ${isFocused.name ? 'text-purple-500' : 'text-gray-400'}`} />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onFocus={() => handleFocus('name')}
                        onBlur={() => handleBlur('name')}
                        placeholder="John Doe"
                        className="w-full px-3 py-3 bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address *
                    </label>
                    <div className={`
                      flex items-center border-2 rounded-xl transition-all duration-200
                      ${isFocused.email ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-gray-200'}
                      ${formData.email ? 'bg-white' : 'bg-gray-50'}
                    `}>
                      <FiMail className={`w-5 h-5 ml-3 transition-colors ${isFocused.email ? 'text-purple-500' : 'text-gray-400'}`} />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => handleFocus('email')}
                        onBlur={() => handleBlur('email')}
                        placeholder="you@example.com"
                        className="w-full px-3 py-3 bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subject *
                  </label>
                  <div className={`
                    flex items-center border-2 rounded-xl transition-all duration-200
                    ${isFocused.subject ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-gray-200'}
                    ${formData.subject ? 'bg-white' : 'bg-gray-50'}
                  `}>
                    <FiFileText className={`w-5 h-5 ml-3 transition-colors ${isFocused.subject ? 'text-purple-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      onFocus={() => handleFocus('subject')}
                      onBlur={() => handleBlur('subject')}
                      placeholder="How can we help you?"
                      className="w-full px-3 py-3 bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                      required
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message *
                  </label>
                  <div className={`
                    border-2 rounded-xl transition-all duration-200
                    ${isFocused.message ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-gray-200'}
                    ${formData.message ? 'bg-white' : 'bg-gray-50'}
                  `}>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      onFocus={() => handleFocus('message')}
                      onBlur={() => handleBlur('message')}
                      placeholder="Write your message here..."
                      rows="5"
                      className="w-full px-4 py-3 bg-transparent outline-none text-gray-700 placeholder:text-gray-400 resize-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {formData.message.length || 0} characters (minimum 10)
                  </p>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl
                    hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg
                    ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            {/* ── Sidebar ── */}
            <motion.div
              variants={containerVariants}
              className="space-y-4"
            >
              {/* Contact Options */}
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6"
              >
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiHeart className="w-5 h-5 text-purple-600" />
                  Reach Us
                </h3>
                <div className="space-y-3">
                  {contactOptions.map((option, idx) => (
                    <motion.a
                      key={idx}
                      href={option.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ x: 4 }}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl transition-all
                        ${option.color}
                      `}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500">{option.title}</p>
                        <p className="text-sm font-semibold text-gray-700 truncate">{option.value}</p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              {/* Quick Info */}
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6"
              >
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FiClock className="w-5 h-5 text-purple-600" />
                  Quick Info
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-gray-600">
                    <FiClock className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Response within 24 hours</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600">
                    <FiMapPin className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Kathmandu, Nepal</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600">
                    <FiGlobe className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Available worldwide</span>
                  </div>
                  {/* Email button in quick info */}
                  <div className="pt-2 mt-2 border-t border-gray-200/50">
                    <button
                      onClick={handleEmailNow}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 shadow-md hover:-translate-y-0.5 text-sm"
                    >
                      <FiSendIcon className="w-4 h-4" />
                      Email Now
                    </button>
                    <p className="text-xs text-gray-400 mt-1.5 text-center">
                      or directly at{' '}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200 text-xs">
                        maketrendsupport@gmail.com
                      </code>
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Back Button */}
              <motion.div
                variants={cardVariants}
                className="text-center"
              >
                <Link href={user ? '/profile' : '/'}>
                  <motion.button
                    whileHover={{ x: -4 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-white hover:border-gray-300 transition shadow-lg w-full justify-center"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    {user ? 'Back to Profile' : 'Back to Home'}
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>

          </div>

        </motion.div>
      </div>

      {/* ── Toast / Bubble Notification ── */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 300 
            }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
          >
            <div
              className={`
                flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md
                ${
                  toastType === 'success'
                    ? 'bg-green-50/90 border-green-200 text-green-800'
                    : toastType === 'error'
                    ? 'bg-red-50/90 border-red-200 text-red-800'
                    : 'bg-blue-50/90 border-blue-200 text-blue-800'
                }
              `}
            >
              <div className="flex-shrink-0">
                {toastType === 'success' && <FiCheckCircle className="w-6 h-6 text-green-600" />}
                {toastType === 'error' && <FiAlertCircle className="w-6 h-6 text-red-600" />}
                {toastType === 'info' && <FiInfo className="w-6 h-6 text-blue-600" />}
              </div>
              <p className="text-sm font-medium flex-1">{toastMessage}</p>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowToast(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}