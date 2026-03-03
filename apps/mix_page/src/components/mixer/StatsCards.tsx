import { Activity, Sliders, Sparkles, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatsCardsProps {
  activeChannels: number;
  totalChannels: number;
  masterVolume: number;
  effectsActive: number;
  groupsActive: number;
}

export function StatsCards({ 
  activeChannels, 
  totalChannels, 
  masterVolume, 
  effectsActive, 
  groupsActive 
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Canais Ativos',
      value: `${activeChannels}/${totalChannels}`,
      icon: Activity,
      color: 'text-accent',
    },
    {
      label: 'Volume Master',
      value: `${masterVolume}%`,
      icon: Sliders,
      color: 'text-primary',
    },
    {
      label: 'Efeitos Ativos',
      value: effectsActive.toString(),
      icon: Sparkles,
      color: 'text-sc-yellow',
    },
    {
      label: 'Grupos Ativos',
      value: groupsActive.toString(),
      icon: Users,
      color: 'text-sc-orange',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 px-3 py-2 md:px-6 md:py-4">
      {stats.map((stat) => (
        <Card 
          key={stat.label}
          className="p-4 bg-card border-border hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
