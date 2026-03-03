import { motion } from 'framer-motion';
import { Clock, Zap, Calendar, Power, PowerOff, Edit2, Play, Hand, GitBranch, ToggleRight, Timer, Loader2 } from 'lucide-react';
import { Routine, Device, WeekDay } from '@/types/device';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDeviceIcon } from '@/lib/deviceIcons';

interface RoutineCardProps {
  routine: Routine;
  devices: Device[];
  routines?: Routine[];
  onToggle: (id: string) => void;
  onEdit?: (routine: Routine) => void;
  onExecute?: (id: string) => void;
  isToggling?: boolean;
  isExecuting?: boolean;
}

const weekDayLabels: Record<WeekDay, string> = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
  dom: 'Dom',
};

const allWeekDays: WeekDay[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

export function RoutineCard({ routine, devices, routines = [], onToggle, onEdit, onExecute, isToggling, isExecuting }: RoutineCardProps) {
  const getDeviceName = (deviceId: string) => {
    return devices.find((d) => d.id === deviceId)?.name || 'Dispositivo removido';
  };

  const getDevice = (deviceId: string) => {
    return devices.find((d) => d.id === deviceId);
  };

  const getRoutineName = (routineId: string) => {
    return routines.find((r) => r.id === routineId)?.name || 'Rotina removida';
  };

  const isManual = routine.triggerType === 'manual';

  const getTriggerIcon = () => {
    switch (routine.triggerType) {
      case 'time': return Clock;
      case 'manual': return Hand;
      case 'routine_complete': return GitBranch;
      case 'device_state': return ToggleRight;
      default: return Clock;
    }
  };

  const getTriggerBadge = () => {
    switch (routine.triggerType) {
      case 'time':
        return { label: 'Horário', variant: 'secondary' as const };
      case 'manual':
        return { label: 'Manual', variant: 'outline' as const };
      case 'routine_complete':
        return { label: `Após "${getRoutineName(routine.triggerRoutineId || '')}"`, variant: 'secondary' as const };
      case 'device_state':
        const deviceName = getDeviceName(routine.triggerDeviceId || '');
        const state = routine.triggerDeviceState === 'on' ? 'ligar' : 'desligar';
        return { label: `${deviceName} ${state}`, variant: 'secondary' as const };
      default:
        return { label: 'Desconhecido', variant: 'secondary' as const };
    }
  };

  const TriggerIcon = getTriggerIcon();
  const triggerBadge = getTriggerBadge();

  // Sort actions by order
  const sortedActions = [...routine.actions].sort((a, b) => a.order - b.order);
  const hasDelays = sortedActions.some((a) => a.delay > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border bg-card p-3 sm:p-5 card-hover",
        isManual ? "border-border" : routine.isActive ? "border-primary/30" : "border-border opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Trigger Icon */}
          <div
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-colors",
              isManual 
                ? "bg-secondary text-muted-foreground"
                : routine.isActive 
                  ? "bg-primary/20 text-primary" 
                  : "bg-secondary text-muted-foreground"
            )}
          >
            <TriggerIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>

          <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{routine.name}</h3>
              <Badge variant={triggerBadge.variant} className="text-[10px] sm:text-xs h-5">
                {triggerBadge.label}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {routine.triggerType === 'time' ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Às {routine.triggerTime}
                </span>
              ) : routine.triggerType === 'manual' ? (
                <span className="flex items-center gap-1">
                  <Hand className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Executar quando quiser
                </span>
              ) : routine.triggerType === 'routine_complete' ? (
                <span className="flex items-center gap-1">
                  <GitBranch className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Encadeada
                </span>
              ) : routine.triggerType === 'device_state' ? (
                <span className="flex items-center gap-1">
                  <ToggleRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {routine.triggerCooldownMinutes ? `Cooldown: ${routine.triggerCooldownMinutes}min` : 'Sem cooldown'}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit?.(routine)}
            className="h-7 w-7 sm:h-8 sm:w-8"
          >
            <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          
          {isManual ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => onExecute?.(routine.id)}
              disabled={isExecuting}
              className="gap-1 h-8 px-3"
            >
              {isExecuting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{isExecuting ? 'Executando...' : 'Executar'}</span>
            </Button>
          ) : (
            <div className="relative">
              <Switch
                checked={routine.isActive}
                onCheckedChange={() => onToggle(routine.id)}
                disabled={isToggling}
                aria-label={`${routine.isActive ? 'Desativar' : 'Ativar'} ${routine.name}`}
                className={cn(isToggling && "opacity-30")}
              />
              {isToggling && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Week days */}
      {routine.triggerType === 'time' && (
        <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2">
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          <div className="flex gap-0.5 sm:gap-1 flex-wrap">
            {allWeekDays.map((day) => (
              <span
                key={day}
                className={cn(
                  "flex h-6 w-7 sm:h-6 sm:w-8 items-center justify-center rounded text-xs font-medium transition-colors",
                  routine.weekDays.includes(day)
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {weekDayLabels[day]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions list with order and delay */}
      <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Ações {hasDelays && <span className="normal-case">(sequencial)</span>}
        </p>
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {sortedActions.map((action, index) => {
            const device = getDevice(action.deviceId);
            const IconComponent = device?.icon ? getDeviceIcon(device.icon) : null;

            return (
              <div key={`${action.deviceId}-${index}`} className="flex flex-col gap-1.5 sm:gap-2">
                {/* Delay before this action */}
                {action.delay > 0 && (
                  <div className="flex items-center gap-1.5 pl-3 sm:pl-4">
                    <div className="w-px h-3 bg-muted-foreground/30" />
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      {action.delay >= 60
                        ? `${Math.floor(action.delay / 60)}min${action.delay % 60 > 0 ? ` ${action.delay % 60}s` : ''}`
                        : `${action.delay}s`
                      } de espera
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium",
                    action.turnOn
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {/* Order number */}
                  <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-background text-[10px] sm:text-xs font-bold">
                    {action.order}°
                  </span>

                  {/* Device icon */}
                  {IconComponent && <IconComponent className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}

                  {/* Action icon */}
                  {action.turnOn ? (
                    <Power className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ) : (
                    <PowerOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  )}

                  {/* Device name */}
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">{getDeviceName(action.deviceId)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
