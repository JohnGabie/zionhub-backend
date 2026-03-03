import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Power,
  PowerOff,
  Zap,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  Clock,
  Activity,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimelineResponse, TimelineEvent, TimelineSession } from '@/lib/api/types';
import { formatDuration } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

interface TimelineViewProps {
  data: TimelineResponse | null | undefined;
  isLoading: boolean;
}

const EVENT_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  device_on: { icon: Power, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  device_off: { icon: PowerOff, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  device_added: { icon: Plus, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  device_updated: { icon: Edit, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  device_deleted: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  routine_executed: { icon: Zap, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  routine_created: { icon: Plus, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  routine_updated: { icon: Edit, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  routine_deleted: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  routine_activated: { icon: ToggleLeft, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  routine_deactivated: { icon: ToggleLeft, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
  master_switch: { icon: Power, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

const DEFAULT_CONFIG = { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' };

export function TimelineView({ data, isLoading }: TimelineViewProps) {
  // Group events by hour for better visualization
  const groupedEvents = useMemo(() => {
    if (!data?.events) return [];

    const groups: { hour: string; events: TimelineEvent[] }[] = [];
    let currentHour = '';

    for (const event of data.events) {
      const eventDate = parseISO(event.datetime);
      const hour = format(eventDate, 'HH:00');

      if (hour !== currentHour) {
        groups.push({ hour, events: [event] });
        currentHour = hour;
      } else {
        groups[groups.length - 1].events.push(event);
      }
    }

    return groups;
  }, [data?.events]);

  if (isLoading) {
    return <TimelineLoadingSkeleton />;
  }

  if (!data || (data.events.length === 0 && data.sessions.length === 0)) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma atividade</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Nao ha eventos registrados para esta data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Timeline de Eventos */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Eventos do Dia
            <Badge variant="secondary" className="ml-auto">
              {data.events.length} eventos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum evento registrado
            </p>
          ) : (
            <div className="space-y-6">
              {groupedEvents.map((group) => (
                <div key={group.hour}>
                  <Badge variant="outline" className="font-mono mb-2">
                    {group.hour}
                  </Badge>
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    {group.events.map((event) => (
                      <TimelineEventItem key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessoes de Dispositivos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Power className="h-4 w-4" />
            Sessoes de Dispositivos
            <Badge variant="secondary" className="ml-auto">
              {data.sessions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma sessao registrada
              </p>
            ) : (
              data.sessions.map((session, idx) => (
                <SessionCard key={idx} session={session} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineEventItem({ event }: { event: TimelineEvent }) {
  const config = EVENT_CONFIG[event.type] || DEFAULT_CONFIG;
  const Icon = config.icon;
  const eventTime = format(parseISO(event.datetime), 'HH:mm:ss');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
            <div className={cn('p-2 rounded-full', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{event.title}</p>
              {event.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {event.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {eventTime}
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <div className="space-y-1">
            <p className="font-medium">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground">{event.description}</p>
            )}
            {event.device_name && (
              <p className="text-xs">Dispositivo: {event.device_name}</p>
            )}
            {event.routine_name && (
              <p className="text-xs">Rotina: {event.routine_name}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SessionCard({ session }: { session: TimelineSession }) {
  const startTime = format(parseISO(session.started_at), 'HH:mm');
  const endTime = session.ended_at
    ? format(parseISO(session.ended_at), 'HH:mm')
    : 'Agora';

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm truncate">{session.device_name}</span>
        {session.is_active ? (
          <Badge variant="default" className="bg-green-600">
            Ligado
          </Badge>
        ) : (
          <Badge variant="secondary">Finalizado</Badge>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">
          {startTime} - {endTime}
        </span>
        {session.duration_seconds && (
          <span className="font-medium">
            {formatDuration(session.duration_seconds)}
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              session.is_active ? 'bg-green-500 animate-pulse' : 'bg-primary'
            )}
            style={{
              width: session.is_active
                ? '100%'
                : `${Math.min(100, (session.duration_seconds || 0) / 36)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TimelineLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
