import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina classes Tailwind com resolução de conflitos. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata um valor em centavos (BRL) como string R$ 0,00. */
export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte um valor decimal (ex: 129.9) para centavos inteiros (12990). */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

/** Gera um número de pedido legível e não sequencial (evita enumeração). */
export function generateOrderNumber(): string {
  const timePart = Date.now().toString(36).toUpperCase();
  const randPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DB-${timePart}-${randPart}`;
}
