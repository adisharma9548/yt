import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, RefreshCw, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { parseSelectionClient } from '../services/utils';

interface SelectionControlsProps {
  totalVideos: number;
  selectedIndices: number[];
  onSelectionChange: (indices: number[]) => void;
}

export const SelectionControls: React.FC<SelectionControlsProps> = ({
  totalVideos,
  selectedIndices,
  onSelectionChange,
}) => {
  const [expression, setExpression] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState(Math.min(10, totalVideos).toString());

  // Sync expression when selectedIndices changes from table clicks
  useEffect(() => {
    if (selectedIndices.length === totalVideos && totalVideos > 0) {
      setExpression('all');
      setError(null);
    }
  }, [selectedIndices, totalVideos]);

  const handleApplyExpression = (val: string) => {
    setExpression(val);
    if (!val.trim()) {
      setError(null);
      return;
    }
    const result = parseSelectionClient(val, totalVideos);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      onSelectionChange(result.indices);
    }
  };

  const handleSelectAll = () => {
    setExpression('all');
    setError(null);
    onSelectionChange(Array.from({ length: totalVideos }, (_, i) => i + 1));
  };

  const handleClearSelection = () => {
    setExpression('');
    setError(null);
    onSelectionChange([]);
  };

  const handleInvertSelection = () => {
    const selectedSet = new Set(selectedIndices);
    const inverted = Array.from({ length: totalVideos }, (_, i) => i + 1).filter(
      (idx) => !selectedSet.has(idx)
    );
    setError(null);
    onSelectionChange(inverted);
  };

  const handleApplyRangeModal = () => {
    const s = parseInt(rangeStart, 10);
    const e = parseInt(rangeEnd, 10);
    if (isNaN(s) || isNaN(e) || s <= 0 || e < s || s > totalVideos) {
      return;
    }
    const expr = `${s}-${Math.min(e, totalVideos)}`;
    handleApplyExpression(expr);
    setShowRangeModal(false);
  };

  return (
    <div className="bg-theme-card border-3 border-black shadow-brutal p-4 mb-6 transition-colors duration-200">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="neo-btn neo-btn-green text-xs"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            SELECT ALL
          </button>
          <button
            type="button"
            onClick={handleClearSelection}
            className="neo-btn neo-btn-white text-xs"
          >
            <Square className="w-3.5 h-3.5" />
            CLEAR
          </button>
          <button
            type="button"
            onClick={handleInvertSelection}
            className="neo-btn neo-btn-yellow text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            INVERT
          </button>
          <button
            type="button"
            onClick={() => setShowRangeModal(true)}
            className="neo-btn neo-btn-dark text-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            RANGE DIALOG
          </button>
        </div>

        {/* Counter Summary */}
        <div className="font-mono text-sm bg-theme-surface border-2 border-black px-3 py-1.5 flex items-center gap-2 self-start md:self-auto text-theme-text">
          <span className="text-theme-muted font-bold">SELECTED:</span>
          <span className="text-black bg-[#00FF66] px-1.5 border border-black font-black text-base">
            {selectedIndices.length}
          </span>
          <span className="text-theme-secondary font-bold">/ {totalVideos} VIDEOS</span>
        </div>
      </div>

      {/* Syntax Notation Input Field */}
      <div className="mt-4 pt-3 border-t border-theme-subtle">
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={expression}
              onChange={(e) => handleApplyExpression(e.target.value)}
              placeholder="e.g. 1-5, 10-15, 20 or all"
              className={`w-full neo-input text-sm py-2 ${
                error ? 'border-[#FF3366]' : 'border-black'
              }`}
            />
          </div>
        </div>

        {/* Live Validation & Helper */}
        <div className="mt-2 flex items-center justify-between text-xs font-mono">
          {error ? (
            <div className="text-[#FF3366] flex items-center gap-1 font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="text-theme-secondary">
              SYNTAX: <span className="font-bold text-theme-text">1, 4, 8-12, 20</span> OR{' '}
              <span className="text-black bg-[#00FF66] px-1 font-bold">all</span>
            </div>
          )}
          <div className="text-theme-muted font-bold">
            {selectedIndices.length > 0
              ? `${selectedIndices.length} item(s) in queue`
              : 'None selected'}
          </div>
        </div>
      </div>

      {/* Range Selection Dialog Modal */}
      {showRangeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-card border-4 border-black shadow-brutal-lg max-w-sm w-full p-6 text-theme-text font-mono">
            <h4 className="text-lg font-black mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#00FF66]" />
              SELECT RANGE
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-theme-muted font-bold mb-1 block">FROM VIDEO #</label>
                <input
                  type="number"
                  min="1"
                  max={totalVideos}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="neo-input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-theme-muted font-bold mb-1 block">TO VIDEO #</label>
                <input
                  type="number"
                  min="1"
                  max={totalVideos}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="neo-input w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRangeModal(false)}
                className="neo-btn neo-btn-dark text-xs"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleApplyRangeModal}
                className="neo-btn neo-btn-green text-xs"
              >
                APPLY RANGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
