import { motion } from 'framer-motion';
import { Zap, Moon, Sun, Bell, BellOff, LogOut } from 'lucide-react';
import { UserManagementDialog } from '@/components/UserManagementDialog';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useAuthContext } from '@/contexts/AuthContext';
import { ActivityLogPanel } from '@/components/ActivityLogPanel';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { enabled: notificationsEnabled, toggleNotifications, permission } = useNotificationContext();
  const { logs, clearLogs } = useActivityLog();
  const { logout, user } = useAuthContext();
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-primary/20">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground">Rotina Inteligente</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">Gerenciador de Automação</p>
          </div>
        </motion.div>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleNotifications}
                  disabled={permission === 'denied'}
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  aria-label={permission === 'denied' ? 'Notificações bloqueadas' : notificationsEnabled ? 'Desativar notificações' : 'Ativar notificações'}
                >
                  <motion.div
                    key={notificationsEnabled ? 'on' : 'off'}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {notificationsEnabled ? (
                      <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    ) : (
                      <BellOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permission === 'denied' 
                  ? 'Notificações bloqueadas pelo navegador'
                  : notificationsEnabled 
                    ? 'Notificações ativadas' 
                    : 'Ativar notificações'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ActivityLogPanel logs={logs} onClear={clearLogs} />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 sm:h-9 sm:w-9"
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </motion.div>
          </Button>
          
          {user?.role === 'admin' && <UserManagementDialog />}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive"
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sair ({user?.email})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
      </div>
    </header>
  );
}

