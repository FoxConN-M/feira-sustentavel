import type {
  Produtor,
  ProdutoComProdutor,
  ProdutoVitrine,
  RelatorioRepassesResponse,
  VendaRecente,
} from '../types.ts';

const STORAGE_KEY = 'feira_sustentavel_github_pages_demo_v1';
const DEMO_FAMILIES = [
  ['Sítio Verde', [['Alface crespa', 'maço', 700, 16], ['Couve-manteiga', 'maço', 650, 14], ['Coentro', 'maço', 350, 20]]],
  ['Raízes do Vale', [['Batata-doce', 'kg', 550, 30], ['Mandioca', 'kg', 600, 25], ['Inhame', 'kg', 800, 20]]],
  ['Horta Boa Terra', [['Tomate', 'kg', 890, 25], ['Pimentão verde', 'kg', 1000, 12], ['Pepino', 'kg', 600, 16]]],
  ['Horta das Águas', [['Abóbora', 'kg', 450, 20], ['Chuchu', 'kg', 500, 18], ['Maxixe', 'kg', 700, 14]]],
  ['Sementes do Sol', [['Cenoura', 'kg', 700, 20], ['Beterraba', 'kg', 700, 18], ['Rabanete', 'maço', 550, 12]]],
  ['Horta Esperança', [['Quiabo', 'kg', 1000, 15], ['Jiló', 'kg', 850, 12], ['Berinjela', 'kg', 800, 14]]],
  ['Recanto das Folhas', [['Rúcula', 'maço', 600, 12], ['Mostarda', 'maço', 600, 10], ['Cebolinha', 'maço', 300, 18]]],
  ['Lagoa Grande', [['Feijão verde', 'kg', 1200, 16], ['Feijão-de-corda verde', 'kg', 1100, 18], ['Milho verde', 'un', 300, 30]]],
  ['Horta do Campo', [['Cebola', 'kg', 850, 22], ['Alho', 'un', 200, 40], ['Batata inglesa', 'kg', 700, 24]]],
  ['Serra Azul', [['Couve-flor', 'un', 1200, 8], ['Repolho', 'un', 800, 12], ['Brócolis', 'maço', 1000, 10]]],
  ['Vida na Roça', [['Vagem', 'kg', 1200, 12], ['Ervilha-torta', 'kg', 1400, 10], ['Pimentão vermelho', 'kg', 1400, 9]]],
  ['Novo Horizonte', [['Tomate-cereja', 'kg', 1500, 10], ['Abobrinha', 'kg', 800, 16], ['Pimenta-de-cheiro', 'kg', 1200, 8]]],
  ['Horta da Mata', [['Alface americana', 'maço', 800, 12], ['Acelga', 'un', 900, 8], ['Chicória', 'maço', 600, 10]]],
  ['Riacho Doce', [['Cará', 'kg', 900, 16], ['Gengibre', 'kg', 1600, 7], ['Cúrcuma fresca', 'kg', 1800, 6]]],
  ['Santa Luzia', [['Feijão-guandu verde', 'kg', 1000, 14], ['Amendoim verde', 'kg', 1400, 12], ['Quiabo miúdo', 'kg', 1100, 10]]],
] as const;

interface DemoState {
  produtos: ProdutoComProdutor[];
  vendas: VendaRecente[];
}

const produtores: Produtor[] = DEMO_FAMILIES.map(([familia], index) => ({
  id: index + 1,
  nome: `Produtor de teste ${String(index + 1).padStart(2, '0')}`,
  familia: `Família de teste ${String(index + 1).padStart(2, '0')} · ${familia}`,
  categoria: 'Agrícola',
  localidade: 'Comunidade de teste',
  ativo: true,
}));

function createInitialState(): DemoState {
  let id = 1;
  const produtos = DEMO_FAMILIES.flatMap(([familia, itens], producerIndex) =>
    itens.map(([nome, unidade, precoUnitarioCentavos, estoqueSaldo]) => {
      const produtor = produtores[producerIndex];
      return {
        id: id++,
        produtorId: produtor.id,
        nome,
        categoria: 'Agrícola',
        unidade,
        precoUnitarioCentavos,
        estoqueSaldo,
        ativo: true,
        updatedAt: new Date(0).toISOString(),
        produtorNome: produtor.nome,
        produtorFamilia: produtor.familia,
        produtorLocalidade: produtor.localidade,
      };
    })
  );
  return { produtos, vendas: [] };
}

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as DemoState;
    if (!Array.isArray(parsed.produtos) || !Array.isArray(parsed.vendas)) {
      return createInitialState();
    }
    return parsed;
  } catch {
    return createInitialState();
  }
}

function saveState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The demo remains usable in memory when browser storage is unavailable.
  }
}

export function loadDemoProducers(): Produtor[] {
  return produtores;
}

export function loadDemoProducts(): ProdutoComProdutor[] {
  return loadState().produtos.filter((item) => item.ativo);
}

export function loadDemoSales(): VendaRecente[] {
  return [...loadState().vendas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function demoShowcase(): ProdutoVitrine[] {
  return loadDemoProducts().map((item) => ({
    id: item.id,
    nome: item.nome,
    categoria: item.categoria,
    unidade: item.unidade,
    precoUnitarioCentavos: item.precoUnitarioCentavos,
    estoqueSaldo: item.estoqueSaldo,
    produtorFamilia: item.produtorFamilia,
    produtorLocalidade: item.produtorLocalidade,
  }));
}

export function recordDemoSale(input: {
  produtoId: number;
  quantidade: number;
  clientSaleId: string;
}): { sale: VendaRecente; product: ProdutoComProdutor } | null {
  const state = loadState();
  const duplicate = state.vendas.find((sale) => sale.clientSaleId === input.clientSaleId);
  if (duplicate) {
    const duplicateProduct = state.produtos.find((product) => product.id === duplicate.produtoId);
    return duplicateProduct ? { sale: duplicate, product: duplicateProduct } : null;
  }
  const product = state.produtos.find((item) => item.id === input.produtoId && item.ativo);
  if (!product || input.quantidade <= 0 || input.quantidade > product.estoqueSaldo) return null;
  product.estoqueSaldo -= input.quantidade;
  product.updatedAt = new Date().toISOString();
  const sale: VendaRecente = {
    id: Date.now(),
    produtoId: product.id,
    produtorId: product.produtorId,
    quantidade: input.quantidade,
    precoUnitarioCentavos: product.precoUnitarioCentavos,
    valorTotalCentavos: product.precoUnitarioCentavos * input.quantidade,
    clientSaleId: input.clientSaleId,
    createdAt: new Date().toISOString(),
    produtoNome: product.nome,
    produtoUnidade: product.unidade,
    produtorNome: product.produtorNome,
    produtorFamilia: product.produtorFamilia,
  };
  state.vendas.push(sale);
  saveState(state);
  return { sale, product };
}

export function createDemoProduct(input: {
  produtorId: number;
  nome: string;
  categoria: 'Agrícola' | 'Artesanato';
  unidade: 'kg' | 'un' | 'maço' | 'pote' | 'litro';
  precoUnitarioCentavos: number;
  estoqueSaldo: number;
}): void {
  const state = loadState();
  const produtor = produtores.find((item) => item.id === input.produtorId);
  if (!produtor) return;
  state.produtos.push({
    ...input,
    id: Math.max(0, ...state.produtos.map((item) => item.id)) + 1,
    ativo: true,
    updatedAt: new Date().toISOString(),
    produtorNome: produtor.nome,
    produtorFamilia: produtor.familia,
    produtorLocalidade: produtor.localidade,
  });
  saveState(state);
}

export function adjustDemoStock(produtoId: number, estoqueSaldo: number): boolean {
  const state = loadState();
  const product = state.produtos.find((item) => item.id === produtoId);
  if (!product || estoqueSaldo < 0) return false;
  product.estoqueSaldo = estoqueSaldo;
  product.updatedAt = new Date().toISOString();
  saveState(state);
  return true;
}

export function createDemoReport(
  periodo: 'hoje' | '7dias' | 'tudo'
): RelatorioRepassesResponse {
  const agora = new Date();
  const inicio = new Date(agora);
  if (periodo === 'hoje') inicio.setHours(0, 0, 0, 0);
  if (periodo === '7dias') inicio.setDate(inicio.getDate() - 7);
  const vendas = loadDemoSales().filter(
    (sale) => periodo === 'tudo' || new Date(sale.createdAt) >= inicio
  );
  const porProdutor = new Map<number, RelatorioRepassesResponse['repasses'][number]>();
  for (const sale of vendas) {
    let resumo = porProdutor.get(sale.produtorId);
    if (!resumo) {
      const producer = produtores.find((item) => item.id === sale.produtorId)!;
      resumo = {
        produtorId: producer.id,
        nome: producer.nome,
        familia: producer.familia,
        categoria: producer.categoria,
        localidade: producer.localidade,
        totalTransacoes: 0,
        totalItensVendidos: 0,
        valorRepasseCentavos: 0,
        itensDetalhados: [],
      };
      porProdutor.set(producer.id, resumo);
    }
    resumo.totalTransacoes += 1;
    resumo.totalItensVendidos += sale.quantidade;
    resumo.valorRepasseCentavos += sale.valorTotalCentavos;
    const item = resumo.itensDetalhados.find((detail) => detail.produtoId === sale.produtoId);
    if (item) {
      item.quantidade += sale.quantidade;
      item.totalCentavos += sale.valorTotalCentavos;
    } else {
      resumo.itensDetalhados.push({
        produtoId: sale.produtoId,
        nome: sale.produtoNome,
        unidade: sale.produtoUnidade,
        quantidade: sale.quantidade,
        totalCentavos: sale.valorTotalCentavos,
      });
    }
  }
  return {
    periodo,
    totalGeralCentavos: vendas.reduce((sum, sale) => sum + sale.valorTotalCentavos, 0),
    totalGeralTransacoes: vendas.length,
    totalGeralItens: vendas.reduce((sum, sale) => sum + sale.quantidade, 0),
    produtoresAtivos: porProdutor.size,
    repasses: [...porProdutor.values()],
  };
}
