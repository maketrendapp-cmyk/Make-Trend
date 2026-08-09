// components/NotificationPermissionModal.js
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiArrowRight } from 'react-icons/fi';
import { FaBell } from 'react-icons/fa';

export default function NotificationPermissionModal({ isOpen, onRequestPermission, onDismiss }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onDismiss}
          />

          {/* ── Modal ── */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl overflow-hidden"
          >
            {/* ── Close button ── */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>

            {/* ── Icon ── */}
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-5">
              <FaBell className="w-10 h-10 text-white" />
            </div>

            {/* ── Title ── */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Stay Updated 🔔
            </h2>

            {/* ── Description ── */}
            <p className="text-gray-500 text-center text-sm leading-relaxed mb-6">
              Get notified when someone interacts with your campaigns, shares your content, or sends you a message. <br />
              <span className="text-gray-400 text-xs">You can change this anytime in your browser settings.</span>
            </p>

            {/* ── Benefits ── */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FiCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Campaign activity alerts</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FiCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>New shares and completions</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FiCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Community updates</span>
              </div>
            </div>

            {/* ── Buttons ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onDismiss}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Not Now
              </button>
              <button
                onClick={onRequestPermission}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                Enable Notifications
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}