# Sistema de Ponto

Aplicação web para funcionários registrarem a jornada de trabalho, consultarem os registros e acompanharem o banco de horas. O projeto foi construído com Next.js e PostgreSQL e possui testes de integração para as APIs principais.

## Objetivo

Centralizar o controle de ponto de cada funcionário. A pessoa se autentica com matrícula e senha, registra os quatro momentos da jornada e consulta o próprio histórico. Ao encerrar o dia, o sistema calcula automaticamente o saldo de horas.

## Tecnologias

- **Next.js 16** com React 19 e TypeScript, usando App Router.
- **PostgreSQL 18**, executado localmente em Docker Compose.
- **node-postgres (`pg`)** para acesso ao banco.
- **node-pg-migrate** para versionar o esquema do banco.
- **Zod** para validação de dados de entrada.
- **bcryptjs** para armazenar senhas de forma segura (hash).
- **Tailwind CSS**, Base UI e Lucide para a interface.
- **Jest** para testes de integração.

## Estrutura principal

```text
app/                    Páginas e rotas HTTP do Next.js
  api/v1/               API da aplicação
  login/                Tela de login
  ponto/                Painel para registrar e consultar pontos
_infra/                 Banco, autenticação, Docker e migrations
_tests/integration/     Testes de integração das APIs
```

## Funcionalidades implementadas

### Cadastro de empregados

- Cria empregados com nome, e-mail, matrícula e senha.
- Valida os dados recebidos: nome com pelo menos 2 caracteres, e-mail válido, matrícula com no máximo 6 caracteres e senha com pelo menos 6 caracteres.
- Impede e-mail e matrícula duplicados.
- Armazena a senha usando hash bcrypt; a senha original não é salva no banco.
- Define por padrão a jornada esperada das **08:00 às 17:00**.

### Autenticação e sessões

- Login por matrícula e senha.
- Compara a senha informada com o hash salvo no banco.
- Cria um token aleatório de sessão, com validade de 8 horas.
- Salva o token na tabela `sessoes` e o envia no cookie HTTP-only `session_token`.
- Permite consultar a sessão ativa e encerrar a sessão (logout).
- As rotas de ponto e banco de horas exigem sessão válida e retornam `401` se não houver autenticação.

### Registro de ponto

O funcionário pode registrar os quatro eventos da jornada:

1. `entrada`
2. `saida_almoco`
3. `retorno_almoco`
4. `saida`

- Cada tipo de ponto só pode ser registrado uma vez por empregado a cada dia.
- Os registros podem ser consultados em ordem decrescente de data/hora.
- Ao registrar `saida`, o sistema tenta fechar o dia e calcular o banco de horas. O cálculo só é realizado se os quatro registros do dia existirem.

### Banco de horas

Quando o dia é fechado, o sistema grava um registro diário em `banco_horas` com o saldo em minutos e seus detalhes.

O saldo considera:

- **Entrada:** diferença entre a hora de entrada real e a esperada.
- **Almoço:** referência de 60 minutos. Almoço maior que isso gera saldo negativo; menor gera saldo positivo.
- **Saída:** diferença entre a hora de saída real e a esperada.

O endpoint de banco de horas devolve o saldo total do empregado e os registros diários, do mais recente para o mais antigo. Cada registro contém `data`, `saldo_minutos` e `detalhes` com os desvios calculados.

### Interface web

- Página inicial de apresentação.
- Página de login com validação e mensagens de erro.
- Painel do funcionário em `/ponto`.
- Botões para registrar os quatro tipos de ponto.
- Histórico de batidas agrupado por mês e dia.
- Indicação visual dos horários registrados e dos eventos que ainda não foram marcados.
- Logout pelo painel.

### Saúde e migrations

- Endpoint de status que testa a conexão com o PostgreSQL e informa versão, limite e quantidade de conexões abertas.
- Endpoints para consultar migrations pendentes e aplicá-las.
- Migrations versionadas para criar e evoluir as tabelas.

## API disponível

| Método e rota | Descrição |
| --- | --- |
| `POST /api/v1/empregados` | Cadastra um empregado. |
| `POST /api/v1/sessoes` | Realiza login e cria a sessão. |
| `GET /api/v1/sessoes` | Retorna a sessão e o empregado autenticado. |
| `DELETE /api/v1/sessoes` | Encerra a sessão atual. |
| `POST /api/v1/ponto` | Registra uma batida de ponto autenticada. |
| `GET /api/v1/ponto` | Lista os pontos do empregado autenticado. |
| `GET /api/v1/banco-horas` | Retorna saldo total e registros de banco de horas. |
| `GET /api/v1/status` | Verifica a saúde da API e do PostgreSQL. |
| `GET /api/v1/migrations` | Lista migrations pendentes. |
| `POST /api/v1/migrations` | Aplica migrations pendentes. |

### Exemplos de contratos

Criar um ponto:

```json
{ "type": "entrada" }
```

Resposta de banco de horas:

```json
{
  "saldoTotalMinutos": 15,
  "registros": [
    {
      "data": "2026-08-25T00:00:00.000Z",
      "saldo_minutos": 15,
      "detalhes": {
        "desvio_entrada_minutos": 0,
        "desvio_almoco_minutos": 0,
        "desvio_saida_minutos": 15
      }
    }
  ]
}
```

## Banco de dados

| Tabela | Finalidade |
| --- | --- |
| `empregados` | Dados do funcionário, senha com hash e horários esperados. |
| `sessoes` | Tokens de autenticação e datas de expiração. |
| `pontos` | Batidas de entrada, almoço e saída. |
| `banco_horas` | Saldo diário calculado e detalhes dos desvios. |
| `pgmigrations` | Controle das migrations aplicadas pelo `node-pg-migrate`. |

Relações: um empregado pode ter vários pontos, sessões e registros de banco de horas. Ao excluir um empregado, os registros relacionados são removidos por cascata.

## Testes já implementados

Há testes de integração para:

- status da aplicação;
- migrations;
- cadastro de empregados;
- login, consulta e encerramento de sessões;
- criação e consulta de pontos;
- consulta de banco de horas, incluindo cálculo após o fechamento da jornada.

## Como executar localmente

Pré-requisitos: Node.js, npm e Docker Desktop em execução.

1. Entre na pasta deste aplicativo:

   ```bash
   cd sistema-ponto
   ```

2. Configure as variáveis de ambiente do PostgreSQL em `.env.development` para o banco local.

3. Inicie a aplicação:

   ```bash
   npm run dev
   ```

   Esse comando inicia o PostgreSQL no Docker, aguarda o banco responder, aplica as migrations e sobe o Next.js.

4. Acesse `http://localhost:3000`.

Para executar a suíte de testes no Windows:

```bash
npm run test:win
```

Comandos úteis adicionais:

```bash
npm run services:up
npm run services:stop
npm run services:down
npm run migration:up
npm run migration:down
npm run lint
npm run build
```

## Estado atual e próximos cuidados

As funcionalidades centrais de cadastro, autenticação, registro de ponto, cálculo de banco de horas, interface e testes de integração já estão implementadas.

Antes de publicar o sistema, ainda é recomendável evoluir alguns pontos: usar cookies `secure` em produção, validar a ordem lógica das batidas (por exemplo, impedir saída antes da entrada), adicionar paginação/filtros ao histórico e integrar a visualização de banco de horas ao painel web.
