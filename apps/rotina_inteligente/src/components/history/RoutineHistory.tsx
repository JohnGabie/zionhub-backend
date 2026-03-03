import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { RoutineExecutionsResponse, RoutineExecutionItem } from '@/lib/api/types';
import { formatDuration } from '@/hooks/useAnalytics';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RoutineHistoryProps {
  data: RoutineExecutionsResponse | null | undefined;
  isLoading: boolean;
}

export function RoutineHistory({ data, isLoading }: RoutineHistoryProps) {
  const [filterRoutine, setFilterRoutine] = useState<string>('all');

  const routineOptions = useMemo(() => {
    if (!data?.stats_by_routine) return [];
    return data.stats_by_routine.map((stat) => ({
      value: stat.routine_id,
      label: stat.routine_name,
    }));
  }, [data?.stats_by_routine]);

  const filteredExecutions = useMemo(() => {
    if (!data?.executions) return [];
    if (filterRoutine === 'all') return data.executions;
    return data.executions.filter((e) => e.routine_id === filterRoutine);
  }, [data?.executions, filterRoutine]);

  const overallStats = useMemo(() => {
    if (!data?.stats_by_routine) return { success: 0, failed: 0, rate: 0 };
    const totals = data.stats_by_routine.reduce(
      (acc, stat) => ({
        success: acc.success + stat.successful,
        failed: acc.failed + stat.failed,
      }),
      { success: 0, failed: 0 }
    );
    const total = totals.success + totals.failed;
    return {
      ...totals,
      rate: total > 0 ? (totals.success / total) * 100 : 0,
    };
  }, [data?.stats_by_routine]);

  if (isLoading) {
    return <RoutineHistoryLoadingSkeleton />;
  }

  if (!data || data.executions.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Sem execucoes</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Nao ha execucoes de rotinas para este periodo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Execucoes</p>
                <p className="text-2xl font-bold">{data.total_executions}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sucesso / Falha</p>
                <p className="text-2xl font-bold">
                  <span className="text-green-500">{overallStats.success}</span>
                  {' / '}
                  <span className="text-red-500">{overallStats.failed}</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{overallStats.rate.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stats by Routine */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Estatisticas por Rotina
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.stats_by_routine.length > 0 ? (
              <div className="space-y-4">
                {data.stats_by_routine.map((stat) => (
                  <div key={stat.routine_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px] font-medium">
                        {stat.routine_name}
                      </span>
                      <span className="text-muted-foreground">
                        {stat.total_executions} exec.
                      </span>
                    </div>
                    <Progress value={stat.success_rate} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        <span className="text-green-500">{stat.successful}</span>
                        {' / '}
                        <span className="text-red-500">{stat.failed}</span>
                      </span>
                      <span>{stat.success_rate.toFixed(0)}% sucesso</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem estatisticas disponiveis
              </p>
            )}
          </CardContent>
        </Card>

        {/* Execution List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Historico de Execucoes
              </CardTitle>
              {routineOptions.length > 0 && (
                <Select value={filterRoutine} onValueChange={setFilterRoutine}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {routineOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <div className="px-6 pb-4 space-y-2">
                {filteredExecutions.length > 0 ? (
                  filteredExecutions.map((execution) => (
                    <ExecutionItem key={execution.id} execution={execution} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma execucao encontrada
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ExecutionItemProps {
  execution: RoutineExecutionItem;
}

function ExecutionItem({ execution }: ExecutionItemProps) {
  const formattedDate = useMemo(() => {
    try {
      return format(parseISO(execution.executed_at), "dd/MM HH:mm", {
        locale: ptBR,
      });
    } catch {
      return execution.executed_at;
    }
  }, [execution.executed_at]);

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-3">
        {execution.success ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[150px]">
            {execution.routine_name}
          </p>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {execution.duration_ms !== undefined && (
          <span className="text-xs text-muted-foreground">
            {formatDuration(Math.round(execution.duration_ms / 1000))}
          </span>
        )}
        {execution.trigger_type && (
          <Badge variant="outline" className="text-xs">
            {execution.trigger_type === 'scheduled' ? 'Agendado' :
             execution.trigger_type === 'manual' ? 'Manual' :
             execution.trigger_type}
          </Badge>
        )}
      </div>
    </div>
  );
}

function RoutineHistoryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
