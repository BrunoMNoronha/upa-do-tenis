import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const servicosCatalogo = [
  ["Limpeza simples", "Limpeza externa para sujeira leve.", 30],
  ["Limpeza completa", "Limpeza interna e externa do calçado.", 50],
  ["Higienização antibacteriana", "Higienização profunda com tratamento antibacteriano.", 65],
  ["Impermeabilização", "Aplicação de proteção contra água e manchas.", 45],
  ["Hidratação de couro", "Limpeza e hidratação para couro natural.", 45],
  ["Revitalização de camurça", "Escovação e revitalização de camurça.", 55],
  ["Pintura de couro", "Pintura completa ou retoque em couro.", 80],
  ["Pintura de entressola", "Retoque e acabamento da entressola.", 60],
  ["Troca de sola", "Substituição completa da sola do calçado.", 120],
  ["Troca de meia-sola", "Substituição da parte frontal ou traseira da sola.", 85],
  ["Troca de salto", "Substituição de salto danificado.", 70],
  ["Reparo de salto", "Reparo estrutural de salto com desgaste.", 45],
  ["Troca de tacão", "Substituição do tacão de sapato ou bota.", 35],
  ["Colagem de sola", "Recolagem de sola parcialmente descolada.", 35],
  ["Colagem de palmilha", "Fixação ou substituição da palmilha interna.", 25],
  ["Costura de reforço", "Costura de reforço em partes soltas.", 25],
  ["Costura de biqueira", "Reparo de costura na região frontal.", 35],
  ["Costura de lateral", "Reparo de costura nas laterais do calçado.", 35],
  ["Troca de cadarço", "Instalação de novo par de cadarços.", 20],
  ["Troca de ilhós", "Substituição de ilhós danificados.", 30],
  ["Troca de zíper", "Substituição de zíper em bota ou bolsa.", 75],
  ["Reparo de zíper", "Destravamento e reparo de zíper.", 35],
  ["Troca de elástico", "Substituição de elástico de ajuste.", 40],
  ["Ajuste de tira", "Ajuste de comprimento ou fixação de tira.", 35],
  ["Reparo de fivela", "Troca ou fixação de fivela.", 30],
  ["Alongamento de calçado", "Alongamento leve para melhorar o conforto.", 55],
  ["Alargamento de calçado", "Alargamento controlado da forma do calçado.", 55],
  ["Troca de forro", "Substituição parcial ou total do forro interno.", 95],
  ["Reparo de forro", "Reparo de rasgos e desgastes no forro.", 50],
  ["Troca de palmilha", "Instalação de palmilha nova.", 35],
  ["Reparo de biqueira", "Reparo estrutural da biqueira.", 50],
  ["Reparo de contraforte", "Reforço do contraforte interno.", 45],
  ["Recuperação de bolsa", "Limpeza e pequenos reparos em bolsa.", 90],
  ["Recuperação de mochila", "Limpeza e pequenos reparos em mochila.", 80],
  ["Polimento de sapato", "Polimento e acabamento final.", 25],
] as const;

export const produtosCatalogo = [
  ["Cadarço redondo preto 90 cm", "Par de cadarços redondos para calçados sociais.", 12, 20],
  ["Cadarço redondo preto 120 cm", "Par de cadarços redondos para tênis.", 15, 20],
  ["Cadarço chato branco 120 cm", "Par de cadarços chatos para tênis.", 15, 20],
  ["Cadarço chato colorido 120 cm", "Par de cadarços coloridos para tênis.", 18, 15],
  ["Palmilha conforto masculina", "Palmilha anatômica para calçados masculinos.", 35, 12],
  ["Palmilha conforto feminina", "Palmilha anatômica para calçados femininos.", 35, 12],
  ["Palmilha esportiva", "Palmilha com amortecimento para tênis.", 45, 10],
  ["Palmilha infantil", "Palmilha anatômica para calçados infantis.", 25, 10],
  ["Calcanheira de gel", "Calcanheira de gel para absorção de impacto.", 22, 15],
  ["Protetor de calcanhar", "Protetor autoadesivo para evitar atrito.", 15, 20],
  ["Forma para sapato masculina", "Forma plástica para conservação de sapatos.", 45, 8],
  ["Forma para sapato feminina", "Forma plástica para conservação de calçados.", 40, 8],
  ["Kit brilho para couro", "Kit com aplicador e produto para brilho.", 28, 10],
  ["Creme preto para couro", "Creme para hidratação e brilho de couro preto.", 20, 15],
  ["Creme marrom para couro", "Creme para hidratação e brilho de couro marrom.", 20, 15],
  ["Creme neutro para couro", "Creme neutro para hidratação de couro.", 20, 15],
  ["Impermeabilizante spray 200 ml", "Spray protetor para calçados e bolsas.", 42, 10],
  ["Espuma limpadora 150 ml", "Espuma para limpeza de calçados.", 30, 12],
  ["Escova para camurça", "Escova específica para camurça e nobuck.", 25, 10],
  ["Escova aplicadora", "Escova pequena para aplicação de cremes.", 12, 15],
  ["Saco protetor para calçados", "Saco de tecido para armazenamento.", 18, 20],
  ["Kit limpeza para tênis", "Kit com escova, espuma e pano.", 55, 8],
  ["Cadarço elástico preto", "Par de cadarços elásticos sem amarração.", 22, 12],
  ["Cadarço elástico branco", "Par de cadarços elásticos sem amarração.", 22, 12],
  ["Protetor de biqueira", "Protetor interno para reduzir desgaste frontal.", 18, 12],
  ["Meia palmilha de gel", "Meia palmilha para conforto na parte frontal.", 20, 12],
  ["Organizador de calçados", "Organizador plástico individual.", 25, 10],
  ["Flanela para polimento", "Flanela macia para acabamento.", 8, 30],
  ["Cordão para bolsa", "Cordão de reposição para alça de bolsa.", 18, 10],
  ["Fivela decorativa pequena", "Fivela de reposição para calçados e bolsas.", 15, 12],
  ["Fivela decorativa média", "Fivela de reposição para bolsas e botas.", 20, 10],
  ["Zíper para bota 20 cm", "Zíper de reposição para botas.", 25, 10],
  ["Zíper para bolsa 25 cm", "Zíper de reposição para bolsas.", 22, 10],
  ["Kit protetor de chuva", "Capa protetora reutilizável para calçados.", 35, 8],
  ["Limpador de sola", "Produto para limpeza de solados.", 24, 12],
] as const;

export const insumosCatalogo = [
  ["Cola de contato", "Adesivo para colagem de sola e materiais diversos.", "kg", 8, 2, 42],
  ["Cola de borracha", "Adesivo específico para solados de borracha.", "kg", 6, 2, 48],
  ["Cola instantânea", "Adesivo instantâneo para pequenos reparos.", "un", 24, 6, 8],
  ["Solvente para cola", "Solvente para limpeza de resíduos de adesivo.", "l", 5, 1, 28],
  ["Removedor de tinta", "Produto para remoção controlada de pintura.", "l", 3, 1, 35],
  ["Detergente neutro", "Detergente para limpeza geral de calçados.", "l", 10, 3, 12],
  ["Desengraxante", "Produto para remoção de gordura e sujeira pesada.", "l", 6, 2, 22],
  ["Sanitizante", "Produto para higienização interna.", "l", 8, 2, 26],
  ["Impermeabilizante líquido", "Produto para proteção contra umidade.", "l", 6, 2, 32],
  ["Hidratante para couro", "Creme profissional para hidratação de couro.", "l", 5, 1, 38],
  ["Tinta preta para couro", "Tinta profissional para couro.", "l", 4, 1, 65],
  ["Tinta branca para couro", "Tinta profissional para couro.", "l", 4, 1, 65],
  ["Tinta marrom para couro", "Tinta profissional para couro.", "l", 3, 1, 65],
  ["Tinta azul para couro", "Tinta profissional para couro.", "l", 2, 1, 65],
  ["Tinta vermelha para couro", "Tinta profissional para couro.", "l", 2, 1, 65],
  ["Pigmento preto", "Pigmento concentrado para ajustes de cor.", "kg", 2, 0.5, 85],
  ["Pigmento branco", "Pigmento concentrado para ajustes de cor.", "kg", 2, 0.5, 85],
  ["Pigmento marrom", "Pigmento concentrado para ajustes de cor.", "kg", 2, 0.5, 85],
  ["Borracha para sola", "Borracha em placa para confecção de solados.", "m²", 12, 3, 48],
  ["Borracha para tacão", "Borracha para substituição de tacões.", "kg", 8, 2, 42],
  ["EVA para palmilha", "Placa de EVA para confecção de palmilhas.", "m²", 10, 3, 28],
  ["Couro sintético preto", "Material para reparos e revestimentos.", "m", 15, 4, 35],
  ["Couro sintético marrom", "Material para reparos e revestimentos.", "m", 10, 3, 35],
  ["Forro de calçado", "Tecido para substituição de forro interno.", "m", 20, 5, 24],
  ["Linha encerada preta", "Linha resistente para costura de couro.", "carretel", 12, 3, 18],
  ["Linha encerada marrom", "Linha resistente para costura de couro.", "carretel", 8, 2, 18],
  ["Linha de nylon", "Linha resistente para costuras gerais.", "carretel", 12, 3, 15],
  ["Agulha para couro", "Agulha reforçada para costura manual.", "un", 30, 8, 3],
  ["Agulha para máquina", "Agulha para máquina de costura de couro.", "un", 20, 5, 6],
  ["Zíper preto", "Zíper para reparos em botas e bolsas.", "m", 15, 4, 12],
  ["Elástico preto", "Elástico para ajustes e reparos.", "m", 20, 5, 8],
  ["Ilhós metálico", "Ilhós para cadarços e acabamento.", "cento", 5, 1, 32],
  ["Rebite metálico", "Rebite para fixação em bolsas e calçados.", "cento", 4, 1, 38],
  ["Fivela metálica", "Fivela para substituição e acabamento.", "un", 25, 6, 7],
  ["Lixa fina", "Lixa para acabamento de couro e borracha.", "un", 50, 15, 2],
] as const;

async function criarSeNaoExiste(
  buscar: () => Promise<unknown>,
  criar: () => Promise<unknown>,
): Promise<boolean> {
  const existente = await buscar();
  if (existente) return false;
  await criar();
  return true;
}

function validarCatalogo() {
  const catalogos = [
    ["serviços", servicosCatalogo],
    ["produtos", produtosCatalogo],
    ["insumos", insumosCatalogo],
  ] as const;

  for (const [entidade, registros] of catalogos) {
    if (registros.length < 30 || registros.length > 50) {
      throw new Error(`O catálogo de ${entidade} deve ter entre 30 e 50 registros.`);
    }

    const nomes = registros.map(([nome]) => nome);
    if (new Set(nomes).size !== nomes.length) {
      throw new Error(`O catálogo de ${entidade} possui nomes duplicados.`);
    }
  }
}

async function inserirCatalogo() {
  validarCatalogo();

  let servicosCriados = 0;
  let produtosCriados = 0;
  let insumosCriados = 0;

  for (const [nome, descricao, precoBase] of servicosCatalogo) {
    if (await criarSeNaoExiste(
      () => prisma.servico.findFirst({ where: { nome } }),
      () => prisma.servico.create({ data: { nome, descricao, precoBase, ativo: true } }),
    )) {
      servicosCriados += 1;
    }
  }

  for (const [nome, descricao, precoVenda, quantidadeEstoque] of produtosCatalogo) {
    if (await criarSeNaoExiste(
      () => prisma.produto.findFirst({ where: { nome } }),
      () => prisma.produto.create({
        data: { nome, descricao, precoVenda, quantidadeEstoque, ativo: true },
      }),
    )) {
      produtosCriados += 1;
    }
  }

  for (const [nome, descricao, unidadeMedida, quantidadeEstoque, estoqueMinimo, custoUnitario] of insumosCatalogo) {
    if (await criarSeNaoExiste(
      () => prisma.insumo.findFirst({ where: { nome } }),
      () => prisma.insumo.create({
        data: {
          nome,
          descricao,
          unidadeMedida,
          quantidadeEstoque,
          estoqueMinimo,
          custoUnitario,
          ativo: true,
        },
      }),
    )) {
      insumosCriados += 1;
    }
  }

  console.log(`Serviços criados: ${servicosCriados}/${servicosCatalogo.length}`);
  console.log(`Produtos criados: ${produtosCriados}/${produtosCatalogo.length}`);
  console.log(`Insumos criados: ${insumosCriados}/${insumosCatalogo.length}`);
}

inserirCatalogo()
  .catch((error) => {
    console.error("Erro durante a carga do catálogo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
