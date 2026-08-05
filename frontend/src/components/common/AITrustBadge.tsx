import { Chip } from '@mui/material';
import { Shield, ShieldAlert, ShieldOff } from 'lucide-react';

interface AITrustBadgeProps {
  riskLevel?: string;
  fraudScore?: number;
  isDisabled?: boolean;
  onClick: () => void;
  size?: 'small' | 'medium';
  className?: string;
}

export function AITrustBadge({ riskLevel, fraudScore, isDisabled, onClick, size = 'small', className }: AITrustBadgeProps) {
  if (isDisabled) {
    return (
      <Chip
        icon={<ShieldOff size={14} />}
        label="Bookings Disabled"
        size={size}
        onClick={onClick}
        className={className}
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: '9999px',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          border: '1px solid rgba(220,38,38,0.3)',
          '& .MuiChip-icon': { color: '#dc2626' },
          '&:hover': { backgroundColor: '#fee2e2' },
          cursor: 'pointer',
        }}
      />
    );
  }

  const level = riskLevel ?? 'low';
  const score = fraudScore ?? 0;
  const isSafe = level === 'low' && score < 30;

  if (isSafe) {
    return (
      <Chip
        icon={<Shield size={14} />}
        label="AI Trusted"
        size={size}
        onClick={onClick}
        className={className}
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: '9999px',
          backgroundColor: '#f0fdf4',
          color: '#16a34a',
          border: '1px solid rgba(22,163,74,0.3)',
          '& .MuiChip-icon': { color: '#16a34a' },
          '&:hover': { backgroundColor: '#dcfce7' },
          cursor: 'pointer',
        }}
      />
    );
  }

  const label = level === 'critical' ? 'Critical Risk' : level === 'high' ? 'High Risk' : 'Medium Risk';
  const isHigh = level === 'high' || level === 'critical';
  const bg = isHigh ? '#fef2f2' : '#fff7ed';
  const fg = isHigh ? '#dc2626' : '#ea580c';
  const borderColor = isHigh ? 'rgba(220,38,38,0.3)' : 'rgba(234,88,12,0.3)';
  const hoverBg = isHigh ? '#fee2e2' : '#ffedd5';

  return (
    <Chip
      icon={<ShieldAlert size={14} />}
      label={label}
      size={size}
      onClick={onClick}
      className={className}
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        borderRadius: '9999px',
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${borderColor}`,
        '& .MuiChip-icon': { color: fg },
        '&:hover': { backgroundColor: hoverBg },
        cursor: 'pointer',
      }}
    />
  );
}
