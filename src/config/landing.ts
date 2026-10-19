/**
 * Dados do produto exibidos na landing pública (`/`).
 *
 * São dados do fornecedor do produto (TechLab+), não da loja que usa o
 * sistema: por isso não vêm de `dadosEmpresa` nem do banco.
 *
 * O WhatsApp comercial NÃO fica aqui: vem da variável de ambiente
 * `LANDING_WHATSAPP` (ver `src/lib/landing-contato.ts`), para mudar por
 * escopo sem alterar código. Contatos vazios fazem a landing omitir o link
 * correspondente, em vez de publicar um endereço inválido.
 */
export const PRODUTO = {
  nome: "TechLab+ Sapataria",
  descricaoCurta: "Sistema de gestão para sapatarias: ordens de serviço, caixa, estoque e WhatsApp.",
  /** Domínio público da landing; base das URLs canônica e Open Graph. */
  urlSite: "https://sapataria.dev2bless.tech",
  /** Texto pré-preenchido ao abrir o WhatsApp pelos botões da landing. */
  mensagemWhatsapp: "Olá! Quero agendar uma demonstração do TechLab+ Sapataria.",
  /** E-mail comercial. Vazio até ser definido. */
  email: "",
  /** Entrada do sistema para quem já é cliente. */
  urlLogin: "/login",
  /** Rodapé: razão social e CNPJ do fornecedor. Vazios até serem definidos. */
  razaoSocial: "",
  cnpj: "",
} as const;

export type Produto = typeof PRODUTO;
