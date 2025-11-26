'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationType } from '@/types';

interface ToastProps {
  type: NotificationType;
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

const toastConfig = {
  [NotificationType.SUCCESS]: {
    icon: CheckCircle,
    bgColor: 'bg-green-500',
    borderColor: 'border-green-400',
    textColor: 'text-green-50',
  },
  [NotificationType.ERROR]: {
    icon: AlertCircle,
    bgColor: 'bg-red-500',
    borderColor: 'border-red-400',
    textColor: 'text-red-50',
  },
  [NotificationType.WARNING]: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-50',
  },
  [NotificationType.INFO]: {
    icon: Info,
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-50',
  },
};

export function Toast({ type, title, message, onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          setIsVisible(false);
          setTimeout(onClose, 300);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.3 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
          className={`
            relative overflow-hidden rounded-lg shadow-lg border
            ${config.bgColor} ${config.borderColor} ${config.textColor}
            backdrop-blur-sm bg-opacity-90
          `}
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 h-1 bg-white bg-opacity-30 transition-all duration-100 ease-linear"
               style={{ width: `${progress}%` }} />

          <div className="p-4">
            <div className="flex items-start space-x-3">
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold">{title}</h4>
                <p className="text-sm opacity-90 mt-1">{message}</p>
              </div>

              <button
                onClick={handleClose}
                className="flex-shrink-0 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
