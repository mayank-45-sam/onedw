import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, Clock, Wrench, Users, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchService, type SearchSuggestion } from '@/services/search.service';
import { queryKeys } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface AutocompleteSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const RECENT_KEY = 'onedw_recent_searches';

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  const next = [term, ...loadRecent().filter((t) => t !== term)].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

const SUGGESTION_ICON: Record<SearchSuggestion['type'], React.ReactNode> = {
  service: <Wrench className="h-4 w-4" />,
  worker: <Users className="h-4 w-4" />,
  category: <TrendingUp className="h-4 w-4" />,
};

function Highlight({ text, match }: { text: string; match: string }) {
  if (!match) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = match.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/20 px-0.5 font-semibold text-foreground">{text.slice(idx, idx + needle.length)}</mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

export function AutocompleteSearch({
  value: controlledValue,
  onChange,
  onSelect,
  placeholder = 'Search services, pros, categories…',
  className,
  autoFocus,
}: AutocompleteSearchProps) {
  const navigate = useNavigate();
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue ?? internalValue;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setDebouncedQuery('');
      return;
    }
    debounceRef.current = setTimeout(() => setDebouncedQuery(value.trim()), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const suggestionsQuery = useQuery({
    queryKey: queryKeys.search.autoComplete(debouncedQuery),
    queryFn: () => searchService.autoComplete(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });

  const popularQuery = useQuery({
    queryKey: queryKeys.search.popular,
    queryFn: () => searchService.popular(),
    staleTime: 5 * 60_000,
  });

  const suggestions = suggestionsQuery.data ?? [];
  const showRecent = !debouncedQuery && recent.length > 0;
  const showPopular = !debouncedQuery && (popularQuery.data?.length ?? 0) > 0;
  const flatItems: ({ kind: 'recent' | 'popular'; text: string } | SearchSuggestion)[] = [
    ...(showRecent ? recent.map((t) => ({ kind: 'recent' as const, text: t })) : []),
    ...(showPopular ? (popularQuery.data ?? []).slice(0, 5).map((p) => ({ kind: 'popular' as const, text: p.term })) : []),
    ...suggestions,
  ];

  const setValue = (v: string) => {
    if (controlledValue === undefined) setInternalValue(v);
    onChange?.(v);
  };

  const handleSelect = (item: SearchSuggestion | { kind: string; text: string }) => {
    const term = item.text;
    setValue(term);
    saveRecent(term);
    setRecent(loadRecent());
    setOpen(false);
    setActiveIndex(-1);
    if ('type' in item && (item as SearchSuggestion).type) {
      onSelect?.(item as SearchSuggestion);
    } else {
      navigate(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  const commitSearch = () => {
    if (!value.trim()) return;
    saveRecent(value.trim());
    setRecent(loadRecent());
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && flatItems[activeIndex]) handleSelect(flatItems[activeIndex]);
      else commitSearch();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const renderRow = (item: ({ kind: 'recent' | 'popular'; text: string } | SearchSuggestion), i: number) => {
    const isSuggestion = 'type' in item;
    const term = 'text' in item ? item.text : (item as SearchSuggestion).text;
    return (
      <button
        key={`${term}-${i}`}
        type="button"
        onMouseEnter={() => setActiveIndex(i)}
        onClick={() => handleSelect(item)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
          activeIndex === i ? 'bg-primary/10' : 'hover:bg-muted'
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {isSuggestion ? SUGGESTION_ICON[(item as SearchSuggestion).type] : <Clock className="h-4 w-4" />}
        </span>
        <span className="flex-1">
          <Highlight text={term} match={debouncedQuery} />
          {isSuggestion && (item as SearchSuggestion).meta && (
            <span className="ml-2 text-xs text-muted-foreground">{(item as SearchSuggestion).meta}</span>
          )}
        </span>
        {!isSuggestion && (item as { kind: string }).kind === 'popular' && (
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
        )}
      </button>
    );
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-12 w-full rounded-full border bg-card pl-11 pr-10 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {value && (
          <button
            onClick={() => { setValue(''); setActiveIndex(-1); }}
            aria-label="Clear"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (flatItems.length > 0 || suggestionsQuery.isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border bg-card p-2 shadow-xl"
          >
            {suggestionsQuery.isLoading && debouncedQuery ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg shimmer" />
                    <div className="h-4 flex-1 rounded shimmer" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {showRecent && (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent searches</p>
                )}
                {showRecent && recent.map((t, i) => renderRow({ kind: 'recent', text: t }, i))}
                {showPopular && (
                  <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Popular searches</p>
                )}
                {showPopular && (popularQuery.data ?? []).slice(0, 5).map((p, i) => renderRow({ kind: 'popular', text: p.term }, i))}
                {suggestions.length > 0 && !showRecent && !showPopular && (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Suggestions</p>
                )}
                {suggestions.map((s, i) => renderRow(s, recent.length + (showPopular ? Math.min(5, popularQuery.data?.length ?? 0) : 0) + i))}
                {flatItems.length > 0 && (
                  <div className="mt-1 flex items-center justify-end gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
                    <CornerDownLeft className="h-3 w-3" /> to search
                    <span className="ml-2 rounded border px-1.5">↑↓</span> to navigate
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
