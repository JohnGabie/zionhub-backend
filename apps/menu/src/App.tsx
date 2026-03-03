import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Login from '@/pages/Login';
import Menu from '@/pages/Menu';
import AcceptInvite from '@/pages/AcceptInvite';
import { useAuth } from '@/hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <Menu />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
