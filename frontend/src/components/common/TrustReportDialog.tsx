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
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Briefcase,
  Star,
  Ban,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

interface TrustReportDialogProps {
  open: boolean;
  onClose: () => void;
  workerName: string;
  completedJobs: number;
  rating: number;
  trustScore?: number;
}

export function TrustReportDialog({ open, onClose, workerName, completedJobs, rating, trustScore = 96 }: TrustReportDialogProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const targetScore = Math.max(0, Math.min(100, trustScore));

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

  const items = [
    { label: 'Government ID', verified: true },
    { label: 'Face Verification', verified: true },
    { label: 'Phone Verification', verified: true },
  ];

  const stats = [
    { label: 'Completed Jobs', value: completedJobs.toString(), icon: <Briefcase size={16} /> },
    { label: 'Customer Rating', value: rating.toFixed(1), icon: <Star size={16} /> },
    { label: 'Cancellation Rate', value: '2%', icon: <Ban size={16} /> },
    { label: 'Pricing Behaviour', value: 'Fair', icon: <TrendingUp size={16} /> },
    { label: 'Fraud History', value: 'None', icon: <AlertTriangle size={16} /> },
    { label: 'Customer Complaints', value: '0', icon: <MessageSquare size={16} /> },
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
        <Shield size={22} color="#16a34a" />
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          AI Trust Report
        </Typography>
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
                color: '#16a34a',
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
              <Typography variant="h5" sx={{ fontWeight: 800, fontSize: '1.6rem', lineHeight: 1, color: '#16a34a' }}>
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
            label="Very Low Risk"
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.7rem',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid rgba(22,163,74,0.3)',
            }}
          />
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.85rem', color: '#374151' }}>
          Verification Status
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          {items.map((item) => (
            <Paper
              key={item.label}
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                borderColor: '#e5e7eb',
              }}
            >
              {item.verified ? (
                <CheckCircle2 size={18} color="#16a34a" />
              ) : (
                <XCircle size={18} color="#dc2626" />
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  {item.label}
                </Typography>
              </Box>
              <Chip
                label={item.verified ? 'Verified' : 'Pending'}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  height: 22,
                  backgroundColor: item.verified ? '#f0fdf4' : '#fef3c7',
                  color: item.verified ? '#16a34a' : '#d97706',
                }}
              />
            </Paper>
          ))}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.85rem', color: '#374151' }}>
          Performance & Trust Metrics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3 }}>
          {stats.map((stat) => (
            <Paper
              key={stat.label}
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                borderColor: '#e5e7eb',
              }}
            >
              <Box sx={{ color: '#16a34a', display: 'flex' }}>{stat.icon}</Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.65rem', display: 'block' }}>
                  {stat.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                  {stat.value}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.85rem', color: '#374151' }}>
          Trust Score Breakdown
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          {[
            { label: 'Identity Verification', value: 98 },
            { label: 'Work History', value: 95 },
            { label: 'Customer Feedback', value: 94 },
            { label: 'Pricing Consistency', value: 97 },
          ].map((item) => (
            <Box key={item.label}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#16a34a' }}>
                  {item.value}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.value}
                sx={{
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: '#e5e7eb',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#16a34a',
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: '#f0fdf4',
            border: '1px solid rgba(22,163,74,0.2)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a', mb: 0.5, fontSize: '0.8rem' }}>
            AI Recommendation
          </Typography>
          <Typography variant="body2" sx={{ color: '#374151', fontSize: '0.85rem', lineHeight: 1.5 }}>
            This worker is highly trusted. Safe to book.
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
            backgroundColor: '#16a34a',
            '&:hover': { backgroundColor: '#15803d' },
          }}
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
