import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, User, LogOut, LayoutDashboard } from 'lucide-react';
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  const dashboardLink =
    user?.role === 'admin' ? ROUTES.adminDashboard : user?.role === 'worker' ? ROUTES.workerDashboard : ROUTES.customerDashboard;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to={ROUTES.home} className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="Notifications">
                  <Link to={ROUTES.notifications}>
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="Profile">
                  <Link to={ROUTES.profile}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {user ? initials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </Button>
                <Button asChild size="sm" className="btn-glow hidden sm:flex rounded-full">
                  <Link to={dashboardLink}>
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-full hidden sm:flex">
                  <Link to={ROUTES.login}>Sign in</Link>
                </Button>
                <Button asChild size="sm" className="btn-glow rounded-full">
                  <Link to={ROUTES.register}>Get started</Link>
                </Button>
              </>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetClose asChild>
                  <Link to={ROUTES.home} className="mb-6 inline-block">
                    <Logo />
                  </Link>
                </SheetClose>
                <nav className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.to}>
                      <NavLink
                        to={link.to}
                        className={({ isActive }) =>
                          cn(
                            'rounded-xl px-4 py-2.5 text-sm font-medium transition',
                            isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                          )
                        }
                      >
                        {link.label}
                      </NavLink>
                    </SheetClose>
                  ))}
                  <div className="my-2 h-px bg-border" />
                  {isAuthenticated ? (
                    <>
                      <SheetClose asChild>
                        <Link to={dashboardLink} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted">
                          Dashboard
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to={ROUTES.profile} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted">
                          Profile
                        </Link>
                      </SheetClose>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-error hover:bg-error/10"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Link to={ROUTES.login} className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted">
                          Sign in
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to={ROUTES.register} className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground">
                          Get started
                        </Link>
                      </SheetClose>
                    </>
                  )}
                </nav>
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

function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Premium on-demand services, on your schedule. Verified pros, transparent pricing.
          </p>
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
      <div className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} OneDW. All rights reserved.</p>
          <p>Made with care for homeowners across India.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold font-display">{title}</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-sm text-muted-foreground transition hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
