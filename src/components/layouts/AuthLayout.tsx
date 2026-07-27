import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ROUTES } from '@/constants/routes';

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* visual side */}
      <div className="relative hidden overflow-hidden gradient-hero lg:block">
        <div className="absolute inset-0">
          <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to={ROUTES.home}>
            <Logo />
          </Link>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold font-display leading-tight">
              Trusted pros, <span className="gradient-text">on your schedule.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands booking home, beauty, and repair services in minutes — with transparent pricing and verified workers.
            </p>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>4.9 avg rating</span>
            <span>·</span>
            <span>120K+ jobs done</span>
            <span>·</span>
            <span>42 cities</span>
          </div>
        </div>
      </div>

      {/* form side */}
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between px-6">
          <Link to={ROUTES.home} className="lg:hidden">
            <Logo />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
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
