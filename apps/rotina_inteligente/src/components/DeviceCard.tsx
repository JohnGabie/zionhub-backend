import { motion } from 'framer-motion';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Device } from '@/types/device';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { getDeviceIcon } from '@/lib/deviceIcons';

interface DeviceCardProps {
  device: Device;
  onToggle: (id: string) => void;
  onEdit?: (device: Device) => void;
  isToggling?: boolean;
}

export function DeviceCard({ device, onToggle, onEdit, isToggling }: DeviceCardProps) {
  const isOnline = device.status === 'online';
  const isOn = device.isOn && isOnline;

  const DeviceIcon = getDeviceIcon(device.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-3 sm:p-5 card-hover cursor-pointer",
        isOn ? "border-primary/30 device-glow-on" : "border-border",
        !isOnline && "opacity-60"
      )}
      onClick={() => onEdit?.(device)}
    >
      {/* Glow effect background */}
      {isOn && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Device Icon with status indicator */}
          <div
            className={cn(
              "relative flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300",
              isOn ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
            )}
          >
            <DeviceIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            {/* Power indicator dot */}
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 sm:-right-1 sm:-top-1 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-card transition-colors duration-300",
                isOn ? "bg-primary animate-pulse-glow" : "bg-device-off"
              )}
            />
          </div>

          <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{device.name}</h3>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium",
                  isOnline ? "text-primary" : "text-device-offline"
                )}
              >
                {isOnline ? (
                  <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                ) : (
                  <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                )}
                {isOnline ? "Online" : "Offline"}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">•</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase hidden xs:inline">
                {device.type}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <div
          className="flex flex-col items-end gap-1 sm:gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Switch
              checked={isOn}
              onCheckedChange={() => onToggle(device.id)}
              disabled={!isOnline || isToggling}
              aria-label={`${isOn ? 'Desligar' : 'Ligar'} ${device.name}`}
              className={cn(isToggling && "opacity-30")}
            />
            {isToggling && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {isToggling ? 'Alternando...' : isOn ? 'Ligado' : 'Desligado'}
          </span>
        </div>
      </div>

      {/* Bottom status bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 transition-all duration-500",
          isOn ? "bg-gradient-to-r from-primary/50 via-primary to-primary/50" : "bg-transparent"
        )}
      />
    </motion.div>
  );
}
