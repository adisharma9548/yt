import React, { useState } from 'react';
import { ArrowLeft, Play, Folder, FolderOpen, FileText, Settings2, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { QualitySelector } from '../components/QualitySelector';
import { FileEstimate } from '../components/FileEstimate';
import { generateFilenamePreview } from '../services/utils';
import { api } from '../services/api';

interface QualitySelectPageProps {
  selectedQuality: string;
  onSelectQuality: (quality: string) => void;
  selectedCount: number;
  totalEstimatedMb: number;
  downloadFolder: string;
  onFolderChange: (folder: string) => void;
  freeSpaceMb?: number;
  onFreeSpaceChange: (freeMb: number) => void;
  namingMode: 'index_title' | 'title_only' | 'index_only' | 'custom';
  onNamingModeChange: (mode: 'index_title' | 'title_only' | 'index_only' | 'custom') => void;
  customTemplate: string;
  onCustomTemplateChange: (tpl: string) => void;
  filePolicy: 'skip' | 'overwrite' | 'ask';
  onFilePolicyChange: (policy: 'skip' | 'overwrite' | 'ask') => void;
  onStartDownload: () => void;
  onBack: () => void;
  sampleVideoTitle: string;
}

export const QualitySelectPage: React.FC<QualitySelectPageProps> = ({
  selectedQuality,
  onSelectQuality,
  selectedCount,
  totalEstimatedMb,
  downloadFolder,
  onFolderChange,
  freeSpaceMb,
  onFreeSpaceChange,
  namingMode,
  onNamingModeChange,
  customTemplate,
  onCustomTemplateChange,
  filePolicy,
  onFilePolicyChange,
  onStartDownload,
  onBack,
  sampleVideoTitle,
}) => {
  const [isBrowsingFolder, setIsBrowsingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [folderSuccess, setFolderSuccess] = useState<string | null>(null);

  const handleBrowseFolder = async () => {
    setIsBrowsingFolder(true);
    setFolderError(null);
    setFolderSuccess(null);
    try {
      const res = await api.selectFolder('Select Destination Directory for Downloads', downloadFolder);
      if (res.folder) {
        onFolderChange(res.folder);
        onFreeSpaceChange(res.free_space_mb);
        setFolderSuccess(`Folder selected: ${res.folder}`);
        setTimeout(() => setFolderSuccess(null), 4000);
      }
    } catch (err: any) {
      const errDetail = err.response?.data?.detail;
      if (errDetail?.error !== 'USER_CANCELLED') {
        setFolderError(errDetail?.message || 'Failed to select directory from dialog');
      }
    } finally {
      setIsBrowsingFolder(false);
    }
  };

  const handleManualPathInput = async (newPath: string) => {
    onFolderChange(newPath);
    if (!newPath.trim()) return;
    try {
      const val = await api.validateFolder(newPath.trim());
      if (val.exists && val.writable) {
        setFolderError(null);
        onFreeSpaceChange(val.free_space_mb);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message;
      if (msg) setFolderError(msg);
    }
  };

  const handleOpenExplorer = async () => {
    try {
      await api.openFolder(downloadFolder);
    } catch (err: any) {
      setFolderError('Could not open Windows Explorer for this path.');
    }
  };

  const previewName = generateFilenamePreview(
    sampleVideoTitle || 'Introduction to Python',
    1,
    namingMode,
    customTemplate
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-theme-subtle">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-theme-text">
            DOWNLOAD CONFIGURATION
          </h2>
          <p className="text-xs text-theme-secondary">
            Define container quality, target Windows filesystem path, and file naming templates.
          </p>
        </div>
        <button onClick={onBack} className="neo-btn neo-btn-dark text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          CHANGE SELECTION
        </button>
      </div>

      {/* 1. Quality Selector */}
      <QualitySelector
        selectedQuality={selectedQuality}
        onSelectQuality={onSelectQuality}
      />

      {/* 2. File Naming Rules */}
      <div className="bg-theme-card border-3 border-black shadow-brutal p-6 mb-6 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#00FF66]" />
          <h3 className="font-black text-lg text-theme-text">FILE NAMING SCHEME</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          {[
            { id: 'index_title', label: '001 - Title.mp4', desc: 'Playlist position prefix' },
            { id: 'title_only', label: 'Title.mp4', desc: 'Original clean video title' },
            { id: 'index_only', label: '001.mp4', desc: 'Sequence number only' },
            { id: 'custom', label: 'Custom Template', desc: '%(playlist_index)03d - %(title)s' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onNamingModeChange(m.id as any)}
              className={`p-3 border-3 text-left transition-all ${
                namingMode === m.id
                  ? 'bg-[#00FF66] text-black border-black shadow-brutal font-black'
                  : 'bg-theme-surface text-theme-text border-black hover:bg-theme-card'
              }`}
            >
              <div className="font-black text-sm">{m.label}</div>
              <div className={`text-xs ${namingMode === m.id ? 'text-neutral-900 font-bold' : 'text-theme-secondary'}`}>
                {m.desc}
              </div>
            </button>
          ))}
        </div>

        {namingMode === 'custom' && (
          <div className="mb-4">
            <label className="text-xs text-theme-secondary font-bold block mb-1">CUSTOM PATTERN</label>
            <input
              type="text"
              value={customTemplate}
              onChange={(e) => onCustomTemplateChange(e.target.value)}
              placeholder="%(playlist_index)03d - %(title)s.%(ext)s"
              className="neo-input w-full text-sm py-2"
            />
          </div>
        )}

        {/* Live Preview */}
        <div className="bg-theme-surface border-2 border-black p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-theme-muted font-bold">FILENAME PREVIEW:</span>
          <span className="text-black bg-[#00FF66] px-1.5 py-0.5 border border-black font-black truncate">{previewName}</span>
        </div>
      </div>

      {/* 3. Existing File Handling Policy */}
      <div className="bg-theme-card border-3 border-black shadow-brutal p-6 mb-6 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-[#FFE600]" />
          <h3 className="font-black text-lg text-theme-text">EXISTING FILE CONFLICT POLICY</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: 'skip',
              label: 'SKIP EXISTING (RECOMMENDED)',
              desc: 'If file already exists on disk, mark as skipped and proceed without re-downloading.',
            },
            {
              id: 'overwrite',
              label: 'OVERWRITE FILES',
              desc: 'Force fresh download and replace any conflicting files in destination directory.',
            },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onFilePolicyChange(p.id as any)}
              className={`p-3 border-3 text-left transition-all ${
                filePolicy === p.id
                  ? 'bg-white text-black border-black shadow-brutal font-black'
                  : 'bg-theme-surface text-theme-text border-black hover:bg-theme-card'
              }`}
            >
              <div className="font-black text-xs">{p.label}</div>
              <div className={`text-xs mt-1 ${filePolicy === p.id ? 'text-neutral-800 font-bold' : 'text-theme-secondary'}`}>
                {p.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Destination Folder Selection & Direct Path Editing */}
      <div className="bg-theme-card border-3 border-black shadow-brutal p-6 mb-6 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-[#00FF66]" />
            <h3 className="font-black text-lg text-theme-text">DESTINATION FOLDER</h3>
          </div>
          <span className="text-xs text-theme-secondary font-bold">
            CHOOSE ANY FOLDER ON YOUR COMPUTER
          </span>
        </div>

        {/* Hero Native Windows Explorer Browse Button */}
        <button
          type="button"
          onClick={handleBrowseFolder}
          disabled={isBrowsingFolder}
          className="w-full neo-btn neo-btn-green py-3 text-sm font-black flex items-center justify-center gap-2 mb-4 shadow-brutal hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <FolderOpen className="w-4 h-4" />
          <span>{isBrowsingFolder ? 'OPENING WINDOWS EXPLORER DIALOG...' : '📁 BROWSE WINDOWS FOLDER (SELECT ANY FOLDER)...'}</span>
        </button>

        {/* Editable Folder Input Field with Direct Open Button */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={downloadFolder}
              onChange={(e) => handleManualPathInput(e.target.value)}
              placeholder="Or type/paste any path, e.g. D:\Videos or C:\MyFolder"
              className="w-full neo-input text-sm py-2.5 px-4 font-bold pr-24"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
              <span className="text-[10px] bg-[#00FF66] text-black px-2 py-0.5 border border-black font-bold">
                PATH SET
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenExplorer}
            className="neo-btn neo-btn-white text-xs py-2 px-4 flex items-center justify-center gap-1.5 whitespace-nowrap"
            title="Open currently selected folder in Windows Explorer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>OPEN IN EXPLORER</span>
          </button>
        </div>

        <p className="text-[11px] text-theme-muted">
          💡 Click <strong>BROWSE WINDOWS FOLDER</strong> to select any destination on your PC via the native Windows Explorer dialog, or type/paste your custom path above.
        </p>

        {folderSuccess && (
          <div className="mt-2 text-xs text-black bg-[#00FF66] p-2 border-2 border-black font-bold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{folderSuccess}</span>
          </div>
        )}

        {folderError && (
          <div className="mt-2 text-xs text-white bg-[#FF3366] p-2 border-2 border-black font-bold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{folderError}</span>
          </div>
        )}
      </div>

      {/* 5. Storage Estimate & Disk Space Warning */}
      <FileEstimate
        selectedCount={selectedCount}
        totalEstimatedMb={totalEstimatedMb}
        availableFreeMb={freeSpaceMb}
      />

      {/* 6. Start Download Action Button */}
      <div className="flex items-center justify-between p-6 bg-theme-card border-4 border-black shadow-brutal-lg transition-colors duration-200">
        <div>
          <div className="text-sm font-bold text-theme-text">
            READY TO START QUEUE
          </div>
          <div className="text-xs text-theme-secondary">
            {selectedCount} videos queued for sequential download in {selectedQuality}.
          </div>
        </div>

        <button
          type="button"
          onClick={onStartDownload}
          className="neo-btn neo-btn-green text-base px-8 py-4 shadow-brutal active:translate-x-1 active:translate-y-1"
        >
          <Play className="w-5 h-5 fill-black" />
          <span>START DOWNLOAD QUEUE</span>
        </button>
      </div>
    </div>
  );
};
