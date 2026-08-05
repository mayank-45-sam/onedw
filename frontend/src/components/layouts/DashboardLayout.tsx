import React, { useState, useEffect } from 'react';
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
  Megaphone,
  ChevronLeft,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, type MessageKey } from '@/contexts/LanguageContext';
import { ROUTES } from '@/constants/routes';
import { notificationService } from '@/services/notification.service';
import { queryKeys } from '@/lib/queryClient';
import { useSocket } from '@/hooks/useSocket';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { initials } from '@/utils/format';

interface NavItem {
  to: string;
  labelKey: MessageKey;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
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
    { to: ROUTES.adminBroadcasts, labelKey: 'nav.broadcasts', icon: Megaphone },
    { to: ROUTES.adminVerification, labelKey: 'nav.verification', icon: ShieldCheck },
    { to: ROUTES.adminFraudDashboard, labelKey: 'nav.fraudDetection', icon: ShieldAlert },
    { to: ROUTES.wallet, labelKey: 'nav.wallet', icon: Wallet },
    { to: ROUTES.notifications, labelKey: 'nav.notifications', icon: Bell },
    { to: ROUTES.profile, labelKey: 'nav.profile', icon: User },
    { to: ROUTES.settings, labelKey: 'nav.settings', icon: Settings },
  ],
};

function UnreadBadge() {
  const qc = useQueryClient();
  const { socket } = useSocket();

  const { data } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationService.unreadCount(),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!socket) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    socket.on('notification:new', refresh);
    return () => {
      socket.off('notification:new', refresh);
    };
  }, [socket, qc]);

  const count = data?.count ?? 0;
  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white ring-2 ring-background">
      {count > 9 ? '9+' : count}
    </span>
  );
}

const PANEL_KEY_BY_ROLE: Record<UserRole, MessageKey> = {
  customer: 'nav.customerPanel',
  worker: 'nav.workerPanel',
  admin: 'nav.adminPanel',
};

const ROLE_COLORS: Record<UserRole, string> = {
  customer: 'text-primary bg-primary/10',
  worker: 'text-accent bg-accent/10',
  admin: 'text-warning bg-warning/10',
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
        {/* Logo header */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/60 px-5">
          {wrap(<Link to={ROUTES.home} className="flex items-center gap-2 transition-opacity hover:opacity-80"><Logo /></Link>)}
        </div>

        {/* User card */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 border border-border/40 p-3">
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-background ring-offset-1 ring-offset-muted">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
                  {user ? initials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">{user?.name ?? 'User'}</p>
              <span className={cn('mt-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize', ROLE_COLORS[role])}>
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 scrollbar-thin">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return wrap(
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'nav-item relative',
                    (isActive && location.pathname.startsWith(item.to)) || (item.to === location.pathname)
                      ? 'nav-item-active'
                      : 'nav-item-idle'
                  )
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </NavLink>,
              item.to
            );
          })}
        </nav>

        {/* Bottom sign out */}
        <div className="shrink-0 border-t border-border/60 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-error/10 hover:text-error group"
          >
            <LogOut className="h-4.5 w-4.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {t('nav.signOut')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-muted/20 dark:bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card shadow-sm lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl lg:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 border-r">
                <SidebarContent inSheet />
              </SheetContent>
            </Sheet>

            {/* Breadcrumb-style panel title */}
            <div className="flex items-center gap-2">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', ROLE_COLORS[role])}>
                {role === 'admin' ? '⚡' : role === 'worker' ? '🔧' : '👤'}
              </div>
              <h1 className="hidden text-sm font-semibold text-foreground sm:block">
                {t(PANEL_KEY_BY_ROLE[role])}
              </h1>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
              <Link to={ROUTES.notifications}>
                <Bell className="h-5 w-5" />
                <UnreadBadge />
              </Link>
            </Button>
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" className="rounded-xl" aria-label="Profile">
              <Link to={ROUTES.profile}>
                <Avatar className="h-8 w-8 ring-2 ring-primary/15 ring-offset-1">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {user ? initials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
