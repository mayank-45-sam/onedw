import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Fingerprint, MapPin, Eye, Users, Shield, Database, Lock, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import { useLanguage, type MessageKey } from '@/contexts/LanguageContext';

interface ToggleRowProps {
  icon: React.ReactNode;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon, titleKey, descriptionKey, checked, onChange }: ToggleRowProps) {
  const { t } = useLanguage();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <Label className="font-medium">{t(titleKey)}</Label>
          <p className="text-xs text-muted-foreground">{t(descriptionKey)}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function PrivacySecurityPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState({
    twoFactor: false,
    locationSharing: true,
    profileVisibility: true,
    onlineStatus: true,
    dataAnalytics: true,
    directMessages: true,
  });

  const set = (key: keyof typeof prefs) => (v: boolean) => {
    setPrefs((p) => ({ ...p, [key]: v }));
    toast.success(t(v ? 'common.enabled' : 'common.disabled'));
  };

  const handleDeleteAccount = () => {
    toast.error(t('privacy.deleteHint'));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground" onClick={() => navigate(ROUTES.settings)}>
          <ArrowLeft className="h-4 w-4" /> {t('privacy.back')}
        </Button>
        <h1 className="text-2xl font-bold font-display">{t('privacy.title')}</h1>
        <p className="text-muted-foreground">{t('privacy.subtitle')}</p>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold font-display">{t('privacy.security')}</h3>
        <div className="mt-2 divide-y">
          <ToggleRow
            icon={<Fingerprint className="h-4 w-4" />}
            titleKey="privacy.twoFactor"
            descriptionKey="privacy.twoFactorDesc"
            checked={prefs.twoFactor}
            onChange={set('twoFactor')}
          />
          <ToggleRow
            icon={<Lock className="h-4 w-4" />}
            titleKey="privacy.requireLogin"
            descriptionKey="privacy.requireLoginDesc"
            checked={prefs.directMessages}
            onChange={set('directMessages')}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold font-display">{t('privacy.privacy')}</h3>
        <div className="mt-2 divide-y">
          <ToggleRow
            icon={<Eye className="h-4 w-4" />}
            titleKey="privacy.publicProfile"
            descriptionKey="privacy.publicProfileDesc"
            checked={prefs.profileVisibility}
            onChange={set('profileVisibility')}
          />
          <ToggleRow
            icon={<Users className="h-4 w-4" />}
            titleKey="privacy.onlineStatus"
            descriptionKey="privacy.onlineStatusDesc"
            checked={prefs.onlineStatus}
            onChange={set('onlineStatus')}
          />
          <ToggleRow
            icon={<MapPin className="h-4 w-4" />}
            titleKey="privacy.shareLocation"
            descriptionKey="privacy.shareLocationDesc"
            checked={prefs.locationSharing}
            onChange={set('locationSharing')}
          />
          <ToggleRow
            icon={<Database className="h-4 w-4" />}
            titleKey="privacy.analytics"
            descriptionKey="privacy.analyticsDesc"
            checked={prefs.dataAnalytics}
            onChange={set('dataAnalytics')}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold font-display">{t('privacy.dangerZone')}</h3>
        <div className="mt-3">
          <Button variant="ghost" onClick={handleDeleteAccount} className="w-full justify-start gap-2 rounded-xl text-error hover:bg-error/10 hover:text-error">
            <Trash2 className="h-4 w-4" /> {t('privacy.deleteAccount')}
          </Button>
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Shield className="mr-1 inline h-3.5 w-3.5" /> {t('privacy.footer')}
      </p>
    </div>
  );
}

