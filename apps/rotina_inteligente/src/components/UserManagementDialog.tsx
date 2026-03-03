import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Users, Plus, Pencil, KeyRound, Trash2, Loader2,
  ShieldCheck, User as UserIcon,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import type { User, UserRole } from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Schemas ────────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100),
  role: z.enum(['admin', 'user'] as const),
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'user'] as const),
});

const resetPasswordSchema = z.object({
  new_password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100),
});

// ─── Sub-components ─────────────────────────────────────────────

function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!user;

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'user');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setPassword('');
    setRole(user?.role ?? 'user');
    setErrors({});
  };

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserSchema>) => {
      const response = await apiClient.post<User>(API_ENDPOINTS.USERS, data);
      if (!response.success) throw new Error(response.error || 'Erro ao criar usuário');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuário criado', description: `${name} foi criado com sucesso.` });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateUserSchema>) => {
      const response = await apiClient.put<User>(API_ENDPOINTS.USER_BY_ID(user!.id), data);
      if (!response.success) throw new Error(response.error || 'Erro ao atualizar usuário');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuário atualizado', description: `${name} foi atualizado.` });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isEditing) {
      const result = updateUserSchema.safeParse({ name, email, role });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.errors.forEach((err) => { if (err.path[0]) errs[err.path[0].toString()] = err.message; });
        setErrors(errs);
        return;
      }
      updateMutation.mutate(result.data);
    } else {
      const result = createUserSchema.safeParse({ name, email, password, role });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.errors.forEach((err) => { if (err.path[0]) errs[err.path[0].toString()] = err.message; });
        setErrors(errs);
        return;
      }
      createMutation.mutate(result.data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Altere os dados do usuário.' : 'Preencha os dados para criar um novo usuário.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uf-name">Nome</Label>
            <Input id="uf-name" value={name} onChange={(e) => setName(e.target.value)} className={errors.name ? 'border-destructive' : ''} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="uf-email">Email</Label>
            <Input id="uf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? 'border-destructive' : ''} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="uf-password">Senha</Label>
              <Input id="uf-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={errors.password ? 'border-destructive' : ''} />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}) {
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiClient.put<User>(API_ENDPOINTS.USER_PASSWORD(user.id), { new_password: password });
      if (!response.success) throw new Error(response.error || 'Erro ao resetar senha');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Senha alterada', description: `Senha de ${user.name} foi alterada.` });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = resetPasswordSchema.safeParse({ new_password: newPassword });
    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Senha inválida');
      return;
    }
    mutation.mutate(result.data.new_password);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setNewPassword(''); setError(''); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resetar Senha</DialogTitle>
          <DialogDescription>Definir nova senha para {user.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rp-password">Nova Senha</Label>
            <Input id="rp-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={error ? 'border-destructive' : ''} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar Senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserAlert({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<User>(API_ENDPOINTS.USER_BY_ID(user.id));
      if (!response.success) throw new Error(response.error || 'Erro ao deletar usuário');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuário deletado', description: `${user.name} foi removido.` });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar <strong>{user.name}</strong> ({user.email})?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deletar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function UserManagementDialog() {
  const [mainOpen, setMainOpen] = useState(false);

  // Sub-dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const response = await apiClient.get<User[]>(API_ENDPOINTS.USERS);
      if (response.success && response.data) return response.data;
      throw new Error(response.error || 'Erro ao carregar usuários');
    },
    enabled: mainOpen,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await apiClient.put<User>(API_ENDPOINTS.USER_BY_ID(id), { is_active });
      if (!response.success) throw new Error(response.error || 'Erro ao atualizar status');
      return response.data;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: is_active ? 'Usuário ativado' : 'Usuário desativado',
        description: `Status atualizado com sucesso.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const openCreate = () => { setEditingUser(undefined); setFormOpen(true); };
  const openEdit = (u: User) => { setEditingUser(u); setFormOpen(true); };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
  };

  return (
    <>
      <Dialog open={mainOpen} onOpenChange={setMainOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Gerenciar Usuários</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciamento de Usuários
            </DialogTitle>
            <DialogDescription>Criar, editar e gerenciar contas de usuários do sistema.</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="gap-1">
                          {u.role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                          {u.role === 'admin' ? 'Admin' : 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.is_active ? 'default' : 'destructive'}
                          className="cursor-pointer"
                          onClick={() => toggleActiveMutation.mutate({ id: u.id, is_active: !u.is_active })}
                        >
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">{formatDate(u.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setResetUser(u)}>
                                  <KeyRound className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Resetar Senha</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteUser(u)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Deletar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs rendered outside main dialog to avoid nesting issues */}
      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />
      {resetUser && <ResetPasswordDialog open={!!resetUser} onOpenChange={(v) => { if (!v) setResetUser(null); }} user={resetUser} />}
      {deleteUser && <DeleteUserAlert open={!!deleteUser} onOpenChange={(v) => { if (!v) setDeleteUser(null); }} user={deleteUser} />}
    </>
  );
}
