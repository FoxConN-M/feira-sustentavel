# Feira Sustentável

PWA mobile-first da Associação de Produtores e Artesãos da Feira Sustentável. O MVP reúne a vitrine pública, o registro de vendas com baixa de estoque e a prestação de contas dos repasses por família produtora.

## Objetivos do MVP

- Facilitar o trabalho diário da coordenação em celulares e tablets.
- Exibir os produtos e as famílias produtoras em uma vitrine pública.
- Registrar vendas sem coletar dados pessoais de clientes.
- Atualizar o estoque e calcular os repasses de forma consistente.
- Continuar exibindo dados em cache e guardar vendas para sincronização quando a conexão voltar.

## Telas e fluxo de uso

### 1. Entrada e vitrine pública

A tela inicial apresenta a associação, as métricas informativas do projeto e a vitrine. A busca considera nome do produto, família e localidade. Os filtros rápidos permitem alternar entre todos os itens, produtos agrícolas e artesanato. A vitrine é somente leitura.

O card da coordenação e o botão **Entrar como Coordenação** representam o acesso ao painel. No modo atual do MVP, esse botão apenas alterna a visualização local; não há login ou autorização real associados a ele.

### 2. Registro de venda

A coordenação seleciona um produto, informa a quantidade com o campo numérico ou os botões de incremento e acompanha o subtotal. O aplicativo verifica o saldo disponível antes do envio. A API repete a validação na gravação e atualiza o estoque dentro da transação.

Sem conexão, a venda é gravada no IndexedDB do navegador e espelhada no `localStorage` como recuperação para navegadores sem IndexedDB. O Service Worker agenda Background Sync quando o navegador oferece essa API; a fila também é sincronizada ao recuperar a conexão ou abrir o aplicativo. As vendas são enviadas em ordem cronológica e usam um identificador de cliente para evitar duplicidade em tentativas repetidas.

### 3. Repasses e resultados

O relatório exibe o total em reais, a quantidade de vendas e as unidades comercializadas. Os períodos disponíveis são **Hoje**, **7 dias** e **Todo o período**. Cada família pode ser expandida para consultar os itens vendidos. A exportação CSV é feita no navegador.

## Acesso e autenticação

### Fluxo de autenticação previsto para a versão completa

O desenho funcional do projeto prevê autenticação da coordenação com Google via Firebase Authentication. Nesse fluxo, o cliente recebe um ID token após o login, envia o token no cabeçalho `Authorization: Bearer <token>` e a API o valida no servidor antes de liberar operações administrativas. A vitrine permanece pública e somente para leitura. Em uma implantação completa, o controle de acesso da coordenação deve ser aplicado no servidor para proteger cadastro, estoque, vendas e relatórios.

### Comportamento implementado neste MVP de teste

Por solicitação do MVP, a autenticação foi removida do cliente e da API. A aplicação não inicializa Firebase, não abre popup ou redirecionamento, não faz login automático e não consulta ou bloqueia por endereço de e-mail. O card da coordenação e as telas protegidas são apenas uma simulação visual. As rotas da API também aceitam chamadas sem token, inclusive as operações que gravam dados.

Assim, o fluxo descrito na seção anterior é uma referência de arquitetura futura, não uma capacidade ativa deste código. Este modo aberto serve para demonstração e teste; não deve ser usado para dados ou operações de produção.

## Arquitetura implementada

- **Frontend:** React 19, TypeScript, Vite e Tailwind CSS.
- **PWA:** `vite-plugin-pwa`, manifesto, ícones, Service Worker e atualização automática.
- **API:** FastAPI com validação dos corpos de requisição por Pydantic e respostas JSON no contrato camelCase.
- **Banco:** PostgreSQL acessado pelo SQLAlchemy 2 e driver `psycopg`.
- **Contrato da API:** JSON com propriedades camelCase para compatibilidade com o frontend.
- **Armazenamento offline:** cache de vitrine, catálogo e produtores no `localStorage`; fila de vendas no IndexedDB com espelho de compatibilidade.

## Estrutura do repositório

```text
backend/
  database.py       Conexão SQLAlchemy e dependência de sessão
  init_db.py        Criação das tabelas ausentes em um banco novo
  main.py           Rotas FastAPI e regras de negócio da API
  models.py         Modelos SQLAlchemy
  schemas.py        Validação Pydantic
src/
  components/       Vitrine, venda, relatórios, navegação e banners
  hooks/            Estado de conectividade e instalação do PWA
  lib/offlineSync.ts Cache local e sincronização da fila offline
  lib/backgroundQueue.ts Fila IndexedDB e transmissão reutilizada pelo Service Worker
  sw.ts Cache PWA e evento de Background Sync das vendas pendentes
  App.tsx           Estado e navegação das três telas
tests/
  test_api.py       Testes das rotas, estoque, relatórios e modo sem login
scripts/
  dev.mjs           Inicializa Vite e FastAPI em conjunto
  start.mjs         Inicializa FastAPI para servir a versão de produção
  python-task.mjs   Executa lint e testes usando o Python do ambiente virtual
```

## API HTTP

Todas as rotas listadas abaixo estão abertas no modo atual do MVP. Valores monetários são transportados em centavos inteiros.

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/api/health` | Verifica se a API está respondendo. |
| `GET` | `/api/vitrine` | Lista pública de produtos ativos e suas famílias. |
| `GET` | `/api/me` | Retorna a identidade visual fixa `mvp-local`; não representa login validado. |
| `GET` | `/api/produtores` | Lista produtores ativos. |
| `GET` | `/api/produtos` | Lista produtos ativos com dados do produtor. |
| `POST` | `/api/produtos` | Cadastra produto ligado a um produtor ativo. |
| `PATCH` | `/api/produtos/{id}` | Atualiza preço, estoque ou situação do produto. |
| `POST` | `/api/vendas` | Registra uma venda e reduz o saldo do estoque. |
| `GET` | `/api/vendas` | Retorna até 30 vendas recentes. |
| `GET` | `/api/relatorios/repasses?periodo=hoje\|7dias\|tudo` | Consolida os repasses e itens por família. |

Exemplo de solicitação de venda:

```json
{
  "produtoId": 12,
  "quantidade": 2,
  "clientSaleId": "venda-offline-00012"
}
```

A API valida identificador, quantidade e saldo. Quantidades acima do estoque retornam `409`; produto indisponível retorna `404`; entradas inválidas retornam `422`. Se `clientSaleId` já tiver sido processado, a API retorna a venda existente em vez de descontar o estoque novamente.

## Modelo de dados

O backend mantém os nomes das tabelas existentes para facilitar compatibilidade com bancos já criados:

- `users`: estrutura preservada para compatibilidade futura; não participa da autenticação no MVP atual.
- `produtores`: nome, família, categoria, localidade e situação ativa.
- `produtos`: produtor, nome, categoria, unidade, preço em centavos, saldo e situação ativa.
- `vendas`: produto, produtor, quantidade, preço congelado no momento da venda, total, identificador idempotente e data.

A baixa de estoque é executada por uma atualização condicional (`estoque_saldo >= quantidade`) no banco. Isso impede que duas vendas simultâneas usem o mesmo saldo além do disponível.

## Catálogo de demonstração

O conjunto contém 15 famílias fictícias, cada uma com três produtos agrícolas, totalizando 45 itens. Os nomes das famílias e localidade incluem a indicação de teste para não confundir os dados de exemplo com pessoas produtoras reais.

Os itens cobrem verduras, folhas, raízes, legumes e grãos vendidos com frequência em feiras, incluindo alface, couve, coentro, rúcula, tomate, cenoura, beterraba, quiabo, maxixe, abóbora, mandioca, batata-doce, inhame, feijão verde, milho verde, cebola, alho, repolho, brócolis, vagem e amendoim verde. Os registros incluem preços unitários em centavos e saldos iniciais variados para experimentar seleção, subtotal, validação de estoque, venda e relatórios.

Para popular ou completar o catálogo em um banco já inicializado, execute `python -m backend.seed_demo_data`. O script não apaga dados e não sobrescreve os produtos existentes.

## Requisitos

- Node.js 20.19+ ou 22.12+.
- Python 3.11+.
- PostgreSQL para implantação. Em desenvolvimento, SQLite é usado por padrão se `DATABASE_URL` não for definida.

## Configuração local

1. Instale as dependências JavaScript: `npm install`.
2. Crie o ambiente virtual Python e instale as dependências:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```

3. Para usar SQLite local, deixe `DATABASE_URL` como `sqlite:///./feira_sustentavel.db` no `.env.example`. Para usar PostgreSQL, troque a variável pela URL do seu banco.
4. Ao iniciar em modo desenvolvimento, FastAPI cria as tabelas ausentes e popula automaticamente o catálogo de demonstração. O arquivo SQLite fica na raiz do projeto e é ignorado pelo Git.

   Se estiver preparando um banco fora do modo de desenvolvimento, crie as tabelas ausentes manualmente:

   ```powershell
   python -m backend.init_db
   ```

   `create_all` cria tabelas que ainda não existem; não é uma ferramenta de migração para alterar estruturas existentes.

5. Para popular ou completar manualmente o catálogo em qualquer banco:

   ```powershell
   python -m backend.seed_demo_data
   ```

   O comando pode ser executado novamente sem duplicar famílias e produtos existentes. Em desenvolvimento esse passo já ocorre automaticamente na inicialização.

6. Inicie a aplicação em desenvolvimento:

   ```powershell
   npm run dev
   ```

   O frontend fica em `http://localhost:3000`. O Vite encaminha `/api` para FastAPI em `http://localhost:8000`.

O script de desenvolvimento usa automaticamente `.venv/Scripts/python.exe` no Windows ou `.venv/bin/python` em Linux/macOS. Também é possível definir `PYTHON` para indicar outro interpretador. `npm start` também usa o modo de demonstração por padrão; para operar com PostgreSQL sem semear automaticamente, defina `APP_ENV=production` e configure `DATABASE_URL`.

## Comandos

| Comando | Ação |
|---|---|
| `npm run dev` | Inicia Vite e FastAPI juntos. |
| `npm run dev:web` | Inicia somente o frontend. |
| `npm run dev:api` | Inicia somente a API com reload. |
| `npm run lint` | Executa TypeScript e Ruff. |
| `npm test` | Executa os testes da API com SQLite temporário. |
| `npm run build` | Gera frontend de produção e arquivos do Service Worker. |
| `npm start` | Inicia FastAPI no modo de demonstração; serve `dist` quando o build existe. |
| `npm run preview` | Serve a saída de build pelo preview do Vite. |

## Offline e instalação

- A vitrine usa estratégia `NetworkFirst` para tentar dados recentes e recorrer ao cache quando necessário.
- A fila de vendas fica no armazenamento local do navegador até que possa ser enviada.
- O estoque visível no dispositivo considera as vendas pendentes para evitar apresentar o mesmo saldo como disponível.
- O Service Worker pré-armazena os recursos do frontend, mantém cache de leitura da vitrine e é atualizado automaticamente.
- O Background Sync nativo envia a fila mesmo sem a tela aberta nos navegadores compatíveis; o evento `online` e a abertura do app funcionam como alternativas quando a API não existe. Esse recurso depende de contexto seguro (HTTPS ou localhost) e do suporte do navegador.
- Ícones e metadados de instalação ficam em `public/` e na configuração PWA do Vite.

## Acessibilidade e uso em campo

A interface foi projetada para celular, uso tátil e leitura em ambientes claros. Os controles principais têm alvos de toque de pelo menos 48 px, os campos possuem rótulos e o foco por teclado é destacado. A folha de estilos respeita a preferência de movimento reduzido do sistema. Uma certificação WCAG requer auditoria manual e automatizada adicional.

## Testes

A suíte usa SQLite em memória, sem exigir PostgreSQL ou conta Google. Ela cobre vitrine, acesso aberto do MVP, validação e idempotência de vendas, baixa de estoque e consolidação de repasses.

```powershell
npm run lint
npm test
npm run build
```

## Integração contínua

O workflow do GitHub Actions em `.github/workflows/ci.yml` roda automaticamente em cada push e pull request, e também pode ser iniciado manualmente pela aba **Actions** do repositório. Em um único job, ele instala Node.js 22 e Python 3.11, instala as dependências e executa lint/type-check, testes da API e build do PWA. A suíte usa SQLite e não precisa de credenciais ou serviços externos.
