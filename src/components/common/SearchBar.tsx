import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Sparkles, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { serviceService } from '@/services/service.service';
import { categoryService } from '@/services/category.service';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const QUICK_QUERIES = ['Plumber', 'Deep clean', 'AC repair', 'Electrician', 'Salon at home'];

export function SearchBar({ variant = 'hero' }: { variant?: 'hero' | 'compact' }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('New York');
  const [open, setOpen] = useState(false);

  const { data: suggestions } = useQuery({
    queryKey: ['search-suggest', q],
    queryFn: () => serviceService.list({ search: q, limit: 5 }),
    enabled: q.length > 1,
  });

  const { data: categories } = useQuery({
    queryKey: queryKeysCategories,
    queryFn: () => categoryService.list(),
  });

  const submit = (term?: string) => {
    const query = term ?? q;
    navigate(`/search?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
    setOpen(false);
  };

  return (
    <div className={cn('relative w-full', variant === 'hero' ? 'max-w-2xl' : 'max-w-md')}>
      <div className="glass flex items-center gap-2 rounded-2xl p-2 shadow-card">
        <div className="flex items-center gap-1.5 border-r pr-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-24 bg-transparent outline-none"
            aria-label="Location"
          />
        </div>
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="What service do you need?"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Search services"
        />
        {q && (
          <button onClick={() => setQ('')} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
        <Button onClick={() => submit()} className="btn-glow rounded-xl" size="sm">
          Search
        </Button>
      </div>

      <AnimatePresence>
        {open && (suggestions?.data?.length || q.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-strong absolute z-50 mt-2 w-full overflow-hidden rounded-2xl p-3 shadow-card-hover"
          >
            {q.length === 0 && (
              <div className="mb-2">
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Popular searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_QUERIES.map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setQ(term);
                        submit(term);
                      }}
                      className="rounded-full bg-muted px-3 py-1 text-xs transition hover:bg-primary hover:text-primary-foreground"
                    >
                      {term}
                    </button>
                  ))}
                </div>
                {categories?.length ? (
                  <>
                    <p className="mb-2 mt-4 text-xs font-semibold text-muted-foreground">Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.slice(0, 6).map((c) => (
                        <button
                          key={c._id}
                          onClick={() => submit(c.name)}
                          className="rounded-full border px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            )}
            {suggestions?.data?.map((s) => (
              <button
                key={s._id}
                onClick={() => navigate(`/book?service=${s._id}`)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted"
              >
                {s.image && <img src={s.image} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category?.name}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const queryKeysCategories = ['categories', 'list'] as const;
