# Feira Sustentável

PWA mobile-first para consulta pública da feira, registro de vendas com baixa de estoque e prestação de contas dos repasses por família produtora.

## Arquitetura

- **Frontend:** React, TypeScript, Vite, Tailwind CSS e Service Worker via `vite-plugin-pwa`.
- **API:** FastAPI e Pydantic. O contrato HTTP mantém os campos camelCase usados pelo frontend.
- **Dados:** PostgreSQL com SQLAlchemy 2; as tabelas existentes (`users`, `produtores`, `produtos`, `vendas`) mantêm os nomes e colunas originais.
- **Autenticação:** Firebase Authentication no cliente e validação de ID token pela Admin SDK no servidor. O servidor usa Application Default Credentials ou a chave indicada em `GOOGLE_APPLICATION_CREDENTIALS`.

## Requisitos

- Node.js 20.19+ ou 22.12+.
- Python 3.11+.
- PostgreSQL.

## Configuração local

1. Instale as dependências web: `npm install`.
2. Crie e ative um ambiente virtual Python e instale `pip install -r requirements.txt`.
3. Copie `.env.example` para `.env` e configure `DATABASE_URL` e `FIREBASE_PROJECT_ID`. Para autenticação local, configure credenciais Firebase Admin via `GOOGLE_APPLICATION_CREDENTIALS` ou ADC.
4. Para um banco novo, crie as tabelas compatíveis com o esquema atual com `python -m backend.init_db`. O comando usa `create_all` e não altera tabelas existentes.
5. Inicie frontend e API juntos com `npm run dev`. O frontend fica em `http://localhost:3000` e encaminha `/api` para FastAPI em `http://localhost:8000`.

O login Google é validado pelo Firebase, mas o e-mail não é usado como bloqueio de acesso. O painel e seus controles mantêm o estado visual da coordenação para o MVP. Para produção, gere o frontend com `npm run build` e inicie a API com `npm start`; FastAPI serve os arquivos de `dist` quando a pasta existe.

## Verificações

- Lint de frontend e API: `npm run lint`
- Testes: `npm test`
