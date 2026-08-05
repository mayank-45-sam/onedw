import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Bell, User, LogOut, LayoutDashboard, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { initials } from '@/utils/format';

const NAV_LINKS = [
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.services, label: 'Services' },
  { to: ROUTES.categories, label: 'Categories' },
  { to: ROUTES.about, label: 'About' },
  { to: ROUTES.help, label: 'Help' },
];

export function PublicLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  const dashboardLink =
    user?.role === 'admin' ? ROUTES.adminDashboard : user?.role === 'worker' ? ROUTES.workerDashboard : ROUTES.customerDashboard;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ──────────────────────────────────────────
          NAVBAR
      ────────────────────────────────────────── */}
      <header
        className={cn(
          'sticky top-0 z-40 transition-all duration-300',
          scrolled
            ? 'border-b border-border/60 bg-background/90 backdrop-blur-2xl shadow-sm'
            : 'bg-transparent'
        )}
      >
        <div className="container flex h-16 items-center justify-between gap-4 lg:h-18">
          {/* Logo */}
          <Link to={ROUTES.home} className="shrink-0 transition-transform duration-200 hover:scale-105">
            <Logo />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isAuthenticated ? (
              <>
                <Button asChild variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
                  <Link to={ROUTES.notifications}>
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="icon" className="rounded-xl" aria-label="Profile">
                  <Link to={ROUTES.profile}>
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20 ring-offset-1">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {user ? initials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </Button>

                <Button asChild size="sm" className="btn-glow hidden rounded-full bg-brand-gradient text-white sm:flex gap-1.5">
                  <Link to={dashboardLink}>
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:flex text-muted-foreground hover:text-foreground">
                  <Link to={ROUTES.login}>Sign in</Link>
                </Button>
                <Button asChild size="sm" className="btn-glow rounded-full bg-brand-gradient text-white shadow-card">
                  <Link to={ROUTES.register}>Get started</Link>
                </Button>
              </>
            )}

            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex h-full flex-col">
                  <div className="flex h-16 items-center justify-between px-5 border-b">
                    <SheetClose asChild>
                      <Link to={ROUTES.home}>
                        <Logo />
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon-sm" className="rounded-lg">
                        <X className="h-4 w-4" />
                      </Button>
                    </SheetClose>
                  </div>

                  <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
                    {NAV_LINKS.map((link) => (
                      <SheetClose asChild key={link.to}>
                        <NavLink
                          to={link.to}
                          className={({ isActive }) =>
                            cn(
                              'rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )
                          }
                        >
                          {link.label}
                        </NavLink>
                      </SheetClose>
                    ))}

                    <div className="my-2 h-px bg-border/60" />

                    {isAuthenticated ? (
                      <>
                        <SheetClose asChild>
                          <Link to={dashboardLink} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors">
                            <LayoutDashboard className="h-4 w-4" /> Dashboard
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to={ROUTES.profile} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors">
                            <User className="h-4 w-4" /> Profile
                          </Link>
                        </SheetClose>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-error transition hover:bg-error/10 mt-1"
                        >
                          <LogOut className="h-4 w-4" /> Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        <SheetClose asChild>
                          <Link to={ROUTES.login} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            Sign in
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to={ROUTES.register} className="mt-1 rounded-xl bg-brand-gradient px-4 py-3 text-center text-sm font-semibold text-white shadow-card">
                            Get started free
                          </Link>
                        </SheetClose>
                      </>
                    )}
                  </nav>

                  {/* Mobile footer */}
                  <div className="border-t p-4">
                    <p className="text-xs text-muted-foreground text-center">OneDW — Verified pros, instant booking</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

/* ════════════════════════════════════════════
   FOOTER
════════════════════════════════════════════ */
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/20 dark:bg-card/50">
      {/* Main footer grid */}
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        {/* Brand column */}
        <div className="space-y-4 lg:col-span-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
            Premium on-demand home services, booked in minutes. Verified pros, transparent pricing, and instant confirmation across India.
          </p>
          {/* Trust pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {['AI Verified', '4.9★ Rating', '50K+ Customers'].map((badge) => (
              <span key={badge} className="badge-primary text-xs">
                {badge}
              </span>
            ))}
          </div>
        </div>

        <FooterCol
          title="Services"
          links={[
            { label: 'Browse services', to: ROUTES.services },
            { label: 'Categories', to: ROUTES.categories },
            { label: 'Offers', to: ROUTES.offers },
            { label: 'Coupons', to: ROUTES.coupons },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { label: 'About us', to: ROUTES.about },
            { label: 'Help center', to: ROUTES.help },
            { label: 'FAQ', to: ROUTES.faq },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { label: 'Sign in', to: ROUTES.login },
            { label: 'Register', to: ROUTES.register },
            { label: 'Become a worker', to: ROUTES.register },
          ]}
        />
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/60 py-5">
        <div className="container flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>© {currentYear} OneDW Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to={ROUTES.help} className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to={ROUTES.help} className="hover:text-foreground transition-colors">Terms</Link>
            <Link to={ROUTES.help} className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-bold font-display text-foreground">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              to={l.to}
              className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground hover:translate-x-0.5 inline-block"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
