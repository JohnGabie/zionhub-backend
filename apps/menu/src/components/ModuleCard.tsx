import { Zap, Music, Box, ExternalLink } from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  zap: <Zap className="w-8 h-8" />,
  music: <Music className="w-8 h-8" />,
  box: <Box className="w-8 h-8" />,
};

interface ModuleCardProps {
  name: string;
  label: string;
  path: string;
  icon: string;
}

export function ModuleCard({ label, path, icon }: ModuleCardProps) {
  return (
    <a
      href={path}
      className="group flex flex-col items-center gap-4 p-6 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all duration-200 cursor-pointer animate-fade-in"
    >
      <div className="p-4 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        {ICONS[icon] ?? <Box className="w-8 h-8" />}
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">{label}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </a>
  );
}
