export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatTimeRemaining(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}h ${remM}m`;
  }
  return `${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function parseSelectionClient(input: string, maxVideos: number): { indices: number[]; error?: string } {
  const trimmed = (input || '').trim().toLowerCase();
  if (!trimmed) {
    return { indices: [], error: 'Selection cannot be empty.' };
  }

  if (trimmed === 'all') {
    return { indices: Array.from({ length: maxVideos }, (_, i) => i + 1) };
  }

  const tokens = trimmed.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
  if (!tokens.length) {
    return { indices: [], error: 'No valid selection tokens.' };
  }

  const selectedSet = new Set<number>();

  for (const token of tokens) {
    if (token.includes('--') || token.startsWith('-') || token.endsWith('-')) {
      return { indices: [], error: `Invalid range syntax in: "${token}"` };
    }

    if (token.includes('-')) {
      const parts = token.split('-');
      if (parts.length !== 2) {
        return { indices: [], error: `Invalid range format: "${token}"` };
      }
      const start = parseInt(parts[0].trim(), 10);
      const end = parseInt(parts[1].trim(), 10);
      if (isNaN(start) || isNaN(end)) {
        return { indices: [], error: `Range must contain numbers: "${token}"` };
      }
      if (start === 0 || end === 0) {
        return { indices: [], error: 'Playlist is 1-indexed. Index 0 is invalid.' };
      }
      if (start > end) {
        return { indices: [], error: `Start index cannot be greater than end index in "${token}".` };
      }
      if (start > maxVideos || end > maxVideos) {
        return { indices: [], error: `Selection "${token}" exceeds total video count (${maxVideos}).` };
      }
      for (let i = start; i <= end; i++) {
        selectedSet.add(i);
      }
    } else {
      const val = parseInt(token, 10);
      if (isNaN(val)) {
        return { indices: [], error: `Invalid item "${token}". Expected a number or range.` };
      }
      if (val === 0) {
        return { indices: [], error: 'Playlist is 1-indexed. Index 0 is invalid.' };
      }
      if (val < 0) {
        return { indices: [], error: `Negative numbers are not allowed: ${val}` };
      }
      if (val > maxVideos) {
        return { indices: [], error: `Index ${val} exceeds total playlist size (${maxVideos}).` };
      }
      selectedSet.add(val);
    }
  }

  return { indices: Array.from(selectedSet).sort((a, b) => a - b) };
}

export function sanitizeFilenameClient(name: string): string {
  if (!name) return 'video';
  // Strip Windows invalid characters \ / : * ? " < > | and control chars
  let cleaned = name.replace(/[\\/:*?"<>|]/g, ' ').replace(/[\x00-\x1f\x7f]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '');
  return cleaned || 'video';
}

export function generateFilenamePreview(
  title: string,
  index: number,
  mode: 'index_title' | 'title_only' | 'index_only' | 'custom',
  customTemplate?: string
): string {
  const padIndex = index.toString().padStart(3, '0');
  const cleanTitle = sanitizeFilenameClient(title);
  if (mode === 'title_only') {
    return `${cleanTitle}.mp4`;
  }
  if (mode === 'index_only') {
    return `${padIndex}.mp4`;
  }
  if (mode === 'custom' && customTemplate) {
    let res = customTemplate.replace(/%\(playlist_index\)03d/g, padIndex);
    res = res.replace(/%\(playlist_index\)d/g, index.toString());
    res = res.replace(/%\(title\)s/g, cleanTitle);
    res = res.replace(/%\(ext\)s/g, 'mp4');
    const withExt = res.endsWith('.mp4') ? res : `${res}.mp4`;
    const stem = withExt.slice(0, -4);
    return `${sanitizeFilenameClient(stem)}.mp4`;
  }
  return `${padIndex} - ${cleanTitle}.mp4`;
}
