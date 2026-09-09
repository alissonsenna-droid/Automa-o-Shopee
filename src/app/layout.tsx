import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DropBR — Central de Dropshipping',
  description: 'Sistema central de produtos, ofertas, checkout, pagamentos, fornecedores e rastreamento.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
