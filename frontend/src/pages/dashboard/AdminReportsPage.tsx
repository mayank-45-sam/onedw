import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Calendar, Download, Loader2, Filter } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<string>('bookings');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'reports', { type: reportType, from: dateFrom, to: dateTo }],
    queryFn: () => adminService.reports({ type: reportType, from: dateFrom, to: dateTo }),
    enabled: false,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    await refetch();
    setIsGenerating(false);
  };

  const handleDownload = () => {
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  const reportTypes = [
    { value: 'bookings', label: 'Bookings Report' },
    { value: 'revenue', label: 'Revenue Report' },
    { value: 'workers', label: 'Workers Report' },
    { value: 'customers', label: 'Customers Report' },
    { value: 'services', label: 'Services Report' },
    { value: 'complaints', label: 'Complaints Report' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Reports</h1>
        <p className="text-muted-foreground">Generate and download platform reports.</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4" /> Generate Report
                </>
              )}
            </Button>
            {data?.url && (
              <Button
                onClick={handleDownload}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" /> Download
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isLoading && (
        <LoadingState title="Generating report..." />
      )}

      {isError && (
        <ErrorState
          title="Failed to generate report"
          icon={<FileText className="h-8 w-8" />}
        />
      )}

      {data?.url && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 border-success/30 bg-success/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Report Ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Your {reportTypes.find((t) => t.value === reportType)?.label} has been generated.
                  </p>
                </div>
              </div>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {!data?.url && !isLoading && !isError && (
        <EmptyState
          title="No report generated"
          description="Select a report type and date range to generate a report."
          icon={<FileText className="h-8 w-8" />}
        />
      )}
    </div>
  );
}
