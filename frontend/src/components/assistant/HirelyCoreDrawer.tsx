import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { HirelyCoreView } from './HirelyCoreView';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const HirelyCoreDrawer: React.FC = () => {
  const { isHirelyCoreOpen, setIsHirelyCoreOpen } = useApp();

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHirelyCoreOpen) {
        setIsHirelyCoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHirelyCoreOpen, setIsHirelyCoreOpen]);

  return (
    <AnimatePresence>
      {isHirelyCoreOpen && (
        <>
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsHirelyCoreOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 transition-opacity"
          />

          {/* Slide-out Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[#0F0F0F] border-l border-white/[0.12] z-50 shadow-2xl flex flex-col"
          >
            {/* Drawer Close Button Bar */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsHirelyCoreOpen(false)}
                className="p-2 rounded-xl bg-[#202020] border border-white/[0.12] text-slate-300 hover:text-white hover:border-white/30 transition-all cursor-pointer"
                title="Close Hirely Core"
                aria-label="Close Hirely Core"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Content */}
            <div className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col">
              <HirelyCoreView embedded={true} onClose={() => setIsHirelyCoreOpen(false)} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
