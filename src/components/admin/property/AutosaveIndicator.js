import React from 'react';
import Icon from '../../icons/Icon';

const AutosaveIndicator = ({ isSaving = false, lastSaved = null, error = null }) => {
  if (error) {
    return (
      <div className="autosave-indicator autosave-indicator--error" role="status" aria-live="polite">
        <Icon name="x" size={14} />
        <span>Save failed</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="autosave-indicator autosave-indicator--saving" role="status" aria-live="polite">
        <Icon name="loader" size={14} className="autosave-spinner" />
        <span>Saving…</span>
      </div>
    );
  }

  if (lastSaved) {
    const timeSince = formatTimeSince(lastSaved);
    return (
      <div className="autosave-indicator autosave-indicator--saved" role="status" aria-live="polite">
        <Icon name="check" size={14} />
        <span>Saved {timeSince}</span>
      </div>
    );
  }

  return (
    <div className="autosave-indicator autosave-indicator--idle" role="status">
      <span>Not saved yet</span>
    </div>
  );
};

function formatTimeSince(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1m ago';
  return `${minutes}m ago`;
}

export default AutosaveIndicator;
