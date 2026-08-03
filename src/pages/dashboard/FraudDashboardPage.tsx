import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Shield,
  AlertTriangle,
  Ban,
  SearchCheck,
  Activity,
  RefreshCw,
  UserX,
  CheckCircle2,
  Eye,
  Radar,
  Gauge,
} from 'lucide-react';
import { fraudService } from '@/services/fraud.service';
import type { FraudAnalysisResult } from '@/types/fraud';

function getRiskColor(level: string): string {
  switch (level) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#16a34a';
    default: return '#6b7280';
  }
}

function getRiskBg(level: string): string {
  switch (level) {
    case 'critical': return '#fef2f2';
    case 'high': return '#fff7ed';
    case 'medium': return '#fefce8';
    case 'low': return '#f0fdf4';
    default: return '#f9fafb';
  }
}

function getScoreColor(score: number): string {
  if (score >= 95) return '#dc2626';
  if (score >= 80) return '#ea580c';
  if (score >= 50) return '#ca8a04';
  return '#16a34a';
}

function getRecommendationIcon(rec: string) {
  switch (rec) {
    case 'permanent_ban': return <Ban size={16} />;
    case 'temporary_suspend': return <UserX size={16} />;
    case 'warn': return <AlertTriangle size={16} />;
    case 'monitor': return <Activity size={16} />;
    default: return <CheckCircle2 size={16} />;
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#16a34a';
    default: return '#6b7280';
  }
}

function FraudScoreGauge({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={60}
          thickness={5}
          sx={{ color: '#e5e7eb', position: 'absolute' }}
        />
        <CircularProgress
          variant="determinate"
          value={score}
          size={60}
          thickness={5}
          sx={{ color, transform: 'rotate(-90deg)' }}
        />
        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 14 }}>
            {score}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function ScoreBreakdownChart({ breakdown }: { breakdown: FraudAnalysisResult['score_breakdown'] }) {
  if (!breakdown) return null;
  const items = [
    { label: 'Fake Reviews', value: breakdown.fake_reviews_score, key: 'fake_reviews' },
    { label: 'Cancellations', value: breakdown.cancellation_score, key: 'cancellations' },
    { label: 'Price Changes', value: breakdown.price_change_score, key: 'price_changes' },
    { label: 'Complaints', value: breakdown.complaint_score, key: 'complaints' },
    { label: 'Suspicious Login', value: breakdown.suspicious_login_score, key: 'suspicious_logins' },
    { label: 'Duplicate Phone', value: breakdown.duplicate_phone_score, key: 'duplicate_phone' },
    { label: 'Duplicate Device', value: breakdown.duplicate_device_score, key: 'duplicate_device' },
    { label: 'Fake Profile', value: breakdown.fake_profile_score, key: 'fake_profile' },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {items.map((item) => (
        <Box key={item.key} sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.value.toFixed(0)}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={item.value}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#e5e7eb',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getScoreColor(item.value),
                borderRadius: 3,
              },
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

function RiskBadge({ level }: { level: string }) {
  const color = getRiskColor(level);
  const bg = getRiskBg(level);
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: bg,
        color,
        fontWeight: 600,
        fontSize: '0.75rem',
        border: `1px solid ${color}20`,
        '& .MuiChip-icon': { color },
      }}
      icon={level === 'critical' || level === 'high' ? <AlertTriangle size={14} /> : <Shield size={14} />}
    />
  );
}

function StatCard({ title, value, icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: `0 0 0 1px ${color}20, 0 4px 12px ${color}10`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 0 0 1px ${color}30, 0 8px 24px ${color}20`,
        },
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: `${color}10`,
              color,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function WorkerDetailDialog({ open, onClose, workerId }: {
  open: boolean;
  onClose: () => void;
  workerId: string | null;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['fraud-report', workerId],
    queryFn: () => fraudService.report(workerId!),
    enabled: !!workerId,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Shield size={20} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Fraud Analysis Report</Typography>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load fraud report</Alert>
        ) : data ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                {data.worker_name.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{data.worker_name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <RiskBadge level={data.risk_level} />
                  {data.is_disabled && (
                    <Chip
                      label="Bookings Disabled"
                      size="small"
                      color="error"
                      icon={<Ban size={14} />}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <FraudScoreGauge score={data.fraud_score} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Fraud Score
                </Typography>
              </Box>
            </Box>

            {data.report?.reason && (
              <Alert
                severity={data.risk_level === 'critical' || data.risk_level === 'high' ? 'error' : 'warning'}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                <Typography variant="body2">{data.report.reason}</Typography>
              </Alert>
            )}

            {data.report?.recommendation && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                {getRecommendationIcon(data.report.recommendation)}
                <Box>
                  <Typography variant="caption" color="text.secondary">Recommendation</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {data.report.recommendation.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Typography>
                </Box>
                {data.report.confidence !== undefined && data.report.confidence > 0 && (
                  <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">AI Confidence</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {data.report.confidence}%
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, mt: 2 }}>
              Score Breakdown
            </Typography>
            {data.score_breakdown && <ScoreBreakdownChart breakdown={data.score_breakdown} />}

            {data.suspicious_activities.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, mt: 3 }}>
                  Suspicious Activities ({data.suspicious_activities.length})
                </Typography>
                {data.suspicious_activities.map((activity) => (
                  <Paper
                    key={activity.id}
                    variant="outlined"
                    sx={{ p: 1.5, mb: 1, borderRadius: 2, borderColor: `${getSeverityColor(activity.severity)}30` }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={activity.activity_type.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          backgroundColor: `${getSeverityColor(activity.severity)}10`,
                          color: getSeverityColor(activity.severity),
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      />
                      <Chip
                        label={activity.severity}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: getSeverityColor(activity.severity),
                          color: getSeverityColor(activity.severity),
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                    {activity.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {activity.description}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </>
            )}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function FraudDashboardPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [analyzeDialog, setAnalyzeDialog] = useState(false);
  const [analyzeWorkerId, setAnalyzeWorkerId] = useState('');
  const [detailWorkerId, setDetailWorkerId] = useState<string | null>(null);
  const [minScore] = useState(50);

  const { data, isLoading, error } = useQuery({
    queryKey: ['high-risk-workers', page, rowsPerPage, minScore],
    queryFn: () => fraudService.highRisk({
      min_score: minScore,
      page: page + 1,
      limit: rowsPerPage,
    }),
  });

  const analyzeMutation = useMutation({
    mutationFn: ({ workerId, reason }: { workerId: string; reason?: string }) =>
      fraudService.analyze(workerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['high-risk-workers'] });
      setAnalyzeDialog(false);
      setAnalyzeWorkerId('');
    },
  });

  const triggerAnalyzeMutation = useMutation({
    mutationFn: (workerId: string) => fraudService.analyze(workerId, 'Manual trigger from dashboard'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['high-risk-workers'] });
      queryClient.invalidateQueries({ queryKey: ['fraud-report'] });
    },
  });

  const highRiskCount = data?.workers.filter(w => w.risk_level === 'high' || w.risk_level === 'critical').length ?? 0;
  const criticalCount = data?.workers.filter(w => w.risk_level === 'critical').length ?? 0;
  const disabledCount = data?.workers.filter(w => w.is_disabled).length ?? 0;

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield size={24} />
            Fraud Detection Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            AI-powered fraud analysis and risk monitoring for workers
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<SearchCheck size={16} />}
            onClick={() => setAnalyzeDialog(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Analyze Worker
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['high-risk-workers'] })}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard
          title="Total Analyzed"
          value={data?.total ?? 0}
          icon={<Radar size={20} />}
          color="#6366f1"
          subtitle="Workers monitored"
        />
        <StatCard
          title="High Risk"
          value={highRiskCount}
          icon={<AlertTriangle size={20} />}
          color="#ea580c"
          subtitle={`${criticalCount} critical`}
        />
        <StatCard
          title="Bookings Disabled"
          value={disabledCount}
          icon={<Ban size={20} />}
          color="#dc2626"
          subtitle="Auto-suspended accounts"
        />
        <StatCard
          title="Avg Score"
          value={data?.workers.length ? Math.round(data.workers.reduce((a, w) => a + w.fraud_score, 0) / data.workers.length) : 0}
          icon={<Gauge size={20} />}
          color="#ca8a04"
          subtitle="High-risk average"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          Failed to load fraud data. Please try again.
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, boxShadow: '0 0 0 1px #00000010, 0 4px 12px #00000008' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Worker</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Fraud Score</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Risk Level</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Complaints</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Suspicious</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Recommendation</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Loading fraud data...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : !data || data.workers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Shield size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <Typography variant="body1" color="text.secondary">
                        No workers with fraud score above {minScore}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try lowering the minimum score threshold
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.workers.map((worker) => (
                    <TableRow
                      key={worker.worker_id}
                      sx={{
                        '&:hover': { backgroundColor: '#f9fafb' },
                        transition: 'background-color 0.2s',
                        opacity: worker.is_disabled ? 0.7 : 1,
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar src={worker.worker_avatar} sx={{ width: 36, height: 36 }}>
                            {worker.worker_name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {worker.worker_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {worker.worker_profession ?? 'Worker'}
                            </Typography>
                          </Box>
                          {worker.is_disabled && (
                            <Tooltip title="Bookings disabled">
                              <Ban size={14} color="#dc2626" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FraudScoreGauge score={worker.fraud_score} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: getScoreColor(worker.fraud_score) }}>
                            {worker.fraud_score.toFixed(1)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <RiskBadge level={worker.risk_level} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={worker.complaint_count}
                          size="small"
                          color={worker.complaint_count > 0 ? 'error' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={worker.suspicious_activity_count}
                          size="small"
                          color={worker.suspicious_activity_count > 0 ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {worker.recommendation ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {getRecommendationIcon(worker.recommendation)}
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {worker.recommendation.replace(/_/g, ' ')}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Report">
                            <IconButton
                              size="small"
                              onClick={() => setDetailWorkerId(worker.worker_id)}
                              sx={{ borderRadius: 1.5 }}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Run AI Analysis">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => triggerAnalyzeMutation.mutate(worker.worker_id)}
                                disabled={triggerAnalyzeMutation.isPending}
                                sx={{ borderRadius: 1.5 }}
                              >
                                <RefreshCw
                                  size={16}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </CardContent>
      </Card>

      <Dialog open={analyzeDialog} onClose={() => { if (!analyzeMutation.isPending) { setAnalyzeDialog(false); setAnalyzeWorkerId(''); } }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchCheck size={20} />
          Analyze Worker for Fraud
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a worker ID to trigger an AI-powered fraud analysis. This will calculate a fraud score,
            identify suspicious activities, and provide a recommendation.
          </Typography>
          <TextField
            fullWidth
            label="Worker ID"
            value={analyzeWorkerId}
            onChange={(e) => setAnalyzeWorkerId(e.target.value)}
            placeholder="Enter worker ID..."
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAnalyzeDialog(false); setAnalyzeWorkerId(''); }} disabled={analyzeMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => analyzeMutation.mutate({ workerId: analyzeWorkerId, reason: 'Manual analysis from dashboard' })}
            disabled={!analyzeWorkerId || analyzeMutation.isPending}
            startIcon={analyzeMutation.isPending ? <CircularProgress size={16} /> : <SearchCheck size={16} />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze'}
          </Button>
        </DialogActions>
      </Dialog>

      <WorkerDetailDialog
        open={!!detailWorkerId}
        onClose={() => setDetailWorkerId(null)}
        workerId={detailWorkerId}
      />
    </Box>
  );
}
