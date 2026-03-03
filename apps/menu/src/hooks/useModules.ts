import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface ModuleInfo {
  name: string;
  label: string;
  path: string;
  icon: string;
}

const MODULE_META: Record<string, Omit<ModuleInfo, 'name'>> = {
  rotina_inteligente: {
    label: 'Rotina Inteligente',
    path: '/rotina',
    icon: 'zap',
  },
  mix_page: {
    label: 'Mesa de Som',
    path: '/mix',
    icon: 'music',
  },
};

export function useModules() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.modules()
      .then((res) => {
        const list = (res.data?.modules ?? []).map((name: string) => ({
          name,
          ...(MODULE_META[name] ?? { label: name, path: `/${name}`, icon: 'box' }),
        }));
        setModules(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { modules, loading, error };
}
