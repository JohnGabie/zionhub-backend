import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Clock, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DeviceUsageResponse } from '@/lib/api/types';
import { formatHours, formatDuration } from '@/hooks/useAnalytics';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DeviceUsageChartProps {
  data: DeviceUsageResponse | null | undefined;
  isLoading: boolean;
}

const COLORS = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
];

export function DeviceUsageChart({ data, isLoading }: DeviceUsageChartProps) {
  // Prepare data for charts
  const dailyChartData = useMemo(() => {
    if (!data?.daily_usage) return [];

    return data.daily_usage.map((day) => ({
      date: format(parseISO(day.date), 'dd/MM', { locale: ptBR }),
      fullDate: day.date,
      hours: day.total_hours,
      seconds: day.total_seconds,
    }));
  }, [data?.daily_usage]);

  const devicePieData = useMemo(() => {
    if (!data?.by_device) return [];

    return data.by_device.slice(0, 8).map((device, index) => ({
      name: device.device_name,
      value: device.total_hours,
      seconds: device.total_seconds,
      sessions: device.session_count,
      color: COLORS[index % COLORS.length],
    }));
  }, [data?.by_device]);

  if (isLoading) {
    return <DeviceUsageLoadingSkeleton />;
  }

  if (!data || (data.by_device.length === 0 && data.daily_usage.length === 0)) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Sem dados de uso</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Nao ha dados de uso de dispositivos para este periodo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Usage Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Uso Diario
            <Badge variant="secondary" className="ml-auto">
              Total: {formatHours(data.total_hours)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${v}h`}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{d.fullDate}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDuration(d.seconds)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="hours"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem dados de uso diario
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Device Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Distribuicao por Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devicePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={devicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {devicePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{d.name}</p>
                            <p className="text-sm">
                              {formatDuration(d.seconds)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {d.sessions} sessoes
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados de dispositivos
              </p>
            )}
          </CardContent>
        </Card>

        {/* Device Ranking */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ranking de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.by_device.length > 0 ? (
              <div className="space-y-4">
                {data.by_device.slice(0, 6).map((device, index) => {
                  const percentage =
                    data.total_hours > 0
                      ? (device.total_hours / data.total_hours) * 100
                      : 0;

                  return (
                    <div key={device.device_id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground w-5">
                            #{index + 1}
                          </span>
                          <span className="truncate max-w-[150px]">
                            {device.device_name}
                          </span>
                        </div>
                        <span className="font-medium">
                          {formatHours(device.total_hours)}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{device.session_count} sessoes</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dispositivo usado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DeviceUsageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
