import { LogOut } from 'lucide-react';
import { ModuleCard } from '@/components/ModuleCard';
import { useModules } from '@/hooks/useModules';
import { useAuth } from '@/hooks/useAuth';

export default function Menu() {
  const { modules, loading, error } = useModules();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">ZionHub</h1>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Seus módulos</h2>
          <p className="text-muted-foreground mt-1">Selecione um módulo para começar</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        {!loading && !error && modules.length === 0 && (
          <p className="text-muted-foreground">Nenhum módulo disponível no seu plano atual.</p>
        )}

        {!loading && modules.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <ModuleCard key={mod.name} {...mod} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
