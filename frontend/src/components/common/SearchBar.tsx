import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Sparkles, X, Navigation } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { serviceService } from '@/services/service.service';
import { categoryService } from '@/services/category.service';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const QUICK_QUERIES = ['Plumber', 'Deep clean', 'AC repair', 'Electrician', 'Salon at home'];

const INDIAN_CITIES = [
  'Pondicherry', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

export function SearchBar({ variant = 'hero' }: { variant?: 'hero' | 'compact' }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('Pondicherry');
  const [open, setOpen] = useState(false);

  const { data: suggestions } = useQuery({
    queryKey: ['search-suggest', q],
    queryFn: () => serviceService.list({ search: q, limit: 5 }),
    enabled: q.length > 1,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoryService.list(),
  });

  const submit = (term?: string) => {
    const query = term ?? q;
    navigate(`/search?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
    setOpen(false);
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const nearestCity = findNearestCity(latitude, longitude);
          if (nearestCity) setLocation(nearestCity);
        },
        () => setLocation('Pondicherry')
      );
    }
  };

  return (
    <div className={cn('relative w-full', variant === 'hero' ? 'max-w-2xl' : 'max-w-md')}>
      <div className="flex items-center gap-2 rounded-2xl bg-white/95 dark:bg-card/95 p-2 backdrop-blur-xl border border-white/50 dark:border-border/60 [box-shadow:0_8px_32px_rgb(15_23_42/0.18),0_2px_8px_rgb(15_23_42/0.12)]">
        <div className="flex items-center gap-1.5 border-r border-border/60 pr-3 pl-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-20 bg-transparent outline-none text-foreground text-sm font-medium placeholder:text-muted-foreground"
            aria-label="Location"
            placeholder="City"
          />
          <button
            onClick={detectLocation}
            className="text-primary hover:text-primary/80 transition shrink-0"
            title="Use current location"
            aria-label="Use current location"
          >
            <Navigation className="h-3.5 w-3.5" />
          </button>
        </div>
        <Search className="h-5 w-5 text-muted-foreground shrink-0 ml-1" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="What service do you need?"
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground text-foreground"
          aria-label="Search services"
        />
        {q && (
          <button onClick={() => setQ('')} className="text-muted-foreground hover:text-foreground transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        )}
        <Button
          onClick={() => submit()}
          className="btn-glow rounded-xl bg-brand-gradient text-white shrink-0 gap-1.5 font-bold px-5"
          size="sm"
        >
          <Search className="h-4 w-4" />
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
                <p className="mb-2 mt-4 text-xs font-semibold text-muted-foreground">Quick cities</p>
                <div className="flex flex-wrap gap-2">
                  {INDIAN_CITIES.slice(0, 5).map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setLocation(city);
                        setOpen(false);
                      }}
                      className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
                    >
                      <MapPin className="h-3 w-3" /> {city}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {suggestions?.data?.map((s) => (
              <button
                key={s._id}
                onClick={() => navigate(`/book?service=${s._id}`)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted"
              >
                {s.image ? (
                  <img src={s.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Search className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category?.name}</p>
                </div>
                <span className="text-xs font-semibold text-primary">₹{s.basePrice}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function findNearestCity(lat: number, lng: number): string | null {
  const cities: { name: string; lat: number; lng: number }[] = [
    { name: 'Pondicherry', lat: 11.9416, lng: 79.8083 },
    { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
    { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
    { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
    { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  ];
  let best = cities[0];
  let bestDist = Infinity;
  for (const c of cities) {
    const d = Math.hypot(lat - c.lat, lng - c.lng);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return bestDist < 15 ? best.name : 'Pondicherry';
}
