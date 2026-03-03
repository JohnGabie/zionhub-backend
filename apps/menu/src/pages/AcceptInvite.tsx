import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api, saveSession } from '@/lib/api';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.acceptInvite(token, { org_name: orgName, name, password }) as any;
      if (res.data?.access_token) {
        saveSession(res.data.access_token, res.data.user, res.data.expires_in ?? 3600);
        toast.success('Conta criada com sucesso!');
        navigate('/menu', { replace: true });
      } else {
        toast.success('Conta criada! Faça login para continuar.');
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || 'Token inválido ou expirado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">ZionHub</h1>
          <p className="text-muted-foreground mt-2">Configure sua organização</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nome da organização
            </label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Igreja Exemplo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Seu nome
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
