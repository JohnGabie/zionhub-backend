import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sliders, Music, Guitar, Sparkles, BarChart3 } from 'lucide-react';

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const tabs = [
  { id: 'channels', label: 'Canais', icon: Sliders },
  { id: 'playback', label: 'Playback', icon: Music },
  { id: 'groups', label: 'Grupos', icon: Guitar },
  { id: 'effects', label: 'Efeitos', icon: Sparkles },
  { id: 'meters', label: 'Medidores', icon: BarChart3 },
];

export function NavigationTabs({ activeTab, onTabChange, children }: NavigationTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col">
      {children}
    </Tabs>
  );
}

export { TabsContent };
