import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Star, Users, MapPin, Sparkles, Shield } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ROUTES } from '@/constants/routes';

const TRUST_STATS = [
  { icon: Star, label: '4.9 avg rating' },
  { icon: BadgeCheck, label: '120K+ jobs done' },
  { icon: MapPin, label: '42+ cities' },
];

const FEATURES = [
  { icon: Shield, title: 'Verified Pros', desc: 'Every worker is background-checked and AI-verified.' },
  { icon: Sparkles, title: 'AI Matching', desc: 'Smart recommendations based on your location and needs.' },
  { icon: BadgeCheck, title: 'Guaranteed Quality', desc: '100% satisfaction or we fix it free of charge.' },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Visual side ── */}
      <div className="relative hidden overflow-hidden gradient-hero lg:flex lg:flex-col">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: '4s' }} />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <Link to={ROUTES.home} className="inline-block">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white font-display">OneDW</span>
            </div>
          </Link>

          {/* Main content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur mb-4">
                <Sparkles className="h-3.5 w-3.5" /> AI-Powered Platform
              </span>
              <h2 className="text-4xl font-extrabold leading-[1.1] text-white font-display xl:text-5xl">
                Trusted pros,{' '}
                <span className="block text-white/80">on your schedule.</span>
              </h2>
              <p className="mt-4 max-w-sm text-base text-white/70 leading-relaxed">
                Join thousands booking home, beauty, and repair services in minutes — with transparent pricing and verified workers.
              </p>
            </motion.div>

            {/* Feature cards */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{f.title}</p>
                      <p className="text-xs text-white/65 mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-6"
          >
            {TRUST_STATS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/80">
                <Icon className="h-4 w-4 text-white" />
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Form side ── */}
      <div className="flex flex-col bg-background">
        <header className="flex h-16 items-center justify-between px-6 border-b border-border/40">
          <Link to={ROUTES.home} className="lg:hidden">
            <Logo />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
