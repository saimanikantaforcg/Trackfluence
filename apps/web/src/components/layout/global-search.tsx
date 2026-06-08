'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Users, Link2, X } from 'lucide-react';
import type { SearchResult, SearchResults } from '@/lib/api';

const EMPTY: SearchResults = { creators: [], customers: [], links: [] };

const TYPE_ICON: Record<string, React.FC<{ className?: string }>> = {
  creator: TrendingUp,
  customer: Users,
  tracking_link: Link2,
};

const TYPE_COLOR: Record<string, string> = {
  creator: 'text-indigo-500 bg-indigo-50',
  customer: 'text-emerald-500 bg-emerald-50',
  tracking_link: 'text-purple-500 bg-purple-50',
};

const SECTION_LABEL: Record<string, string> = {
  creators: 'Creators',
  customers: 'Customers',
  links: 'Tracking Links',
};

function useDebounce(value: string, ms: number) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return dv;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  // Fetch results
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) { setResults(EMPTY); setOpen(false); return; }

    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/search?q=${encodeURIComponent(q)}&limit=5`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
      .then((r) => r.ok ? r.json() : EMPTY)
      .then((data: SearchResults) => {
        setResults(data);
        const hasAny = data.creators.length + data.customers.length + data.links.length > 0;
        setOpen(hasAny);
        setFocused(-1);
      })
      .catch(() => setResults(EMPTY))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Flatten results for keyboard nav
  const flat: SearchResult[] = [
    ...results.creators,
    ...results.customers,
    ...results.links,
  ];

  function navigate(item: SearchResult) {
    setOpen(false);
    setQuery('');
    router.push(item.url);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, 0));
    } else if (e.key === 'Enter' && focused >= 0 && flat[focused]) {
      navigate(flat[focused]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const sections = (
    Object.entries({ creators: results.creators, customers: results.customers, links: results.links }) as
    [string, SearchResult[]][]
  ).filter(([, items]) => items.length > 0);

  let flatIdx = 0;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (flat.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search creators, customers, campaigns…"
          className="h-10 w-80 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(EMPTY); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-96 max-h-[480px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Searching…</div>
          ) : sections.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">No results for "{query}"</div>
          ) : (
            sections.map(([section, items]) => (
              <div key={section}>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {SECTION_LABEL[section]}
                  </span>
                </div>
                {items.map((item) => {
                  const idx = flatIdx++;
                  const Icon = TYPE_ICON[item.type] ?? Search;
                  const isFocused = focused === idx;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setFocused(idx)}
                      onClick={() => navigate(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TYPE_COLOR[item.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isFocused ? 'text-indigo-700' : 'text-slate-800'}`}>
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {flat.length} result{flat.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-slate-400">↑↓ navigate · ↵ open · esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
