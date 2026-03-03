import { useRef, useEffect, useState } from 'react';
import { Bell, Settings, User, Wifi, WifiOff, LayoutGrid, Sliders, Music, Guitar, Sparkles, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSoundcraft } from '@/hooks/useSoundcraft';

const NAV_TABS = [
  { id: 'channels', label: 'Canais', icon: Sliders },
  { id: 'playback', label: 'Playback', icon: Music },
  { id: 'groups', label: 'Grupos', icon: Guitar },
  { id: 'effects', label: 'Efeitos', icon: Sparkles },
  { id: 'meters', label: 'Medidores', icon: BarChart3 },
];

const MODE_TABS = [
  { id: 'basic', label: 'Básico', icon: LayoutGrid },
  { id: 'advanced', label: 'Avançado', icon: Sliders },
];

function NavSwitch({ tabs, activeTab, onTabChange, className }: { tabs: typeof NAV_TABS; activeTab?: string; onTabChange: (tab: string) => void; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current || !activeTab) return;
    const activeBtn = containerRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
    if (!activeBtn) return;
    setPill({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
  }, [activeTab]);

  return (
    <div ref={containerRef} className={cn('flex relative bg-secondary/60 rounded-lg p-0.5', className)}>
      {/* Sliding pill */}
      <div
        className="absolute top-0.5 bottom-0.5 rounded-md bg-primary shadow-sm"
        style={{
          width: pill.width,
          transform: `translateX(${pill.left}px)`,
          transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform, width',
          left: 0,
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-200',
            activeTab === tab.id
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <tab.icon className="w-3.5 h-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface HeaderProps {
  mode: 'basic' | 'advanced';
  onModeChange: (mode: 'basic' | 'advanced') => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function Header({ mode, onModeChange, activeTab, onTabChange }: HeaderProps) {
  const { status: scStatus } = useSoundcraft();
  const isConnected = scStatus === 'connected';
  const isConnecting = scStatus === 'connecting';
  const WifiIcon = isConnected ? Wifi : WifiOff;

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-primary/20">
            <span className="text-primary font-bold text-sm sm:text-base">SC</span>
          </div>
          <span className="text-base sm:text-lg font-bold text-foreground">SoundControl</span>

          {/* Connection Status */}
          <div className={cn(
            'hidden md:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full transition-colors duration-300',
            isConnected ? 'bg-secondary/60' : 'bg-red-950/40'
          )}>
            <WifiIcon className={cn(
              'w-3.5 h-3.5 transition-colors duration-300',
              isConnected ? 'text-accent' : isConnecting ? 'text-yellow-500 animate-pulse' : 'text-red-400'
            )} />
            <span className="text-xs text-muted-foreground">
              <span className={cn(
                'transition-colors duration-300',
                isConnected ? 'text-accent' : isConnecting ? 'text-yellow-500' : 'text-red-400'
              )}>●</span>
              {isConnected ? ' Conectado' : isConnecting ? ' Conectando...' : ' Desconectado'}
            </span>
          </div>
          {/* Mobile connection indicator */}
          <div className="flex md:hidden">
            <WifiIcon className={cn(
              'w-4 h-4 transition-colors duration-300',
              isConnected ? 'text-accent' : isConnecting ? 'text-yellow-500 animate-pulse' : 'text-red-400'
            )} />
          </div>
        </div>

        {/* Navigation Switch */}
        {onTabChange && (
          <NavSwitch tabs={NAV_TABS} activeTab={activeTab} onTabChange={onTabChange} className="hidden md:flex" />
        )}

        {/* Mode Toggle + Right Icons */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onModeChange(mode === 'basic' ? 'advanced' : 'basic')}
            className="relative flex items-center gap-1.5 h-[30px] px-2.5 rounded-md bg-secondary/60 text-xs font-medium text-foreground overflow-hidden transition-colors hover:bg-secondary/80 group"
          >
            <div className="relative w-3.5 h-3.5">
              <LayoutGrid
                className={cn(
                  'absolute inset-0 w-3.5 h-3.5 transition-all duration-400',
                  mode === 'basic'
                    ? 'opacity-100 rotate-0 scale-100'
                    : 'opacity-0 -rotate-90 scale-50'
                )}
              />
              <Sliders
                className={cn(
                  'absolute inset-0 w-3.5 h-3.5 transition-all duration-400',
                  mode === 'advanced'
                    ? 'opacity-100 rotate-0 scale-100'
                    : 'opacity-0 rotate-90 scale-50'
                )}
              />
            </div>
            <span className="hidden sm:inline relative">
              <span
                className={cn(
                  'inline-block transition-all duration-400',
                  mode === 'basic'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-4 absolute inset-0'
                )}
              >
                Básico
              </span>
              <span
                className={cn(
                  'inline-block transition-all duration-400',
                  mode === 'advanced'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 absolute inset-0'
                )}
              >
                Avançado
              </span>
            </span>
            <div className={cn(
              'absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-400',
              mode === 'advanced' ? 'bg-primary' : 'bg-transparent'
            )} />
          </button>

          <Button variant="ghost" size="icon" className="h-[30px] w-[30px] text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg">
            <Bell className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex h-[30px] w-[30px] text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg">
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex h-[30px] w-[30px] text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg">
            <User className="w-3.5 h-3.5" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
