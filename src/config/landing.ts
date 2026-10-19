/**
 * Dados do produto exibidos na landing pública (`/`).
 *
 * São dados do fornecedor do produto (TechLab+), não da loja que usa o
 * sistema: por isso não vêm de `dadosEmpresa` nem do banco. Contatos vazios
 * fazem a landing omitir o link correspondente, em vez de publicar um
 * endereço inválido.
 */
export const PRODUTO = {
  nome: "TechLab+ Sapataria",
  descricaoCurta: "Sistema de gestão para sapatarias: ordens de serviço, caixa, estoque e WhatsApp.",
  /** Link `https://wa.me/55…` do comercial. Vazio até ser definido. */
  whatsappUrl: "",
  /** E-mail comercial. Vazio até ser definido. */
  email: "",
  /** Entrada do sistema para quem já é cliente. */
  urlLogin: "/login",
  /** Rodapé: razão social e CNPJ do fornecedor. Vazios até serem definidos. */
  razaoSocial: "",
  cnpj: "",
} as const;

export type Produto = typeof PRODUTO;
