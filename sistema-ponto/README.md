# ⏰ Sistema de Ponto

Aplicação web completa para controle de jornada de trabalho e gestão de ponto eletrônico, com suporte a cálculo automático de banco de horas, envio de justificativas e painel administrativo para gestores e administradores.

---

## 🚀 Tecnologias

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) com [React 19](https://react.dev/) e TypeScript
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) via Docker Compose
- **Acesso ao Banco**: `pg` (Pool de conexões)
- **Migrações**: `node-pg-migrate`
- **Validação**: [Zod](https://zod.dev/)
- **Criptografia**: `bcryptjs`
- **Estilização**: Tailwind CSS com componentes modernos e responsivos (Dark/Light mode via CSS variables)
- **Ícones**: `lucide-react`
- **Testes**: [Jest](https://jestjs.io/) (testes de integração automatizados)

---

## 📋 Funcionalidades

### 1. Funcionário
- **Autenticação**: Login por matrícula e senha, com sessões seguras em cookies HTTP-only.
- **Registro de Ponto**: 4 batidas obrigatórias em ordem lógica (`entrada` ➔ `saida_almoco` ➔ `retorno_almoco` ➔ `saida`).
- **Trava Retroativa & Anti-duplicidade**: Impede registrar o mesmo ponto duas vezes no mesmo dia ou tentar registrar horários anteriores após ter avançado a sequência.
- **Banco de Horas Diário**: Cálculo automático ao bater a saída, considerando tolerância de almoço e horário contratual.
- **Envio de Justificativas**: Envio de justificativa para pontos faltantes ou divergências, com bloqueio para datas futuras.

### 2. Gestor / Admin
- **Controle de Acesso Baseado em Papéis (RBAC)**: Proteção em nível de rota e layout para usuários `gestor` e `admin`.
- **Painel Administrativo (`/admin/justificativas`)**: Listagem consolidada com dados do funcionário, status e motivo.
- **Filtros e Ações Rápidas**: Filtros por status (Pendentes, Aprovadas, Recusadas, Todas).
- **Aprovação e Recusa de Justificativas**:
  - **Aprovar**: Abona a ocorrência (desvio zerado) e recalcula o banco de horas do dia.
  - **Recusar**: Aplica débito de penalidade (-60 minutos) no banco de horas do colaborador.
- **Acesso Rápido**: Botão dinâmico no cabeçalho do painel principal visível apenas para gestores e admins.

---

## 🛠️ Como Rodar Localmente

### Pré-requisitos
- Node.js (>= 20.x)
- Docker e Docker Compose

### 1. Clonar e Instalar Dependências
```bash
git clone <url-do-repositorio>
cd sistema-ponto
npm install
```

### 2. Configurar Variáveis de Ambiente
Certifique-se de que o arquivo `.env.development` está configurado com as credenciais do PostgreSQL.

### 3. Iniciar o Ambiente de Desenvolvimento
O comando abaixo sobe o container do PostgreSQL, aguarda as conexões, executa as migrações pendentes e inicia o Next.js:
```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testes Automatizados

O projeto conta com suíte de testes de integração cobrindo endpoints de autenticação, registro de ponto, banco de horas, migrações e justificativas.

Para rodar todos os testes de integração com Jest:
```bash
npm test
```
Ou no Windows:
```bash
npm run test:win
```

---

## 📁 Estrutura do Projeto

```text
├── app/
│   ├── admin/
│   │   ├── layout.tsx                # Gatekeeper RBAC para gestores/admins
│   │   └── justificativas/page.tsx   # Painel de análise de justificativas
│   ├── api/v1/
│   │   ├── banco-horas/              # Consulta de extrato e saldo
│   │   ├── empregados/               # Cadastro e gestão de empregados
│   │   ├── justificativas/           # Envio (POST), listagem (GET) e análise (PATCH)
│   │   ├── migrations/               # Execução de migrações via HTTP
│   │   ├── ponto/                    # Registro e trava de batidas de ponto
│   │   ├── sessoes/                  # Login, verificação e encerramento de sessão
│   │   └── status/                   # Healthcheck e métricas da aplicação
│   ├── login/                        # Tela de login
│   └── ponto/                        # Painel principal do funcionário
├── _infra/
│   ├── auth.ts                       # Middleware e utilitários de autenticação
│   ├── database.js                   # Pool de conexões do PostgreSQL
│   ├── compose.yaml                  # Serviço do PostgreSQL Docker
│   └── migrations/                   # Scripts de migração DDL
└── _tests/
    └── integration/                  # Testes de integração de todas as rotas
```
