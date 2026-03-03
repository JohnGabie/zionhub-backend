import { useState } from 'react';
import { motion } from 'framer-motion';
import { Power, PowerOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Device } from '@/types/device';

interface MasterSwitchProps {
  devices: Device[];
  onToggleAll: (turnOn: boolean) => void;
  isToggling?: boolean;
}

export function MasterSwitch({ devices, onToggleAll, isToggling }: MasterSwitchProps) {
  const [confirmAction, setConfirmAction] = useState<boolean | null>(null);
  const onlineDevices = devices.filter((d) => d.status === 'online');
  const onlineOnCount = onlineDevices.filter((d) => d.isOn).length;
  const allOn = onlineOnCount === onlineDevices.length && onlineDevices.length > 0;
  const someOn = onlineOnCount > 0;

  const handleConfirm = () => {
    if (confirmAction !== null) {
      onToggleAll(confirmAction);
      setConfirmAction(null);
    }
  };

  const isLigar = confirmAction === true;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6 sm:flex-row sm:justify-between"
      >
        <div className="text-center sm:text-left">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Controle Geral
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {onlineOnCount} de {onlineDevices.length} dispositivos ligados
          </p>
        </div>

        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="master"
            size="default"
            onClick={() => setConfirmAction(true)}
            disabled={allOn || isToggling}
            className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-11 px-3 sm:px-4"
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Power className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            <span className="hidden xs:inline">Ligar</span> Tudo
          </Button>
          <Button
            variant="masterOff"
            size="default"
            onClick={() => setConfirmAction(false)}
            disabled={!someOn || isToggling}
            className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-11 px-3 sm:px-4"
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <PowerOff className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            <span className="hidden xs:inline">Desligar</span> Tudo
          </Button>
        </div>
      </motion.div>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              {isLigar ? 'Ligar todos os dispositivos?' : 'Desligar todos os dispositivos?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              {isLigar
                ? `Isso irá ligar TODOS os ${onlineDevices.length} dispositivos online.`
                : `Isso irá desligar TODOS os ${onlineDevices.length} dispositivos online. Verifique se não há um evento em andamento.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="text-xs sm:text-sm h-8 sm:h-10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`text-xs sm:text-sm h-8 sm:h-10 ${
                isLigar
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }`}
            >
              {isLigar ? 'Sim, ligar tudo' : 'Sim, desligar tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
