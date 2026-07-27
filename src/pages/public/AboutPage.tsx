import { motion } from 'framer-motion';
import { Target, Heart, ShieldCheck, Users, TrendingUp, Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/common/SectionHeader';
import { STATS } from '@/constants/app';

const VALUES = [
  { icon: ShieldCheck, title: 'Trust & safety', description: 'Every pro is background-checked and verified before joining.' },
  { icon: Heart, title: 'Customer first', description: 'Transparent pricing, no surprises, and a satisfaction guarantee.' },
  { icon: TrendingUp, title: 'Empower pros', description: 'Fair wages, flexible hours, and instant payouts for workers.' },
  { icon: Sparkles, title: 'Smart matching', description: 'AI recommendations connect you with the right pro, fast.' },
];

const MILESTONES = [
  { year: '2023', title: 'OneDW is born', description: 'Founded with a mission to make home services effortless across India.' },
  { year: '2024', title: '10 cities live', description: 'Expanded across the country with 5,000+ verified professionals.' },
  { year: '2025', title: '3,50,000+ jobs done', description: 'Reached 4.9 average rating from happy customers nationwide.' },
];

export default function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden gradient-hero py-20 md:py-28">
        <div className="container relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Target className="h-4 w-4 text-primary" /> Our story
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold font-display md:text-5xl">
              We're making home services <span className="gradient-text">effortless for everyone.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              OneDW connects customers with verified local professionals — while giving workers a flexible, fair way to earn. Built on trust, powered by smart matching.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container py-16 md:py-20">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="card-premium p-6 text-center">
              <p className="text-3xl font-extrabold font-display gradient-text md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container py-16 md:py-20">
        <SectionHeader title="What we stand for" subtitle="The values that guide every decision we make." />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="card-premium card-premium-hover p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold font-display">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container">
          <SectionHeader title="Our journey" subtitle="From idea to impact." className="mb-10" />
          <div className="relative space-y-8 before:absolute before:left-4 before:h-full before:w-px before:bg-border md:before:left-1/2">
            {MILESTONES.map((m, i) => (
              <motion.div key={m.year} initial={{ opacity: 0, x: i % 2 ? 30 : -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className={`relative flex md:w-1/2 ${i % 2 ? 'md:ml-auto md:pl-10' : 'md:pr-10 md:text-right'}`}>
                <div className={`card-premium p-6 ${i % 2 ? '' : 'md:mr-0'}`}>
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">{m.year}</span>
                  <h3 className="mt-3 font-semibold font-display">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
