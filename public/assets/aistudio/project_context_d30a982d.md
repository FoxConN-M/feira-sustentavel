# Contexto Completo do Projeto: PWA "Feira Sustentável"

## 1. Visão Geral e Objetivo
O projeto visa desenvolver um Aplicativo Web Progressivo (PWA) mobile-first para a **Associação de Produtores e Artesãos da Feira Sustentável**, substituindo o controle analógico em cadernos por um sistema digital seguro, automatizado e acessível. A solução foi concebida para viabilizar a entrega por um desenvolvedor solo em um contexto de ensino a distância.

---

## 2. Pilha Tecnológica e Arquitetura
* **Backend:** Python 3.12, FastAPI (v0.110+), Uvicorn (v0.29+), Pydantic (v2.7+).
* **Persistência & ORM:** SQLAlchemy (v2.0+) com PostgreSQL (gerenciado em nuvem).
* **Frontend / PWA:** Interface *Mobile-First*, Service Workers / Workbox para resiliência offline e sincronização em segundo plano.
* **Segurança:** Autenticação baseada em tokens JWT, hashing de senhas robusto com **bcrypt** (`passlib`), e conformidade com o OWASP Top 10.
* **Acessibilidade:** Diretrizes WCAG 2.1 (Nível AA) com contraste mínimo de 4.5:1 e alvos táteis de $48 \times 48\text{px}$.

---

## 3. Modelo de Dados Simplificado
* **Produtor:** Armazena os dados cadastrais das quinze famílias produtoras associadas.
* **Produto:** Contém o nome, o preço unitário e o saldo de estoque atualizado, com chave estrangeira vinculando ao `Produtor`.
* **Venda:** Regista as transações comerciais realizadas, disparando a baixa automática no estoque do `Produto`.
* **Decisão de Minimização:** Nenhum dado pessoal de consumidores finais (como CPF ou histórico individual) é coletado, eliminando riscos desnecessários com privacidade e LGPD.

---

## 4. Requisitos Funcionais Priorizados
* **RF01 (Obrigatório):** Cadastro de produtos artesanais e agrícolas vinculados aos produtores.
* **RF02 (Obrigatório):** Registro de novas transações de venda com baixa automática no estoque correspondente.
* **RF03 (Obrigatório):** Geração de relatório resumido de vendas e repasses financeiros consolidados por produtor.
* **RF04 (Desejável):** Vitrine digital pública em modo somente leitura para consulta dos consumidores finais.

---

## 5. Requisitos Não Funcionais (RNFs) e Segurança
* **RNF01 (Autenticação Segura):** Acesso restrito à coordenação, senhas protegidas por bcrypt (sem texto limpo, MD5 ou SHA-1) e sessões via JWT.
* **RNF02 (Diretrizes OWASP e Proteção):** Validação estrita em camadas (Pydantic no servidor), consultas parametrizadas via ORM SQLAlchemy (prevenção contra SQL Injection), escape de saídas (prevenção contra XSS), controle de acesso por operação (A01) e tratamento seguro de erros sem vazamento de rastros técnicos.
* **RNF03 (Hospedagem, Portabilidade e Desempenho):** Backend em PaaS (Render/Fly.io), banco PostgreSQL gerenciado (Supabase) e PWA estático (Vercel/Netlify). **Meta de desempenho:** carregamento do fluxo central inferior a 3,0 segundos em conexão móvel 3G (1,5 Mbps, 150 ms de latência), avaliado pela mediana de cinco execuções após aquecimento.
* **RNF04 (Acessibilidade e ODS 8):** Conformidade com WCAG 2.1 AA (contraste $\ge 4.5:1$, alvos táteis $\ge 48\times48\text{px}$). Conecta-se diretamente ao **ODS 8 (Trabalho Decente e Crescimento Econômico)**, garantindo inclusão operacional sob forte luz solar e reduzindo erros de lançamento para produtores e feirantes.

---

## 6. Protótipo de Telas e Fluxo do MVP
* **Tela 1: Entrada Principal e Menu Inicial:** Autenticação segura da coordenação (e-mail, senha com bcrypt/JWT) e opção de acesso à vitrine pública.
* **Tela 2: Execução da Funcionalidade Central (Registro de Venda):** Seleção de produtos do produtor, campo numérico de quantidade com validação Pydantic em tempo real e botão de confirmação com área tátil adequada.
* **Tela 3: Alertas, Resultados e Relatórios:** Confirmação visual de sucesso e tabela consolidada de repasses financeiros por produtor, com total transparência e suporte a sincronização offline.