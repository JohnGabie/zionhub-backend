import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Power, PowerOff, X, ChevronLeft, ChevronRight, Check, Trash2, Hand, GitBranch, ToggleRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Device, Routine, TriggerType, WeekDay, RoutineAction, TriggerDeviceState } from '@/types/device';
import { cn } from '@/lib/utils';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { RoutineActionList } from '@/components/RoutineActionList';
import { getDeviceIcon } from '@/lib/deviceIcons';

interface RoutineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine?: Routine | null;
  devices: Device[];
  routines?: Routine[];
  onSave: (routine: Omit<Routine, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<Routine>) => void;
  onDelete?: (id: string) => void;
}

const weekDayOptions: { value: WeekDay; label: string }[] = [
  { value: 'seg', label: 'Segunda' },
  { value: 'ter', label: 'Terça' },
  { value: 'qua', label: 'Quarta' },
  { value: 'qui', label: 'Quinta' },
  { value: 'sex', label: 'Sexta' },
  { value: 'sab', label: 'Sábado' },
  { value: 'dom', label: 'Domingo' },
];

const triggerOptions: { value: TriggerType; icon: typeof Clock; title: string; description: string }[] = [
  { value: 'time', icon: Clock, title: 'Em um Horário', description: 'Executar em horário específico' },
  { value: 'manual', icon: Hand, title: 'Manualmente', description: 'Executar quando eu quiser' },
  { value: 'routine_complete', icon: GitBranch, title: 'Após uma Rotina', description: 'Quando outra rotina finalizar' },
  { value: 'device_state', icon: ToggleRight, title: 'Estado de Dispositivo', description: 'Quando um dispositivo mudar' },
];

export function RoutineWizard({
  open,
  onOpenChange,
  routine,
  devices,
  routines = [],
  onSave,
  onUpdate,
  onDelete,
}: RoutineWizardProps) {
  const isEditing = !!routine;
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('time');
  const [triggerTime, setTriggerTime] = useState('08:00');
  const [weekDays, setWeekDays] = useState<WeekDay[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [triggerRoutineId, setTriggerRoutineId] = useState<string>('');
  const [triggerDeviceId, setTriggerDeviceId] = useState<string>('');
  const [triggerDeviceState, setTriggerDeviceState] = useState<TriggerDeviceState>('on');
  const [triggerCooldownMinutes, setTriggerCooldownMinutes] = useState<number>(5);
  const [actions, setActions] = useState<RoutineAction[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setTriggerType(routine.triggerType);
      setTriggerTime(routine.triggerTime || '08:00');
      setWeekDays(routine.weekDays);
      setTriggerRoutineId(routine.triggerRoutineId || '');
      setTriggerDeviceId(routine.triggerDeviceId || '');
      setTriggerDeviceState(routine.triggerDeviceState || 'on');
      setTriggerCooldownMinutes(routine.triggerCooldownMinutes ?? 5);
      setActions(routine.actions);
    } else {
      setName('');
      setTriggerType('time');
      setTriggerTime('08:00');
      setWeekDays(['seg', 'ter', 'qua', 'qui', 'sex']);
      setTriggerRoutineId('');
      setTriggerDeviceId('');
      setTriggerDeviceState('on');
      setTriggerCooldownMinutes(5);
      setActions([]);
    }
    setStep(1);
  }, [routine, open]);

  const toggleWeekDay = (day: WeekDay) => {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addAction = (deviceId: string, turnOn: boolean) => {
    const existing = actions.find((a) => a.deviceId === deviceId);
    if (existing) {
      setActions((prev) =>
        prev.map((a) => (a.deviceId === deviceId ? { ...a, turnOn } : a))
      );
    } else {
      const newOrder = actions.length + 1;
      setActions((prev) => [...prev, { deviceId, turnOn, order: newOrder, delay: 0 }]);
    }
  };

  const removeAction = (deviceId: string) => {
    setActions((prev) => {
      const filtered = prev.filter((a) => a.deviceId !== deviceId);
      return filtered.map((a, index) => ({ ...a, order: index + 1 }));
    });
  };

  const handleSubmit = () => {
    // Determinar isActive baseado na mudança de tipo
    let newIsActive = routine?.isActive ?? (triggerType !== 'manual');

    // Se editando e mudando tipo de gatilho de MANUAL para agendado, ativar automaticamente
    if (routine && routine.triggerType !== triggerType) {
      if (triggerType !== 'manual' && routine.triggerType === 'manual') {
        newIsActive = true;
      }
    }

    const newRoutine: Omit<Routine, 'id'> = {
      name,
      isActive: newIsActive,
      triggerType,
      triggerTime: triggerType === 'time' ? triggerTime : undefined,
      weekDays: triggerType === 'time' ? weekDays : [],
      triggerRoutineId: triggerType === 'routine_complete' ? triggerRoutineId : undefined,
      triggerDeviceId: triggerType === 'device_state' ? triggerDeviceId : undefined,
      triggerDeviceState: triggerType === 'device_state' ? triggerDeviceState : undefined,
      triggerCooldownMinutes: triggerType === 'device_state' ? triggerCooldownMinutes : undefined,
      actions,
    };

    if (isEditing && onUpdate) {
      onUpdate(routine.id, newRoutine);
    } else {
      onSave(newRoutine);
    }
    onOpenChange(false);
  };

  const handleDeleteConfirm = () => {
    if (routine && onDelete) {
      onDelete(routine.id);
      onOpenChange(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return true;
      case 3:
        if (triggerType === 'time') return triggerTime && weekDays.length > 0;
        if (triggerType === 'manual') return true;
        if (triggerType === 'routine_complete') return !!triggerRoutineId;
        if (triggerType === 'device_state') return !!triggerDeviceId;
        return true;
      case 4:
        return actions.length > 0;
      default:
        return true;
    }
  };

  const availableRoutines = routines.filter((r) => r.id !== routine?.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {isEditing ? 'Editar Rotina' : 'Criar Nova Rotina'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Passo {step} de {totalSteps}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < step ? "bg-primary" : "bg-secondary"
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Name */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 py-3 sm:py-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="routine-name" className="text-sm sm:text-base">
                    Qual o nome desta rotina?
                  </Label>
                  <Input
                    id="routine-name"
                    placeholder="Ex: Início do Expediente"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-base sm:text-lg"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Trigger Type */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 py-3 sm:py-4"
              >
                <Label className="text-sm sm:text-base">Quando esta rotina deve executar?</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {triggerOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTriggerType(option.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 sm:gap-3 rounded-xl border-2 p-3 sm:p-4 transition-all",
                          triggerType === option.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Icon className={cn("h-6 w-6 sm:h-8 sm:w-8", triggerType === option.value ? "text-primary" : "text-muted-foreground")} />
                        <div className="text-center">
                          <p className="font-semibold text-xs sm:text-sm">{option.title}</p>
                          <p className="text-[9px] sm:text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Trigger Config */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-6 py-3 sm:py-4"
              >
                {/* Time trigger */}
                {triggerType === 'time' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="time" className="text-sm sm:text-base">
                        Que horas?
                      </Label>
                      <Input
                        id="time"
                        type="time"
                        value={triggerTime}
                        onChange={(e) => setTriggerTime(e.target.value)}
                        className="text-base sm:text-lg w-32 sm:w-40"
                      />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-sm sm:text-base">Repetir em quais dias?</Label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {weekDayOptions.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleWeekDay(day.value)}
                            className={cn(
                              "rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all",
                              weekDays.includes(day.value)
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                            )}
                          >
                            {day.label.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Manual trigger */}
                {triggerType === 'manual' && (
                  <div className="flex flex-col items-center gap-3 sm:gap-4 py-6 sm:py-8 text-center">
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/20">
                      <Hand className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    </div>
                    <p className="text-base sm:text-lg font-medium">
                      Executar manualmente
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
                      Use o botão "Executar" no card da rotina quando quiser
                    </p>
                  </div>
                )}

                {/* Routine complete trigger */}
                {triggerType === 'routine_complete' && (
                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base">
                      Executar após qual rotina?
                    </Label>
                    <Select value={triggerRoutineId} onValueChange={setTriggerRoutineId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma rotina" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoutines.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nenhuma rotina disponível
                          </SelectItem>
                        ) : (
                          availableRoutines.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {triggerRoutineId && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        Será executada automaticamente após "{availableRoutines.find((r) => r.id === triggerRoutineId)?.name}"
                      </p>
                    )}
                  </div>
                )}

                {/* Device state trigger */}
                {triggerType === 'device_state' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">
                        Qual dispositivo monitorar?
                      </Label>
                      <Select value={triggerDeviceId} onValueChange={setTriggerDeviceId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um dispositivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((d) => {
                            const IconComponent = d.icon ? getDeviceIcon(d.icon) : null;
                            return (
                              <SelectItem key={d.id} value={d.id}>
                                <span className="flex items-center gap-2">
                                  {IconComponent && <IconComponent className="h-4 w-4" />}
                                  {d.name}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">
                        Executar quando o dispositivo...
                      </Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTriggerDeviceState('on')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all",
                            triggerDeviceState === 'on'
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Power className={cn("h-5 w-5", triggerDeviceState === 'on' ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("font-medium text-sm", triggerDeviceState === 'on' ? "text-primary" : "text-muted-foreground")}>
                            Ligar
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTriggerDeviceState('off')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all",
                            triggerDeviceState === 'off'
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <PowerOff className={cn("h-5 w-5", triggerDeviceState === 'off' ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("font-medium text-sm", triggerDeviceState === 'off' ? "text-muted-foreground" : "text-muted-foreground")}>
                            Desligar
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">
                        Intervalo mínimo entre execuções
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={1440}
                          value={triggerCooldownMinutes}
                          onChange={(e) => setTriggerCooldownMinutes(parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">minutos</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {triggerCooldownMinutes === 0 
                          ? "Sem limite - executa sempre que o estado mudar"
                          : `Aguarda ${triggerCooldownMinutes} minutos antes de executar novamente`
                        }
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Actions */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3 sm:space-y-4 py-3 sm:py-4"
              >
                <Label className="text-sm sm:text-base">
                  Adicionar dispositivos à rotina
                </Label>
                
                {/* Device selection grid */}
                <div className="max-h-32 sm:max-h-40 overflow-y-auto pr-1 sm:pr-2 border rounded-lg p-2">
                  <div className="grid grid-cols-1 gap-1.5">
                    {devices.map((device) => {
                      const action = actions.find((a) => a.deviceId === device.id);
                      const isSelected = !!action;
                      const IconComponent = device.icon ? getDeviceIcon(device.icon) : null;

                      return (
                        <div
                          key={device.id}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border p-2 transition-all",
                            isSelected ? "border-primary bg-primary/5" : "border-border"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {IconComponent && (
                              <div className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                isSelected ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                              )}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                            )}
                            <span className="font-medium text-sm truncate">{device.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isSelected && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAction(device.id)}
                                className="h-7 px-1.5 text-muted-foreground"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant={action?.turnOn === true ? "default" : "outline"}
                              size="sm"
                              onClick={() => addAction(device.id, true)}
                              className="gap-1 text-xs h-7 px-2"
                            >
                              <Power className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant={action?.turnOn === false ? "default" : "outline"}
                              size="sm"
                              onClick={() => addAction(device.id, false)}
                              className="gap-1 text-xs h-7 px-2"
                            >
                              <PowerOff className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sortable action list */}
                {actions.length > 0 && (
                  <div className="border-t pt-3">
                    <Label className="text-sm sm:text-base mb-2 block">
                      Ordem de execução
                    </Label>
                    <RoutineActionList
                      actions={actions}
                      devices={devices}
                      onActionsChange={setActions}
                    />
                  </div>
                )}

                {actions.length === 0 && (
                  <p className="text-center text-xs sm:text-sm text-muted-foreground py-2">
                    Selecione pelo menos um dispositivo
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-3 sm:pt-4 gap-2">
            <div>
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
                >
                  <Trash2 className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Remover</span>
                </Button>
              )}
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4">
                  <ChevronLeft className="mr-0.5 sm:mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Voltar
                </Button>
              )}
              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
                >
                  Próximo
                  <ChevronRight className="ml-0.5 sm:ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canProceed()}
                  className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
                >
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {isEditing ? 'Salvar' : 'Criar'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remover rotina?"
        description={`Tem certeza que deseja remover "${routine?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
