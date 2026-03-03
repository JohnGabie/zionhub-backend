import { Card } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderTabProps {
  title: string;
  description: string;
}

export function PlaceholderTab({ title, description }: PlaceholderTabProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="p-8 bg-card border-border text-center max-w-md">
        <Construction className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </Card>
    </div>
  );
}
