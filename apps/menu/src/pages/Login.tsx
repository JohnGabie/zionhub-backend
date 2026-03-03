import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api, saveSession } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/menu', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login(email, password);
      const { access_token, expires_in, user } = res.data;
      saveSession(access_token, user, expires_in);
      navigate('/menu', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">ZionHub</h1>
          <p className="text-muted-foreground mt-2">Entre com sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
