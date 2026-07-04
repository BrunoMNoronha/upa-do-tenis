import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from './prisma';
import { 
  getEstatisticasGlobaisEstoque,
  getListaInsumosCriticos,
  getExtratoMovimentacoes,
  getResumoPorTipo,
  getResumoAlertasEstoque
} from './relatorio-estoque-service';
import { TipoMovimentacao, OrigemMovimentacao, criarMovimentacaoEstoque } from './movimentacao-estoque-service';
import { parseDataLocal } from './date-range';

describe('Relatório Global de Estoque', () => {
  let insumoNormalId: string;
  let insumoAbaixoMinimoId: string;
  let insumoZeradoId: string;

  beforeEach(async () => {
    // Limpar o banco de dados antes de cada teste
    await prisma.movimentacaoEstoqueInsumo.deleteMany();
    await prisma.insumoItemOrdem.deleteMany();
    await prisma.insumo.deleteMany();

    // Criar insumo normal
    const insumoNormal = await prisma.insumo.create({
      data: {
        nome: 'Insumo Normal',
        unidadeMedida: 'UN',
        quantidadeEstoque: 10,
        estoqueMinimo: 5,
        custoUnitario: 5.50,
      }
    });
    insumoNormalId = insumoNormal.id;

    // Criar insumo abaixo do mínimo
    const insumoAbaixoMinimo = await prisma.insumo.create({
      data: {
        nome: 'Insumo Abaixo Minimo',
        unidadeMedida: 'KG',
        quantidadeEstoque: 2,
        estoqueMinimo: 5,
        custoUnitario: 10.00,
      }
    });
    insumoAbaixoMinimoId = insumoAbaixoMinimo.id;

    // Criar insumo zerado
    const insumoZerado = await prisma.insumo.create({
      data: {
        nome: 'Insumo Zerado',
        unidadeMedida: 'MT',
        quantidadeEstoque: 0,
        estoqueMinimo: 10,
        custoUnitario: 2.00,
      }
    });
    insumoZeradoId = insumoZerado.id;

    // Criar algumas movimentações
    await criarMovimentacaoEstoque({
      insumoId: insumoNormalId,
      tipo: TipoMovimentacao.ENTRADA_MANUAL,
      origem: OrigemMovimentacao.MANUAL,
      quantidade: 5,
    }); // saldo era 10, mas vamos apenas registrar a movimentação e ignorar que o saldo inicial não reflete o histórico aqui

    await criarMovimentacaoEstoque({
      insumoId: insumoAbaixoMinimoId,
      tipo: TipoMovimentacao.SAIDA_MANUAL,
      origem: OrigemMovimentacao.MANUAL,
      quantidade: 1,
    });
  });

  afterEach(async () => {
    await prisma.movimentacaoEstoqueInsumo.deleteMany();
    await prisma.insumoItemOrdem.deleteMany();
    await prisma.insumo.deleteMany();
  });

  it('deve calcular estatisticas globais de estoque', async () => {
    const estatisticas = await getEstatisticasGlobaisEstoque();
    
    // Insumos: Normal(10), AbaixoMinimo(1) (sofreu saida de 1, entao 2-1 = 1), Zerado(0)
    // Custo: Normal (15 * 5.50 = 82.50), AbaixoMinimo (1 * 10.00 = 10.00), Zerado (0 * 2.00 = 0)
    // Valor Estimado: 82.50 + 10.00 = 92.50

    expect(estatisticas.totalInsumosAtivos).toBe(3);
    expect(estatisticas.totalInsumosZerados).toBe(1);
    expect(estatisticas.totalInsumosAbaixoMinimo).toBe(1);
    expect(estatisticas.valorTotalEstimado).toBe(92.5);
  });

  it('deve retornar alertas para o dashboard', async () => {
    const alertas = await getResumoAlertasEstoque();

    expect(alertas.totalInsumosZerados).toBe(1);
    expect(alertas.totalInsumosAbaixoMinimo).toBe(1);
    expect(alertas.totalCriticos).toBe(2);
  });

  it('deve listar insumos criticos (zerados e abaixo do minimo)', async () => {
    const criticos = await getListaInsumosCriticos();

    expect(criticos.length).toBe(2);
    
    const zerado = criticos.find(c => c.status === 'ZERADO');
    expect(zerado).toBeDefined();
    expect(zerado?.nome).toBe('Insumo Zerado');
    expect(zerado?.quantidadeEstoque).toBe(0);

    const abaixo = criticos.find(c => c.status === 'ABAIXO_MINIMO');
    expect(abaixo).toBeDefined();
    expect(abaixo?.nome).toBe('Insumo Abaixo Minimo');
    expect(abaixo?.quantidadeEstoque).toBe(1);
  });

  it('deve listar as ultimas movimentacoes consolidadas', async () => {
    const movimentacoes = await getExtratoMovimentacoes({}, 10);
    
    expect(movimentacoes.length).toBe(2);
    
    // As mais recentes primeiro
    expect(movimentacoes[0].tipo).toBe(TipoMovimentacao.SAIDA_MANUAL);
    expect(movimentacoes[1].tipo).toBe(TipoMovimentacao.ENTRADA_MANUAL);

    // Testar filtro
    const filtroSaida = await getExtratoMovimentacoes({ tipo: TipoMovimentacao.SAIDA_MANUAL });
    expect(filtroSaida.length).toBe(1);
    expect(filtroSaida[0].tipo).toBe(TipoMovimentacao.SAIDA_MANUAL);
  });

  it('deve incluir movimentacoes criadas hoje quando o filtro termina hoje', async () => {
    // Simula o filtro "Hoje": data inicial e final iguais à data atual,
    // parseadas como YYYY-MM-DD (mesmo formato enviado pela UI)
    const agora = new Date();
    const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const hoje = parseDataLocal(hojeStr);

    const movimentacoes = await getExtratoMovimentacoes({
      dataInicio: hoje,
      dataFim: hoje,
    });

    // As movimentações do beforeEach foram criadas agora e devem aparecer
    expect(movimentacoes.length).toBe(2);

    const resumo = await getResumoPorTipo({ dataInicio: hoje, dataFim: hoje });
    expect(resumo.length).toBe(2);

    // Consistência: filtro "Hoje" retorna o mesmo total que sem filtro
    const semFiltro = await getExtratoMovimentacoes({});
    expect(movimentacoes.length).toBe(semFiltro.length);
  });

  it('deve resumir movimentacoes por tipo', async () => {
    const resumo = await getResumoPorTipo();

    expect(resumo.length).toBe(2);
    
    const entrada = resumo.find(r => r.tipo === TipoMovimentacao.ENTRADA_MANUAL);
    expect(entrada?.quantidadeTotal).toBe(5);
    expect(entrada?.custoTotal).toBe(27.5); // 5 * 5.50

    const saida = resumo.find(r => r.tipo === TipoMovimentacao.SAIDA_MANUAL);
    expect(saida?.quantidadeTotal).toBe(1);
    expect(saida?.custoTotal).toBe(10); // 1 * 10.00
  });
});
