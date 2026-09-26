import React, { useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  errorType?: string;
  technicalDetails?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  title,
  message,
  errorType,
  technicalDetails,
  onClose,
  onRetry,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border-4 border-black shadow-brutal-lg max-w-lg w-full text-white p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-black border-2 border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FF3366] border-2 border-black flex items-center justify-center text-white">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold uppercase text-[#FF3366] tracking-wider">
              {errorType || 'ERROR OCCURRED'}
            </span>
            <h3 className="text-xl font-mono font-black">{title}</h3>
          </div>
        </div>

        {/* Message */}
        <div className="bg-black/60 border-2 border-neutral-800 p-4 font-mono text-sm text-neutral-300 mb-4">
          <p>{message}</p>
        </div>

        {/* Technical Details Accordion */}
        {technicalDetails && (
          <div className="mb-6">
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              className="text-xs font-mono text-[#00FF66] hover:underline flex items-center gap-1 mb-2"
            >
              {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showTechnical ? 'HIDE TECHNICAL DETAILS' : 'VIEW TECHNICAL DETAILS'}
            </button>
            {showTechnical && (
              <pre className="bg-black border border-neutral-800 p-3 text-xs font-mono text-neutral-400 overflow-x-auto max-h-40 whitespace-pre-wrap">
                {technicalDetails}
              </pre>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
          <button onClick={onClose} className="neo-btn neo-btn-dark text-xs">
            DISMISS
          </button>
          {onRetry && (
            <button onClick={onRetry} className="neo-btn neo-btn-green text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              RETRY
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
