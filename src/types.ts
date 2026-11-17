export type AppTab = 'inicio' | 'vendas' | 'repasses';

export interface CoordinatorUser {
  uid: string;
  email: string;
  name: string;
  role: string;
}

export interface Produtor {
  id: number;
  nome: string;
  familia: string;
  categoria: string;
  localidade: string;
  ativo: boolean;
}

export interface ProdutoVitrine {
  id: number;
  nome: string;
  categoria: 'Agrícola' | 'Artesanato' | string;
  unidade: string;
  precoUnitarioCentavos: number;
  estoqueSaldo: number;
  produtorFamilia: string;
  produtorLocalidade: string;
}

export interface ProdutoComProdutor {
  id: number;
  produtorId: number;
  nome: string;
  categoria: 'Agrícola' | 'Artesanato' | string;
  unidade: string;
  precoUnitarioCentavos: number;
  estoqueSaldo: number;
  ativo: boolean;
  updatedAt: string;
  produtorNome: string;
  produtorFamilia: string;
  produtorLocalidade: string;
}

export interface VendaRecente {
  id: number;
  produtoId: number;
  produtorId: number;
  quantidade: number;
  precoUnitarioCentavos: number;
  valorTotalCentavos: number;
  clientSaleId: string;
  createdAt: string;
  produtoNome: string;
  produtoUnidade: string;
  produtorNome: string;
  produtorFamilia: string;
}

export interface ItemRepasseDetalhe {
  produtoId: number;
  nome: string;
  unidade: string;
  quantidade: number;
  totalCentavos: number;
}

export interface RepasseProdutor {
  produtorId: number;
  nome: string;
  familia: string;
  categoria: string;
  localidade: string;
  totalTransacoes: number;
  totalItensVendidos: number;
  valorRepasseCentavos: number;
  itensDetalhados: ItemRepasseDetalhe[];
}

export interface RelatorioRepassesResponse {
  periodo: string;
  totalGeralCentavos: number;
  totalGeralTransacoes: number;
  totalGeralItens: number;
  produtoresAtivos: number;
  repasses: RepasseProdutor[];
}

export interface OfflineSaleItem {
  clientSaleId: string;
  produtoId: number;
  produtoNome: string;
  produtorFamilia: string;
  unidade: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  valorTotalCentavos: number;
  createdAtIso: string;
}
