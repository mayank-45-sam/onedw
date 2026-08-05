import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  ShieldAlert,
  AlertTriangle,
  XCircle,
  Ban,
  TrendingUp,
  MessageSquare,
  UserX,
} from 'lucide-react';

interface HighRiskWarningDialogProps {
  open: boolean;
  onClose: () => void;
  workerName?: string;
  isDemo?: boolean;
}

export function HighRiskWarningDialog({ open, onClose, workerName = 'Rahul Kumar', isDemo }: HighRiskWarningDialogProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const targetScore = 40;

  useEffect(() => {
    if (!open) {
      setAnimatedScore(0);
      return;
    }
    const duration = 1500;
    const steps = 30;
    const increment = targetScore / steps;
    const interval = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setAnimatedScore(targetScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, interval);
    return () => clearInterval(timer);
  }, [open]);

  const warnings = [
    { icon: <MessageSquare size={16} />, text: 'Multiple customer complaints' },
    { icon: <Ban size={16} />, text: '8 cancelled bookings in last month' },
    { icon: <TrendingUp size={16} />, text: 'Unusual pricing detected' },
    { icon: <UserX size={16} />, text: 'Fake review pattern suspected' },
    { icon: <XCircle size={16} />, text: 'Government ID pending verification' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxWidth: 520,
          overflow: 'visible',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <ShieldAlert size={22} color="#dc2626" />
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#dc2626' }}>
          {isDemo ? 'Demo: High Risk Worker' : 'Risk Warning'}
        </Typography>
        {isDemo && (
          <Chip
            label="DEMO"
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.6rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid rgba(220,38,38,0.3)',
              ml: 'auto',
            }}
          />
        )}
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, mt: 1 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={100}
              thickness={4}
              sx={{ color: '#e5e7eb', position: 'absolute' }}
            />
            <CircularProgress
              variant="determinate"
              value={animatedScore}
              size={100}
              thickness={4}
              sx={{
                color: '#dc2626',
                transform: 'rotate(-90deg)',
                transition: 'none',
              }}
            />
            <Box
              sx={{
                top: 0, left: 0, bottom: 0, right: 0,
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, fontSize: '1.6rem', lineHeight: 1, color: '#dc2626' }}>
                {animatedScore}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: 500 }}>
                / 100
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', mb: 0.5 }}>
            {workerName}
          </Typography>
          <Chip
            label="High Risk"
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.7rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid rgba(220,38,38,0.3)',
              '& .MuiChip-icon': { color: '#dc2626' },
              mb: 1,
            }}
            icon={<AlertTriangle size={14} />}
          />
          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.75rem', textAlign: 'center' }}>
            Electrician · 18 jobs completed · 3.4 rating
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.85rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AlertTriangle size={16} />
          Warnings Detected
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          {warnings.map((warning, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                borderColor: '#fecaca',
                backgroundColor: '#fef2f2',
                animation: open ? `slideIn 0.3s ease-out ${index * 0.08}s both` : 'none',
                '@keyframes slideIn': {
                  from: { opacity: 0, transform: 'translateX(-10px)' },
                  to: { opacity: 1, transform: 'translateX(0)' },
                },
              }}
            >
              <Box sx={{ color: '#dc2626', display: 'flex' }}>{warning.icon}</Box>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', color: '#7f1d1d' }}>
                {warning.text}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.85rem', color: '#374151' }}>
          Trust Score Breakdown
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          {[
            { label: 'Identity Verification', value: 35 },
            { label: 'Work History', value: 45 },
            { label: 'Customer Feedback', value: 30 },
            { label: 'Pricing Consistency', value: 50 },
          ].map((item) => (
            <Box key={item.label}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#dc2626' }}>
                  {item.value}%
                </Typography>
              </Box>
              <Box sx={{ position: 'relative', height: 5, borderRadius: 3, backgroundColor: '#e5e7eb' }}>
                <Box
                  sx={{
                    width: `${item.value}%`,
                    height: '100%',
                    borderRadius: 3,
                    backgroundColor: '#dc2626',
                    transition: 'width 1s ease-out',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: '#fef2f2',
            border: '1px solid rgba(220,38,38,0.2)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#dc2626', mb: 0.5, fontSize: '0.8rem' }}>
            AI Recommendation
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f1d1d', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Book another verified worker. Manual verification required.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: '#dc2626',
            '&:hover': { backgroundColor: '#b91c1c' },
          }}
        >
          Understood
        </Button>
      </DialogActions>
    </Dialog>
  );
}
