// pages/follow.js
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthScreen';
import Meta from '../components/Meta';
import {
  FiInstagram,
  FiYoutube,
  FiFacebook,
  FiTwitter,
  FiArrowLeft,
  FiShare2,
  FiHeart,
  FiUsers,
} from 'react-icons/fi';
import { FaTiktok, FaWhatsapp } from 'react-icons/fa';

export default function FollowUs() {
  const { user } = useAuth();
  const cardsRef = useRef([]);

  // ── Intersection Observer for scroll animations ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    cardsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const socialLinks = [
    {
      name: 'YouTube',
      icon: <FiYoutube className="w-6 h-6" />,
      url: 'https://youtube.com/@rockyxsiyu?si=IgX5RQGmHui2Ku9D',
      color: 'bg-[#FF0000]',
      hoverColor: 'hover:bg-red-700',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      textClass: 'text-red-600',
      description: 'Watch tutorials, campaign tips, and updates.',
    },
    {
      name: 'Facebook',
      icon: <FiFacebook className="w-6 h-6" />,
      url: 'https://www.facebook.com/profile.php?id=61589687092061',
      color: 'bg-[#1877F2]',
      hoverColor: 'hover:bg-blue-700',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      textClass: 'text-blue-600',
      description: 'Join our community and stay in the loop.',
    },
    {
      name: 'TikTok',
      icon: <FaTiktok className="w-6 h-6" />,
      url: 'https://www.tiktok.com/@rockyaxisff?_r=1&_t=ZS-985QpCTyRUr',
      color: 'bg-black',
      hoverColor: 'hover:bg-gray-800',
      bgClass: 'bg-gray-50',
      borderClass: 'border-gray-200',
      textClass: 'text-gray-900',
      description: 'Short, engaging content and behind-the-scenes.',
    },
    {
      name: 'WhatsApp Channel',
      icon: <FaWhatsapp className="w-6 h-6" />,
      url: 'https://whatsapp.com/channel/0029Vb6p9OD6buMGD949uX1f',
      color: 'bg-[#25D366]',
      hoverColor: 'hover:bg-green-600',
      bgClass: 'bg-green-50',
      borderClass: 'border-green-200',
      textClass: 'text-green-600',
      description: 'Get instant updates right on your phone.',
    },
  ];

  return (
    <>
      <Meta
        title="Follow Us"
        description="Follow Make Trend on social media to stay updated with the latest campaigns and features."
        image="https://maketrend.vercel.app/og-follow.jpg"
        url="https://maketrend.vercel.app/follow"
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* ── Header ── */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl shadow-lg mb-4">
              <FiUsers className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3">
              Follow Us
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stay connected and never miss an update. Join our growing community
              on your favourite platforms.
            </p>

            {/* ── Stats ── */}
            <div className="flex justify-center gap-8 mt-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <FiHeart className="w-4 h-4 text-red-500" />
                <span>1.2K+ Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <FiShare2 className="w-4 h-4 text-purple-500" />
                <span>500+ Shares</span>
              </div>
            </div>
          </div>

          {/* ── Social Links Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {socialLinks.map((link, index) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                ref={(el) => (cardsRef.current[index] = el)}
                className={`
                  group block bg-white rounded-2xl border border-gray-100 shadow-sm
                  p-6 transition-all duration-300
                  hover:shadow-xl hover:-translate-y-1
                  opacity-0 translate-y-8
                  ${link.bgClass} ${link.borderClass}
                `}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    flex-shrink-0 w-14 h-14 rounded-2xl
                    flex items-center justify-center text-white
                    ${link.color} ${link.hoverColor}
                    transition-transform duration-300 group-hover:scale-110
                  `}>
                    {link.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-bold ${link.textClass}`}>
                      {link.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                      {link.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-400">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Follow → <FiArrowLeft className="w-3 h-3 rotate-180" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* ── Back Button ── */}
          <div className="mt-10 text-center">
            <Link href={user ? '/profile' : '/'}>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition shadow-sm">
                <FiArrowLeft className="w-4 h-4" />
                {user ? 'Back to Profile' : 'Back to Home'}
              </button>
            </Link>
          </div>

          {/* ── Footer Note ── */}
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Follow us to stay updated on new campaigns, features, and rewards.</p>
          </div>
        </div>
      </div>

      {/* ── Tailwind animation keyframes (add to globals.css if needed) ── */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
}