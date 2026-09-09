'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo'),
  cpf: z.string().min(11, 'CPF inválido').max(14),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('E-mail inválido'),
  cep: z.string().min(8, 'CEP inválido').max(9),
  state: z.string().length(2, 'UF'),
  city: z.string().min(2),
  street: z.string().min(2),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(2),
  payment_method: z.enum(['pix', 'credit_card']),
});

type FormValues = z.infer<typeof formSchema>;

export function CheckoutForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => nanoid());

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { payment_method: 'pix' } });

  const paymentMethod = watch('payment_method');

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          idempotency_key: idempotencyKey,
          customer: { name: values.name, cpf: values.cpf, phone: values.phone, email: values.email },
          address: {
            cep: values.cep,
            state: values.state,
            city: values.city,
            street: values.street,
            number: values.number,
            complement: values.complement,
            neighborhood: values.neighborhood,
          },
          payment:
            values.payment_method === 'pix'
              ? { method: 'pix' }
              : { method: 'credit_card', card_token: 'TOKEN_DE_TESTE', installments: 1 },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? 'Não foi possível processar seu pedido.');
        return;
      }

      router.push(`/pedido/${data.order.order_number}`);
    } catch {
      setServerError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seus dados</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" {...register('cpf')} />
              {errors.cpf && <p className="mt-1 text-xs text-destructive">{errors.cpf.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" {...register('cep')} />
            </div>
            <div>
              <Label htmlFor="state">UF</Label>
              <Input id="state" maxLength={2} {...register('state')} />
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" {...register('city')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="street">Endereço</Label>
              <Input id="street" {...register('street')} />
            </div>
            <div>
              <Label htmlFor="number">Número</Label>
              <Input id="number" {...register('number')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" {...register('neighborhood')} />
            </div>
            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input id="complement" {...register('complement')} />
            </div>
          </div>

          <div>
            <Label>Pagamento</Label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" value="pix" {...register('payment_method')} /> Pix
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" value="credit_card" {...register('payment_method')} /> Cartão
              </label>
            </div>
          </div>

          {paymentMethod === 'credit_card' && (
            <p className="text-xs text-muted-foreground">
              Em produção, o token do cartão é gerado no browser pelo SDK/JS da Appmax (tokenização), nunca
              enviamos o número do cartão para o nosso backend.
            </p>
          )}

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Processando...' : 'Finalizar compra'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
