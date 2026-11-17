# Feira Sustentável

PWA mobile-first para consulta pública da feira, registro de vendas com baixa de estoque e prestação de contas dos repasses por família produtora.

## Arquitetura

- **Frontend:** React, TypeScript, Vite, Tailwind CSS e Service Worker via `vite-plugin-pwa`.
- **API:** FastAPI e Pydantic. O contrato HTTP mantém os campos camelCase usados pelo frontend.
- **Dados:** PostgreSQL com SQLAlchemy 2; as tabelas existentes (`users`, `produtores`, `produtos`, `vendas`) mantêm os nomes e colunas originais.
- **Acesso do MVP:** sem autenticação. O botão e a área da coordenação controlam somente a apresentação visual; as rotas da API estão abertas para facilitar testes.

## Requisitos

- Node.js 20.19+ ou 22.12+.
- Python 3.11+.
- PostgreSQL.

## Configuração local

1. Instale as dependências web: `npm install`.
2. Crie e ative um ambiente virtual Python e instale `pip install -r requirements.txt`.
3. Copie `.env.example` para `.env` e configure `DATABASE_URL`.
4. Para um banco novo, crie as tabelas compatíveis com o esquema atual com `python -m backend.init_db`. O comando usa `create_all` e não altera tabelas existentes.
5. Inicie frontend e API juntos com `npm run dev`. O frontend fica em `http://localhost:3000` e encaminha `/api` para FastAPI em `http://localhost:8000`.

Nenhuma autenticação é iniciada ou exigida. O botão de coordenação só alterna a visualização do painel. Para produção, gere o frontend com `npm run build` e inicie a API com `npm start`; FastAPI serve os arquivos de `dist` quando a pasta existe. Este modo aberto é destinado somente ao MVP de teste.

## Verificações

- Lint de frontend e API: `npm run lint`
- Testes: `npm test`
