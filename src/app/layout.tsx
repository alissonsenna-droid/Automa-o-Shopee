import type { Metadata } from 'next';
import './globals.css';

// As fontes são carregadas via <link> (Google Fonts CSS2 API) em vez de
// `next/font/google`: este ambiente de build não tem acesso de rede confiável
// a fonts.googleapis.com no momento da compilação (o loader do next/font busca
// os arquivos de fonte durante `next build`), o que quebra o build. Com <link>
// o navegador do usuário final busca a fonte em runtime — funciona em qualquer
// ambiente de build, ao custo de um FOUT/preconnect em vez de self-hosting.
export const metadata: Metadata = {
  title: 'Fazzo — Chegou rápido, chegou certo.',
  description: 'Fazzo: casa, moda, eletrônicos, pet e beleza em um só lugar, com entrega rastreada do início ao fim.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- regra pensada pro Pages Router; aqui é o layout raiz do App Router, aplica pro app inteiro */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
