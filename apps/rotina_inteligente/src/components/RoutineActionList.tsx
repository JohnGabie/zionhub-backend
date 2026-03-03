import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Power, PowerOff, X, Timer } from 'lucide-react';
import { Device, RoutineAction } from '@/types/device';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getDeviceIcon } from '@/lib/deviceIcons';

interface RoutineActionListProps {
  actions: RoutineAction[];
  devices: Device[];
  onActionsChange: (actions: RoutineAction[]) => void;
}

interface SortableActionItemProps {
  action: RoutineAction;
  device: Device | undefined;
  index: number;
  onRemove: (deviceId: string) => void;
  onDelayChange: (deviceId: string, delay: number) => void;
}

function SortableActionItem({ action, device, index, onRemove, onDelayChange }: SortableActionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.deviceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = device?.icon ? getDeviceIcon(device.icon) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 sm:gap-3 rounded-lg border bg-card p-2 sm:p-3 transition-all",
        isDragging ? "opacity-50 shadow-lg border-primary" : "border-border",
        action.turnOn ? "border-l-4 border-l-primary" : "border-l-4 border-l-muted-foreground"
      )}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {/* Order Number */}
      <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-bold">
        {index + 1}°
      </div>

      {/* Device Icon */}
      {IconComponent && (
        <div className={cn(
          "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg",
          action.turnOn ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
        )}>
          <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      )}

      {/* Device Name & Action */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-medium text-sm sm:text-base truncate">
          {device?.name || 'Dispositivo removido'}
        </span>
        <span className={cn(
          "flex items-center gap-1 text-xs",
          action.turnOn ? "text-primary" : "text-muted-foreground"
        )}>
          {action.turnOn ? (
            <>
              <Power className="h-3 w-3" /> Ligar
            </>
          ) : (
            <>
              <PowerOff className="h-3 w-3" /> Desligar
            </>
          )}
        </span>
      </div>

      {/* Delay Input */}
      <div className="flex items-center gap-1 shrink-0">
        <Timer className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="number"
          min={0}
          max={999}
          value={action.delay}
          onChange={(e) => onDelayChange(action.deviceId, parseInt(e.target.value) || 0)}
          className="w-14 sm:w-16 h-7 sm:h-8 text-center text-xs sm:text-sm"
          aria-label="Delay em segundos"
        />
        <span className="text-xs text-muted-foreground">s</span>
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(action.deviceId)}
        className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function RoutineActionList({ actions, devices, onActionsChange }: RoutineActionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedActions = useMemo(() => {
    return [...actions].sort((a, b) => a.order - b.order);
  }, [actions]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedActions.findIndex((a) => a.deviceId === active.id);
      const newIndex = sortedActions.findIndex((a) => a.deviceId === over.id);

      const newSortedActions = arrayMove(sortedActions, oldIndex, newIndex);
      
      // Update order numbers
      const reorderedActions = newSortedActions.map((action, index) => ({
        ...action,
        order: index + 1,
      }));

      onActionsChange(reorderedActions);
    }
  };

  const handleRemove = (deviceId: string) => {
    const newActions = actions
      .filter((a) => a.deviceId !== deviceId)
      .map((action, index) => ({ ...action, order: index + 1 }));
    onActionsChange(newActions);
  };

  const handleDelayChange = (deviceId: string, delay: number) => {
    const newActions = actions.map((a) =>
      a.deviceId === deviceId ? { ...a, delay: Math.max(0, Math.min(999, delay)) } : a
    );
    onActionsChange(newActions);
  };

  if (sortedActions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <p className="text-sm">Nenhuma ação adicionada</p>
        <p className="text-xs mt-1">Selecione dispositivos acima para adicionar ações</p>
      </div>
    );
  }

  const allZeroDelay = sortedActions.every((a) => a.delay === 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Arraste para reordenar a sequência
        </p>
        {allZeroDelay && sortedActions.length > 1 && (
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            Simultâneo
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedActions.map((a) => a.deviceId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sortedActions.map((action, index) => (
              <SortableActionItem
                key={action.deviceId}
                action={action}
                device={devices.find((d) => d.id === action.deviceId)}
                index={index}
                onRemove={handleRemove}
                onDelayChange={handleDelayChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p className="text-xs text-muted-foreground text-center mt-2">
        💡 Delay = 0 para todos executa simultaneamente
      </p>
    </div>
  );
}
