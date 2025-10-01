import React, { useState } from 'react';
import { Attachment } from '../../types';
import { X, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttachmentGalleryProps {
  attachments: Attachment[];
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ attachments }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <div className="mt-3">
        <div className="flex justify-end gap-2">
          {attachments.map(attachment => (
            <div 
              key={attachment.AttachmentID}
              className="relative group cursor-pointer w-20 h-20"
              onClick={() => setSelectedImage(attachment.Url)}
            >
              <img 
                src={attachment.Url} 
                alt={attachment.FileName} 
                className="w-full h-full object-cover rounded-lg group-hover:opacity-75 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize size={24} className="text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              <img src={selectedImage} alt="Full screen attachment" className="max-w-full max-h-[90vh] rounded-lg" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-4 -right-4 bg-white dark:bg-neutral-800 rounded-full p-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};