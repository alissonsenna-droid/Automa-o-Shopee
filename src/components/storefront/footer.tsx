import Link from 'next/link';

export function StorefrontFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <h3 className="mb-3 font-heading font-bold text-foreground">Fazzo</h3>
          <p className="text-muted-foreground">
            Casa, moda, eletrônicos, pet e beleza em um só lugar, com entrega rastreada do início ao fim.
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-heading font-bold text-foreground">Ajuda</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link href="/pedido" className="hover:text-foreground">
                Rastrear pedido
              </Link>
            </li>
            <li>
              <Link href="/termos" className="hover:text-foreground">
                Termos de uso
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="hover:text-foreground">
                Política de privacidade
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-heading font-bold text-foreground">Contato</h3>
          <p className="text-muted-foreground">@fazzo.br</p>
        </div>
      </div>
      <p className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Fazzo. Todos os direitos reservados.
      </p>
    </footer>
  );
}
