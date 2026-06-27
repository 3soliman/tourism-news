import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FormSkeleton } from '../shared/LoadingSkeletons';

const DEFAULT_MAX = 10;
const defaultGetOptionId = (opt) => opt.id;
const defaultGetOptionLabel = (opt) => opt.label ?? opt.name ?? '';
const defaultGetOptionSublabel = (opt) => opt.sublabel ?? opt.meta ?? '';

/**
 * Searchable multi-select: search filters options, dropdown shows first N matches,
 * selected items appear as removable tags (scalable for large catalogs).
 */
const SearchableMultiSelect = ({
  options = [],
  selectedIds = [],
  onToggle,
  getOptionId = defaultGetOptionId,
  getOptionLabel = defaultGetOptionLabel,
  getOptionSublabel = defaultGetOptionSublabel,
  renderOptionIcon,
  placeholder = 'Search…',
  disabled = false,
  loading = false,
  maxVisible = DEFAULT_MAX,
  emptyText = 'No matches.',
  hintText,
  busyId = null
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();

  const selectedSet = useMemo(
    () => new Set(selectedIds.map((id) => String(id))),
    [selectedIds]
  );

  const optionById = useMemo(() => {
    const map = new Map();
    options.forEach((opt) => map.set(String(getOptionId(opt)), opt));
    return map;
  }, [options, getOptionId]);

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return options
      .filter((opt) => {
        const id = String(getOptionId(opt));
        if (selectedSet.has(id)) return false;
        if (!q) return true;
        const haystack = [getOptionLabel(opt), getOptionSublabel(opt)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, maxVisible);
  }, [options, search, selectedSet, maxVisible, getOptionId, getOptionLabel, getOptionSublabel]);

  const selectedOptions = useMemo(
    () =>
      selectedIds
        .map((id) => optionById.get(String(id)))
        .filter(Boolean),
    [selectedIds, optionById]
  );

  const totalAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return options.filter((opt) => {
      const id = String(getOptionId(opt));
      if (selectedSet.has(id)) return false;
      if (!q) return true;
      const haystack = [getOptionLabel(opt), getOptionSublabel(opt)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    }).length;
  }, [options, search, selectedSet, getOptionId, getOptionLabel, getOptionSublabel]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handlePick = (opt) => {
    if (disabled || busyId) return;
    onToggle(getOptionId(opt), opt);
    setSearch('');
    setOpen(true);
  };

  const handleRemove = (opt) => {
    if (disabled || busyId) return;
    onToggle(getOptionId(opt), opt);
  };

  if (loading) {
    return <FormSkeleton fields={2} message="Loading options..." />;
  }

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="searchable-multi-select" ref={rootRef}>
      <div className="sms-search-wrap">
        <input
          type="search"
          className="sms-search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled || Boolean(busyId)}
          aria-controls={open ? listId : undefined}
          autoComplete="off"
        />
      </div>

      <p className="sms-meta">
        {selectedOptions.length} selected
        {totalAvailable > 0 && (
          <>
            {' '}
            · showing {Math.min(maxVisible, totalAvailable)} of {totalAvailable} match
            {totalAvailable !== 1 ? 'es' : ''}
          </>
        )}
        {hintText ? ` · ${hintText}` : null}
      </p>

      {open && !disabled && (
        <ul className="sms-dropdown" id={listId} role="listbox">
          {filteredAvailable.length === 0 ? (
            <li className="sms-dropdown-empty">{emptyText}</li>
          ) : (
            filteredAvailable.map((opt) => {
              const id = String(getOptionId(opt));
              const busy = busyId != null && String(busyId) === id;
              return (
                <li key={id} role="option" aria-selected="false">
                  <button
                    type="button"
                    className="sms-option"
                    onClick={() => handlePick(opt)}
                    disabled={disabled || busy}
                  >
                    {renderOptionIcon ? renderOptionIcon(opt) : null}
                    <span className="sms-option-text">
                      <span className="sms-option-label">{getOptionLabel(opt)}</span>
                      {getOptionSublabel(opt) ? (
                        <span className="sms-option-sublabel">{getOptionSublabel(opt)}</span>
                      ) : null}
                    </span>
                    <span className="sms-option-action">{busy ? '…' : '+'}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {selectedOptions.length > 0 && (
        <div className="sms-selected">
          <span className="sms-selected-label">Selected ({selectedOptions.length})</span>
          <ul className="sms-tags">
            {selectedOptions.map((opt) => {
              const id = String(getOptionId(opt));
              const busy = busyId != null && String(busyId) === id;
              return (
                <li key={id}>
                  <span className="sms-tag">
                    {renderOptionIcon ? renderOptionIcon(opt, { small: true }) : null}
                    <span className="sms-tag-label">{getOptionLabel(opt)}</span>
                    <button
                      type="button"
                      className="sms-tag-remove"
                      onClick={() => handleRemove(opt)}
                      disabled={disabled || busy}
                      aria-label={`Remove ${getOptionLabel(opt)}`}
                    >
                      ×
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default React.memo(SearchableMultiSelect);
