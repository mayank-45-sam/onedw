import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Bell,
  Star,
  Settings,
  User,
  MessageSquare,
  Ticket,
  Percent,
  LogOut,
  Menu,
  Sparkles,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, type MessageKey } from '@/contexts/LanguageContext';
import { ROUTES } from '@/constants/routes';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { initials } from '@/utils/format';

interface NavItem {
  to: string;
  labelKey: MessageKey;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  customer: [
    { to: ROUTES.customerDashboard, labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: ROUTES.booking, labelKey: 'nav.newBooking', icon: Sparkles },
    { to: ROUTES.reviews, labelKey: 'nav.reviews', icon: Star },
    { to: ROUTES.wallet, labelKey: 'nav.wallet', icon: Wallet },
    { to: ROUTES.coupons, labelKey: 'nav.coupons', icon: Ticket },
    { to: ROUTES.offers, labelKey: 'nav.offers', icon: Percent },
    { to: ROUTES.chat, labelKey: 'nav.chat', icon: MessageSquare },
    { to: ROUTES.notifications, labelKey: 'nav.notifications', icon: Bell },
    { to: ROUTES.profile, labelKey: 'nav.profile', icon: User },
    { to: ROUTES.settings, labelKey: 'nav.settings', icon: Settings },
  ],
  worker: [
    { to: ROUTES.workerDashboard, labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: ROUTES.wallet, labelKey: 'nav.wallet', icon: Wallet },
    { to: ROUTES.chat, labelKey: 'nav.chat', icon: MessageSquare },
    { to: ROUTES.notifications, labelKey: 'nav.notifications', icon: Bell },
    { to: ROUTES.profile, labelKey: 'nav.profile', icon: User },
    { to: ROUTES.settings, labelKey: 'nav.settings', icon: Settings },
  ],
  admin: [
    { to: ROUTES.adminDashboard, labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: ROUTES.adminVerification, labelKey: 'nav.verification', icon: ShieldCheck },
    { to: ROUTES.adminFraudDashboard, labelKey: 'nav.fraudDetection', icon: ShieldAlert },
    { to: ROUTES.wallet, labelKey: 'nav.wallet', icon: Wallet },
    { to: ROUTES.notifications, labelKey: 'nav.notifications', icon: Bell },
    { to: ROUTES.profile, labelKey: 'nav.profile', icon: User },
    { to: ROUTES.settings, labelKey: 'nav.settings', icon: Settings },
  ],
};

const PANEL_KEY_BY_ROLE: Record<UserRole, MessageKey> = {
  customer: 'nav.customerPanel',
  worker: 'nav.workerPanel',
  admin: 'nav.adminPanel',
};

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role ?? 'customer';
  const nav = NAV_BY_ROLE[role];

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  const SidebarContent = ({ inSheet = false }: { inSheet?: boolean }) => {
    const wrap = (children: React.ReactNode, key?: string) =>
      inSheet ? <SheetClose asChild key={key}>{children}</SheetClose> : <React.Fragment key={key}>{children}</React.Fragment>;

    return (
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center px-5">
          {wrap(<Link to={ROUTES.home}><Logo /></Link>)}
        </div>
        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {user ? initials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name ?? 'User'}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{role}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return wrap(
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive || active ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4.5 w-4.5" />
                {t(item.labelKey)}
              </NavLink>,
              item.to
            );
          })}
        </nav>
        <div className="border-t p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-error transition hover:bg-error/10"
          >
            <LogOut className="h-4 w-4" /> {t('nav.signOut')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarContent inSheet />
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold font-display">{t(PANEL_KEY_BY_ROLE[role])}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="rounded-full relative" aria-label="Notifications">
              <Link to={ROUTES.notifications}>
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />
              </Link>
            </Button>
            <ThemeToggle />
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
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
