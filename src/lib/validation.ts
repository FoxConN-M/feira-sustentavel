import { z } from 'zod';
import { RepasseProdutor } from '../types.ts';

export const produtoFormSchema = z.object({
  produtorId: z.number().int().positive('Selecione uma família produtora.'),
  nome: z
    .string()
    .trim()
    .min(2, 'Informe ao menos 2 caracteres para o nome.')
    .max(120, 'Máximo de 120 caracteres.'),
  categoria: z.enum(['Agrícola', 'Artesanato']),
  unidade: z.enum(['kg', 'un', 'maço', 'pote', 'litro']),
  precoReais: z
    .number()
    .min(0.5, 'Preço mínimo de R$ 0,50.')
    .max(10000, 'Preço acima do permitido.'),
  estoqueSaldo: z
    .number()
    .int('Informe um número inteiro para o estoque.')
    .min(0, 'O estoque não pode ser negativo.')
    .max(100000, 'Estoque acima do limite.'),
});

export const vendaFormSchema = (estoqueDisponivel: number) =>
  z.object({
    produtoId: z.number().int().positive('Selecione um produto.'),
    quantidade: z
      .number()
      .int('A quantidade deve ser inteira.')
      .min(1, 'Quantidade mínima é 1.')
      .max(
        Math.max(0, estoqueDisponivel),
        estoqueDisponivel <= 0
          ? 'Produto sem saldo em estoque.'
          : `Máximo disponível em estoque: ${estoqueDisponivel}.`
      ),
  });

export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

export function formatDateTimeBR(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function buildRepassesCsv(repasses: RepasseProdutor[], periodoLabel: string): string {
  const header = [
    'Produtor',
    'Familia',
    'Categoria',
    'Localidade',
    'Transacoes',
    'Itens Vendidos',
    'Valor Repasse (R$)',
    'Periodo',
  ].join(';');

  const escapeCsv = (value: string | number) => {
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = repasses.map((r) =>
    [
      escapeCsv(r.nome),
      escapeCsv(r.familia),
      escapeCsv(r.categoria),
      escapeCsv(r.localidade),
      r.totalTransacoes,
      r.totalItensVendidos,
      escapeCsv((r.valorRepasseCentavos / 100).toFixed(2).replace('.', ',')),
      escapeCsv(periodoLabel),
    ].join(';')
  );

  return '\uFEFF' + [header, ...rows].join('\n');
}
