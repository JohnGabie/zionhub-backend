import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Clock,
  BarChart3,
  History,
  RefreshCw,
  CalendarIcon,
  Zap,
  Power,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAnalytics, formatHours } from '@/hooks/useAnalytics';
import { AnalyticsPeriod } from '@/lib/api/types';
import { TimelineView } from './history/TimelineView';
import { DeviceUsageChart } from './history/DeviceUsageChart';
import { RoutineHistory } from './history/RoutineHistory';

interface HistoryDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
];

export function HistoryDashboard({ open, onOpenChange }: HistoryDashboardProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const {
    deviceUsage,
    routineExecutions,
    timeline,
    summary,
    isLoading,
    selectedPeriod,
    setSelectedPeriod,
    selectedDate,
    setSelectedDate,
    refetchAll,
  } = useAnalytics({ enabled: open });

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setCalendarDate(date);
      setSelectedDate(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5" />
              Dashboard de Historico
            </DialogTitle>
            <div className="flex items-center gap-3">
              {activeTab !== 'timeline' && (
                <Select
                  value={selectedPeriod}
                  onValueChange={(v) => setSelectedPeriod(v as AnalyticsPeriod)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {activeTab === 'timeline' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-44 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(calendarDate, 'dd MMM yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={handleDateChange}
                      initialFocus
                      locale={ptBR}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={refetchAll}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Summary Cards */}
          <div className="px-3 sm:px-6 py-2 sm:py-4 bg-muted/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <SummaryCard
                title="Tempo Ligado"
                value={summary ? formatHours(summary.total_hours_on) : '-'}
                icon={Power}
                loading={isLoading}
              />
              <SummaryCard
                title="Sessoes"
                value={summary?.total_sessions?.toString() || '-'}
                icon={Activity}
                loading={isLoading}
              />
              <SummaryCard
                title="Rotinas Executadas"
                value={summary?.total_routine_executions?.toString() || '-'}
                icon={Zap}
                loading={isLoading}
              />
              <SummaryCard
                title="Dispositivos Ativos"
                value={summary?.active_devices?.toString() || '-'}
                icon={BarChart3}
                loading={isLoading}
              />
            </div>
          </div>

          {/* Tabs Content */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mx-3 sm:mx-6 mt-3 sm:mt-4 w-fit">
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Linha do Tempo
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dispositivos
              </TabsTrigger>
              <TabsTrigger value="routines" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Rotinas
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto px-3 sm:px-6 pb-4 sm:pb-6 min-h-0">
              <TabsContent value="timeline" className="mt-4">
                <TimelineView data={timeline} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="devices" className="mt-4">
                <DeviceUsageChart data={deviceUsage} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="routines" className="mt-4">
                <RoutineHistory data={routineExecutions} isLoading={isLoading} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  loading?: boolean;
}

function SummaryCard({ title, value, icon: Icon, loading }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-2.5 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
