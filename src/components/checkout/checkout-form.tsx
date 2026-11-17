'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppmax } from '@/lib/appmax-js/use-appmax';

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
});

type FormValues = z.infer<typeof formSchema>;
type PaymentMethod = 'pix' | 'credit_card';

type PixResult = {
  qrCode?: string;
  qrCodeBase64?: string;
  expiresAt?: string;
};

const APPMAX_EXTERNAL_ID = process.env.NEXT_PUBLIC_APPMAX_EXTERNAL_ID;

export function CheckoutForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => nanoid());
  const [pixResult, setPixResult] = useState<PixResult | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardHolderName, setCardHolderName] = useState('');

  const ipRef = useRef('');
  const cardFormRef = useRef<HTMLFormElement>(null);
  const pendingValuesRef = useRef<FormValues | null>(null);
  const inFlight = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const finishOrder = useCallback(
    async (values: FormValues, payment: { method: 'pix' } | { method: 'credit_card'; card_token: string; installments: number }) => {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            idempotency_key: idempotencyKey,
            customer_ip: ipRef.current || undefined,
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
            payment,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setServerError(data.error ?? 'Não foi possível processar seu pedido.');
          return;
        }

        // O pedido foi criado, mas o cliente ainda precisa pagar — mostramos
        // o QR Code / copia-e-cola aqui em vez de já mandar para o
        // acompanhamento (senão ele nunca veria como pagar).
        if (data.pix) {
          setOrderNumber(data.order.order_number);
          setPixResult(data.pix);
          return;
        }

        router.push(`/pedido/${data.order.order_number}`);
      } catch {
        setServerError('Erro de conexão. Tente novamente.');
      } finally {
        setSubmitting(false);
        inFlight.current = false;
      }
    },
    [idempotencyKey, router, sessionId],
  );

  const onToken = useCallback(
    (token: string) => {
      // Trava síncrona contra o comprador clicar duas vezes — useState não
      // serve aqui porque a atualização é assíncrona (ver guia oficial).
      if (inFlight.current || !pendingValuesRef.current) return;
      inFlight.current = true;
      void finishOrder(pendingValuesRef.current, { method: 'credit_card', card_token: token, installments: 1 });
    },
    [finishOrder],
  );

  const onCardError = useCallback((message: string) => {
    setServerError(message);
    setSubmitting(false);
    inFlight.current = false;
  }, []);

  useAppmax({
    externalId: APPMAX_EXTERNAL_ID,
    onIp: (ip) => {
      ipRef.current = ip;
    },
    onToken,
    onError: onCardError,
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);

    if (paymentMethod === 'pix') {
      setSubmitting(true);
      await finishOrder(values, { method: 'pix' });
      return;
    }

    // Cartão: o token vem assíncrono via Appmax JS (onToken, acima) depois
    // que o form data-appmax-checkout for enviado. Guardamos os dados do
    // comprador pra usar quando o token chegar.
    if (!APPMAX_EXTERNAL_ID) {
      setServerError('Pagamento por cartão temporariamente indisponível.');
      return;
    }
    setSubmitting(true);
    pendingValuesRef.current = values;
    cardFormRef.current?.requestSubmit();
  }

  async function copyPixCode() {
    if (!pixResult?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixResult.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API pode falhar em contexto não seguro; o campo readonly
      // abaixo permite copiar manualmente como fallback.
    }
  }

  if (pixResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pague com Pix para confirmar seu pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pixResult.qrCodeBase64 && (
            <img
              src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
              alt="QR Code Pix"
              className="mx-auto h-56 w-56 rounded-md border border-border"
            />
          )}

          {pixResult.qrCode && (
            <div>
              <Label htmlFor="pix-copy-paste">Pix copia e cola</Label>
              <div className="mt-1 flex gap-2">
                <Input id="pix-copy-paste" readOnly value={pixResult.qrCode} className="font-mono text-xs" />
                <Button type="button" onClick={copyPixCode} variant="outline">
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>
          )}

          {pixResult.expiresAt && (
            <p className="text-sm text-muted-foreground">
              Este Pix expira em <strong>{new Date(pixResult.expiresAt).toLocaleString('pt-BR')}</strong>. Após pagar,
              a confirmação pode levar alguns instantes.
            </p>
          )}

          <Button
            type="button"
            className="w-full"
            onClick={() => orderNumber && router.push(`/pedido/${orderNumber}`)}
          >
            Já paguei — acompanhar pedido
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seus dados</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gatilho de coleta de IP do Appmax JS — vazio e sempre montado
            (ver docs.appmax.com.br/guides/exemplo-checkout-spa, regra 2). */}
        <form data-appmax-customer hidden />

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
                <input
                  type="radio"
                  checked={paymentMethod === 'pix'}
                  onChange={() => setPaymentMethod('pix')}
                />{' '}
                Pix
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={paymentMethod === 'credit_card'}
                  onChange={() => setPaymentMethod('credit_card')}
                  disabled={!APPMAX_EXTERNAL_ID}
                />{' '}
                Cartão
              </label>
            </div>
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Processando...' : 'Finalizar compra'}
          </Button>
        </form>

        {/* Form de tokenização do Appmax JS — IRMÃO do form principal, nunca
            aninhado dentro dele (HTML não permite <form> dentro de <form>;
            fazer isso quebra a hidratação do React, que não sabe que o
            browser corrige a aninhação por baixo dele). Sempre montado
            (nunca atrás de um `{condicional && ...}`), só escondido por CSS
            quando Pix está selecionado. Os `name` são fixos pelo contrato
            do SDK; não renomear (ver docs.appmax.com.br/guides/appmax-js). */}
        <form
          ref={cardFormRef}
          data-appmax-checkout
          method="POST"
          onSubmit={(e) => e.preventDefault()}
          className={paymentMethod === 'credit_card' ? 'mt-4 space-y-3 rounded-md border border-border p-3' : 'hidden'}
        >
          <div>
            <Label htmlFor="card-number">Número do cartão</Label>
            <Input id="card-number" name="card-number" inputMode="numeric" autoComplete="cc-number" required={paymentMethod === 'credit_card'} />
          </div>
          <div>
            <Label htmlFor="card-holder-name">Nome impresso no cartão</Label>
            <Input
              id="card-holder-name"
              name="card-holder-name"
              autoComplete="cc-name"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
              required={paymentMethod === 'credit_card'}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input name="exp-month" placeholder="MM" inputMode="numeric" autoComplete="cc-exp-month" required={paymentMethod === 'credit_card'} />
            <Input name="exp-year" placeholder="AAAA" inputMode="numeric" autoComplete="cc-exp-year" required={paymentMethod === 'credit_card'} />
            <Input name="cvv" placeholder="CVV" inputMode="numeric" autoComplete="cc-csc" required={paymentMethod === 'credit_card'} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
