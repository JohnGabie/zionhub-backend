import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConnectionStatusProps {
  isLoading?: boolean;
  isError?: boolean;
}

export function ConnectionStatus({ isLoading, isError }: ConnectionStatusProps) {
  if (isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conectando ao servidor...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-destructive">
              <WifiOff className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Erro de conexão com o servidor</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-green-600">
            <Wifi className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Conectado ao servidor</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
