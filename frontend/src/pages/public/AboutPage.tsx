import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Target, ShieldCheck, Bot, Zap, Wallet, MapPin, Star, Heart,
  ClipboardList, Sparkles, CalendarCheck, BadgeCheck, Eye, ArrowRight, ArrowDown,
  Clock, IndianRupee, Users, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

// ============================================================
// DATA
// ============================================================

const MISSION_POINTS = [
  { icon: ShieldCheck, title: 'Trusted & verified', description: 'Every professional is verified before joining the platform.' },
  { icon: Bot, title: 'AI-powered matching', description: 'Smart scoring pairs you with the right pro for the job.' },
  { icon: Zap, title: 'Seamless booking', description: 'Book a service in minutes with live tracking and chat.' },
  { icon: Heart, title: 'Empowering workers', description: 'Fair wages, flexible hours, and instant payouts for pros.' },
];

const STEPS = [
  {
    icon: ClipboardList,
    step: '01',
    title: 'Customer books a service',
    description: 'Choose from a wide range of home services and pick a time that works for you.',
  },
  {
    icon: Bot,
    step: '02',
    title: 'AI recommends the best nearby verified worker',
    description: 'Our engine scores pros on location, availability, skills, experience, and ratings.',
  },
  {
    icon: CalendarCheck,
    step: '03',
    title: 'Worker accepts the booking',
    description: 'Get instant confirmation, a live ETA, and in-app chat to coordinate.',
  },
  {
    icon: Star,
    step: '04',
    title: 'Job completed and customer provides rating',
    description: 'Rate your experience to help other customers pick the right professional.',
  },
];

const FEATURES = [
  {
    icon: Bot,
    title: 'AI-Powered Worker Matching',
    description: 'Finds the best professional based on location, availability, skills, experience, and ratings.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Professionals',
    description: 'Every worker is verified before joining the platform.',
  },
  {
    icon: Zap,
    title: 'Fast Booking',
    description: 'Book services within minutes.',
  },
  {
    icon: Wallet,
    title: 'Transparent Pricing',
    description: 'No hidden charges with fair pricing.',
  },
  {
    icon: MapPin,
    title: 'Hyperlocal Services',
    description: 'Nearby professionals ensure faster service.',
  },
  {
    icon: Star,
    title: 'Ratings & Reviews',
    description: 'Customer reviews help maintain service quality.',
  },
];

const STATS = [
  { value: 120000, decimals: 0, suffix: '+', label: 'Happy Customers', icon: Heart },
  { value: 8500, decimals: 0, suffix: '+', label: 'Verified Professionals', icon: Users },
  { value: 350000, decimals: 0, suffix: '+', label: 'Completed Jobs', icon: TrendingUp },
  { value: 4.9, decimals: 1, suffix: '', label: 'Average Rating', icon: Star },
];

// ============================================================
// LOCAL COMPONENTS
// ============================================================

function SectionHeading({ badge, title, subtitle }: { badge: string; title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl text-center"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur">
        {badge}
      </span>
      <h2 className="mt-4 text-3xl font-extrabold font-display md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );
}

function useCountUp(target: number, decimals: number, duration: number, start: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(parseFloat((target * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, decimals, duration]);
  return value;
}

function StatCard({ value, decimals, suffix, label, icon: Icon, index }: {
  value: number; decimals: number; suffix: string; label: string;
  icon: React.ComponentType<{ className?: string }>; index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const current = useCountUp(value, decimals, 1800, inView);
  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : Math.round(current).toLocaleString('en-IN');

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass rounded-3xl p-6 text-center transition-transform duration-300 hover:-translate-y-1 md:p-8"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-3xl font-extrabold font-display gradient-text md:text-4xl">
        {formatted}{suffix}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function AboutPage() {
  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden gradient-hero">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute right-0 top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="container relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" /> About OneDW
            </span>
            <h1 className="mt-6 text-4xl font-extrabold font-display leading-[1.1] md:text-5xl lg:text-6xl">
              We're making home services <span className="gradient-text">effortless for everyone.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0">
              OneDW connects customers with verified local professionals using AI-powered matching, making home services faster, safer, and more reliable.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button asChild size="lg" className="btn-glow gap-2 rounded-full">
                <Link to={ROUTES.services}>Book a Service <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to={ROUTES.register}>Become a Professional</Link>
              </Button>
            </div>
          </motion.div>

          {/* Illustration — floating glass cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute -inset-6 rounded-[2.5rem] bg-brand-gradient opacity-15 blur-2xl" />

            <div className="glass card-premium relative z-10 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient font-bold text-white shadow-glow">
                  PS
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold font-display">Priya Sharma</p>
                  <p className="truncate text-xs text-muted-foreground">Verified Home Cleaner</p>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-warning">
                    <Star className="h-3.5 w-3.5 fill-warning" /> 4.9
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Online
                    </span>
                  </div>
                </div>
                <div className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  98% AI match
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-muted/50 p-3">
                  <Clock className="mx-auto h-4 w-4 text-primary" />
                  <p className="mt-1 text-sm font-bold">30 min</p>
                  <p className="text-[10px] text-muted-foreground">ETA</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <IndianRupee className="mx-auto h-4 w-4 text-success" />
                  <p className="mt-1 text-sm font-bold">₹250</p>
                  <p className="text-[10px] text-muted-foreground">Fixed</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3">
                  <Star className="mx-auto h-4 w-4 text-warning" />
                  <p className="mt-1 text-sm font-bold">1.2k</p>
                  <p className="text-[10px] text-muted-foreground">Reviews</p>
                </div>
              </div>
            </div>

            <div className="glass absolute -left-6 top-8 flex items-center gap-2 rounded-2xl px-4 py-3 animate-float">
              <BadgeCheck className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold">Verified</span>
            </div>
            <div className="glass absolute -right-5 top-1/2 flex items-center gap-2 rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: '1.2s' }}>
              <Zap className="h-5 w-5 text-warning" />
              <span className="text-xs font-semibold">Books in minutes</span>
            </div>
            <div className="glass absolute -bottom-5 left-10 flex items-center gap-2 rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: '0.6s' }}>
              <Target className="h-5 w-5 text-accent" />
              <span className="text-xs font-semibold">Right match</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ MISSION ============ */}
      <section className="container py-16 md:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="card-premium relative overflow-hidden p-8 md:p-10"
          >
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Target className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-3xl font-extrabold font-display">Our Mission</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Our mission is to simplify home services across India by connecting customers with trusted,
              verified professionals through intelligent technology. We aim to empower local workers while
              giving customers a seamless booking experience.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {MISSION_POINTS.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="card-premium card-premium-hover p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-semibold font-display">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ HOW ONEDW WORKS ============ */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container">
          <SectionHeading
            badge="How it works"
            title="How OneDW works"
            subtitle="From booking to done — four simple steps."
          />
          <div className="mt-12 flex flex-col items-stretch gap-6 lg:flex-row">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Fragment key={s.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="card-premium card-premium-hover group relative flex-1 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform duration-300 group-hover:scale-110">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-4xl font-extrabold font-display text-primary/10 transition-colors duration-300 group-hover:text-primary/25">
                        {s.step}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold font-display">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  </motion.div>
                  {i < STEPS.length - 1 && (
                    <div className="flex items-center justify-center py-1 lg:py-0">
                      <ArrowDown className="h-6 w-6 text-primary/50 lg:hidden" />
                      <ArrowRight className="hidden h-6 w-6 text-primary/50 lg:block" />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ WHY CHOOSE ONEDW ============ */}
      <section className="container py-16 md:py-20">
        <SectionHeading
          badge="Why OneDW"
          title="Why choose OneDW"
          subtitle="Everything you need for a stress-free home service experience."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                className="card-premium card-premium-hover group relative overflow-hidden p-6"
              >
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/5 blur-xl transition-all duration-300 group-hover:bg-primary/15" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold font-display">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============ PLATFORM STATISTICS ============ */}
      <section className="relative overflow-hidden bg-muted/30 py-16 md:py-24">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--primary) / 0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="container relative">
          <SectionHeading
            badge="By the numbers"
            title="OneDW in numbers"
            subtitle="Real impact delivered across India every single day."
          />
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <StatCard key={s.label} {...s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ VISION ============ */}
      <section className="container py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] p-8 text-center md:p-12"
        >
          <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Eye className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold font-display md:text-4xl">Our Vision</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              To become India's most trusted AI-powered home services platform, creating opportunities for
              local professionals while delivering exceptional experiences to every household.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ============ CTA ============ */}
      <section className="container pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-brand-gradient px-6 py-14 text-center text-white md:py-20"
        >
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -right-8 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute left-1/4 top-6 h-20 w-20 rounded-full bg-white/10 blur-xl animate-float" />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold font-display md:text-4xl">
              Ready to book trusted professionals?
            </h2>
            <p className="mt-4 text-white/85">
              Join thousands of happy customers and book verified local pros in minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="btn-glow gap-2 rounded-full font-semibold"
              >
                <Link to={ROUTES.services}>Book a Service <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-2 rounded-full border-white/30 bg-white/10 font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white"
              >
                <Link to={ROUTES.register}>Become a Professional</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
