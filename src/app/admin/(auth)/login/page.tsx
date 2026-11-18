'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError('E-mail ou senha inválidos.');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  async function onForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setForgotLoading(false);
    if (resetError) {
      setForgotError('Não foi possível enviar o e-mail. Confira o endereço e tente de novo.');
      return;
    }
    setForgotSent(true);
  }

  if (mode === 'forgot') {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Recuperar senha</CardTitle>
          </CardHeader>
          <CardContent>
            {forgotSent ? (
              <p className="text-sm text-emerald-600">
                Se esse e-mail estiver cadastrado, enviamos um link de recuperação. Verifique sua caixa de entrada (e spam).
              </p>
            ) : (
              <form onSubmit={onForgotSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {forgotError && <p className="text-sm text-destructive">{forgotError}</p>}
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setForgotSent(false);
                setForgotError(null);
              }}
              className="mt-4 text-sm text-muted-foreground underline"
            >
              Voltar para o login
            </button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Fazzo — Painel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <button type="button" onClick={() => setMode('forgot')} className="mt-4 text-sm text-muted-foreground underline">
            Esqueci minha senha
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
