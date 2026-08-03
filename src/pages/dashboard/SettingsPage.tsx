import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage, type MessageKey } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, type Lang } from '@/i18n/messages';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bell, Moon, Sun, Globe, Shield, LogOut, User, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROUTES } from '@/constants/routes';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({ push: true, email: true, sms: false });

  const handleLogout = () => {
    logout();
    toast.success(t('settings.signOut'));
    navigate(ROUTES.home);
  };

  const k = (key: MessageKey) => key;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <h3 className="font-semibold font-display">{t('settings.appearance')}</h3>
          <div className="mt-4 flex items-center justify-between">
            <Label htmlFor="theme" className="flex items-center gap-2 font-normal">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {t('settings.darkMode')}
            </Label>
            <Switch id="theme" checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Label className="flex items-center gap-2 font-normal"><Globe className="h-4 w-4" /> {t('settings.language')}</Label>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </motion.div>

      <Card className="p-6">
        <h3 className="font-semibold font-display">{t('settings.notifications')}</h3>
        <div className="mt-4 space-y-4">
          {([['push', k('settings.push')], ['email', k('settings.email')], ['sms', k('settings.sms')]] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-normal"><Bell className="h-4 w-4" /> {label}</Label>
              <Switch checked={notifications[key]} onCheckedChange={(v) => setNotifications((p) => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold font-display">{t('settings.account')}</h3>
        <div className="mt-4 space-y-1">
          <Button variant="ghost" className="w-full justify-between rounded-xl" onClick={() => navigate(ROUTES.profile)}>
            <span className="flex items-center gap-2"><User className="h-4 w-4" /> {t('settings.editProfile')}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full justify-between rounded-xl" onClick={() => navigate(ROUTES.privacySecurity)}>
            <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> {t('settings.privacySecurity')}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 border-t pt-4">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2 rounded-xl text-error hover:bg-error/10 hover:text-error">
            <LogOut className="h-4 w-4" /> {t('settings.signOut')}
          </Button>
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">{t('settings.signedInAs', { email: user?.email ?? '' })}</p>
    </div>
  );
}
