import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Power,
  PowerOff,
  Plus,
  Pencil,
  Trash2,
  Play,
  Calendar,
  Clock,
  Zap,
  X,
  BarChart3
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityLog, ActivityType } from '@/types/activity';
import { cn } from '@/lib/utils';
import { HistoryDashboard } from './HistoryDashboard';

interface ActivityLogPanelProps {
  logs: ActivityLog[];
  onClear: () => void;
}

const activityConfig: Record<ActivityType, { icon: typeof Power; color: string; label: string }> = {
  device_on: { icon: Power, color: 'text-primary', label: 'Ligado' },
  device_off: { icon: PowerOff, color: 'text-muted-foreground', label: 'Desligado' },
  device_added: { icon: Plus, color: 'text-primary', label: 'Adicionado' },
  device_updated: { icon: Pencil, color: 'text-accent', label: 'Atualizado' },
  device_deleted: { icon: Trash2, color: 'text-destructive', label: 'Removido' },
  routine_activated: { icon: Play, color: 'text-primary', label: 'Ativada' },
  routine_deactivated: { icon: PowerOff, color: 'text-muted-foreground', label: 'Desativada' },
  routine_created: { icon: Plus, color: 'text-primary', label: 'Criada' },
  routine_updated: { icon: Pencil, color: 'text-accent', label: 'Atualizada' },
  routine_deleted: { icon: Trash2, color: 'text-destructive', label: 'Removida' },
  routine_executed: { icon: Zap, color: 'text-accent', label: 'Executada' },
  master_switch: { icon: Zap, color: 'text-primary', label: 'Master Switch' },
};

function ActivityItem({ log }: { log: ActivityLog }) {
  const config = activityConfig[log.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary",
        config.color
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {log.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {log.description}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(log.timestamp, { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function groupLogsByDate(logs: ActivityLog[]) {
  const groups: Record<string, ActivityLog[]> = {};

  logs.forEach((log) => {
    const date = format(log.timestamp, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
  });

  return Object.entries(groups).map(([date, logs]) => ({
    date,
    label: format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR }),
    logs,
  }));
}

export function ActivityLogPanel({ logs, onClear }: ActivityLogPanelProps) {
  const groupedLogs = groupLogsByDate(logs);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  return (
    <>
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 sm:h-9 sm:w-9 relative"
          aria-label="Ver histórico de atividades"
        >
          <History className="h-4 w-4 sm:h-5 sm:w-5" />
          {logs.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {logs.length > 99 ? '99+' : logs.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Atividades
          </SheetTitle>
          <SheetDescription>
            Últimas {logs.length} atividades registradas
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setDashboardOpen(true)}
              className="flex-1 text-xs gap-2"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Ver Dashboard Completo
            </Button>
            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClear}
                className="text-xs gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <AnimatePresence mode="popLayout">
              {logs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground">Nenhuma atividade</p>
                  <p className="text-xs text-muted-foreground">
                    As atividades aparecerão aqui
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-6 pr-4">
                  {groupedLogs.map(({ date, label, logs }) => (
                    <div key={date} className="space-y-2">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {label}
                      </h3>
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <ActivityItem key={log.id} log={log} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
    <HistoryDashboard open={dashboardOpen} onOpenChange={setDashboardOpen} />
    </>
  );
}
