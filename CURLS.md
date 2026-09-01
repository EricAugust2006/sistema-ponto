# 🚀 Guia Completo de cURL - API Sistema de Ponto

Este documento contém todos os comandos `cURL` organizados por módulo para testar e interagir com todas as rotas da API do **Sistema de Ponto**.

> **URL Base Padrão:** `http://localhost:3000`

---

## 📌 Dicas Importantes para Execução

### No Windows (PowerShell / CMD)
- No PowerShell, use `curl.exe` em vez de `curl` (para evitar conflito com o alias do `Invoke-WebRequest`).
- Para comandos em linha única ou que usam JSON, utilize aspas duplas com escape ou strings simples formatadas.
- Para gerenciar cookies de sessão automaticamente entre requisições:
  - `-c cookies.txt` -> Salva os cookies recebidos na resposta do login.
  - `-b cookies.txt` -> Envia os cookies salvos nas requisições autenticadas.

### No Linux / macOS / Git Bash
- Pode utilizar `curl` normalmente com quebras de linha usando `\`.

---

## 📋 Sumário das Rotas

1. [Autenticação e Empregados](#1-autenticação-e-empregados)
   - [Cadastrar Empregado](#11-cadastrar-novo-empregado)
   - [Consultar Empregados Cadastrados](#12-consultar-empregados-cadastrados-no-banco)
   - [Login / Criar Sessão](#13-login--criar-sessão)
   - [Consultar Sessão Ativa](#14-consultar-sessão-ativa)
   - [Logout / Encerrar Sessão](#15-logout--encerrar-sessão)
2. [Registro de Ponto](#2-registro-de-ponto)
   - [Bater Ponto (Entrada)](#21-bater-ponto---entrada)
   - [Bater Ponto (Saída Almoço)](#22-bater-ponto---saída-almoço)
   - [Bater Ponto (Retorno Almoço)](#23-bater-ponto---retorno-almoço)
   - [Bater Ponto (Saída)](#24-bater-ponto---saída-fechamento-do-dia)
   - [Listar Pontos do Funcionário](#25-listar-histórico-de-pontos)
3. [Banco de Horas](#3-banco-de-horas)
   - [Consultar Saldo e Extrato](#31-consultar-saldo-e-registros-do-banco-de-horas)
4. [Justificativas de Ponto](#4-justificativas-de-ponto)
   - [Enviar Justificativa](#41-criar-uma-justificativa-de-ponto)
   - [Listar Justificativas](#42-listar-justificativas)
   - [Aprovar / Recusar Justificativa (Gestor / Admin)](#43-aprovar-ou-recusar-justificativa)
5. [Status e Infraestrutura](#5-status-e-infraestrutura)
   - [Health Check / Status](#51-verificar-saúde-da-api-e-do-banco)
   - [Listar Migrations Pendentes](#52-listar-migrations-pendentes)
   - [Executar Migrations](#53-executar-migrations-pendentes)

---

## 1. Autenticação e Empregados

### 1.1 Cadastrar Novo Empregado
Cria um novo funcionário no sistema com validação de dados e hash seguro de senha.

```bash
curl -X POST http://localhost:3000/api/v1/empregados \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao.silva@empresa.com",
    "matricula": "123456",
    "senha": "senhaSegura123"
  }'
```

**Exemplo PowerShell (linha única):**
```powershell
curl.exe -X POST http://localhost:3000/api/v1/empregados -H "Content-Type: application/json" -d '{\"nome\": \"João Silva\", \"email\": \"joao.silva@empresa.com\", \"matricula\": \"123456\", \"senha\": \"senhaSegura123\"}'
```

---

### 1.2 Consultar Empregados Cadastrados no Banco
Retorna a lista de todos os usuários/empregados cadastrados no banco de dados (dados públicos/cadastrais, sem expor hash de senha).

```bash
curl -X GET http://localhost:3000/api/v1/empregados
```

**Exemplo PowerShell:**
```powershell
curl.exe -X GET http://localhost:3000/api/v1/empregados
```

**Exemplo de Resposta:**
```json
[
  {
    "id": 1,
    "nome": "João Silva",
    "email": "joao.silva@empresa.com",
    "matricula": "123456",
    "papel": "funcionario",
    "horario_entrada": "08:00:00",
    "horario_saida": "17:00:00",
    "criado_em": "2026-08-31T20:00:00.000Z"
  }
]
```

---

### 1.3 Login / Criar Sessão
Autentica o funcionário e gera o cookie `session_token`.

```bash
# Salva o cookie de sessão no arquivo 'cookies.txt'
curl -X POST http://localhost:3000/api/v1/sessoes \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "matricula": "123456",
    "senha": "senhaSegura123"
  }'
```

**Exemplo PowerShell:**
```powershell
curl.exe -X POST http://localhost:3000/api/v1/sessoes -c cookies.txt -H "Content-Type: application/json" -d '{\"matricula\": \"123456\", \"senha\": \"senhaSegura123\"}'
```

---

### 1.4 Consultar Sessão Ativa
Verifica os dados do empregado atualmente logado com base no cookie de sessão.

```bash
# Usando o cookie salvo:
curl -X GET http://localhost:3000/api/v1/sessoes \
  -b cookies.txt

# Ou passando o token explicitamente no cabeçalho Cookie:
curl -X GET http://localhost:3000/api/v1/sessoes \
  -H "Cookie: session_token=SEU_TOKEN_AQUI"
```

**Exemplo PowerShell:**
```powershell
curl.exe -X GET http://localhost:3000/api/v1/sessoes -b cookies.txt
```

---

### 1.5 Logout / Encerrar Sessão
Invalida o token no banco de dados e remove o cookie.

```bash
curl -X DELETE http://localhost:3000/api/v1/sessoes \
  -b cookies.txt
```

**Exemplo PowerShell:**
```powershell
curl.exe -X DELETE http://localhost:3000/api/v1/sessoes -b cookies.txt
```

---

## 2. Registro de Ponto

> **Nota:** As rotas de ponto exigem estar autenticado (via `-b cookies.txt` ou cabeçalho `Cookie`).
> Cada tipo de ponto só pode ser batido **uma vez ao dia**.

### 2.1 Bater Ponto - Entrada
```bash
curl -X POST http://localhost:3000/api/v1/ponto \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "type": "entrada"
  }'
```

**Exemplo PowerShell:**
```powershell
curl.exe -X POST http://localhost:3000/api/v1/ponto -b cookies.txt -H "Content-Type: application/json" -d '{\"type\": \"entrada\"}'
```

---

### 2.2 Bater Ponto - Saída Almoço
```bash
curl -X POST http://localhost:3000/api/v1/ponto \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "type": "saida_almoco"
  }'
```

**Exemplo PowerShell:**
```powershell
curl.exe -X POST http://localhost:3000/api/v1/ponto -b cookies.txt -H "Content-Type: application/json" -d '{\"type\": \"saida_almoco\"}'
```

---

### 2.3 Bater Ponto - Retorno Almoço
```bash
curl -X POST http://localhost:3000/api/v1/ponto \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "type": "retorno_almoco"
  }'
```

**Exemplo PowerShell:**
```powershell
curl.exe -X POST http://localhost:3000/api/v1/ponto -b cookies.txt -H "Content-Type: application/json" -d '{\"type\": \"retorno_almoco\"}'
```

---

### 2.4 Bater Ponto - Saída (Fechamento do Dia)
> Ao registrar a `saida`, se as outras 3 batidas do dia existirem, o sistema calcula e atualiza automaticamente o saldo do **Banco de Horas**.

```bash
curl -X POST http://localhost:3000/api/v1/ponto \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "type": "saida"
  }'
```

**Exemplo PowerShell:**
```powershell
curl.exe -X POST http://localhost:3000/api/v1/ponto -b cookies.txt -H "Content-Type: application/json" -d '{\"type\": \"saida\"}'
```

---

### 2.5 Listar Histórico de Pontos
Retorna todas as batidas do funcionário autenticado em ordem decrescente de data.

```bash
curl -X GET http://localhost:3000/api/v1/ponto \
  -b cookies.txt
```

**Exemplo PowerShell:**
```powershell
curl.exe -X GET http://localhost:3000/api/v1/ponto -b cookies.txt
```

---

## 3. Banco de Horas

### 3.1 Consultar Saldo e Registros do Banco de Horas
Retorna o saldo acumulado total (em minutos) e o extrato diário detalhando desvios de entrada, almoço e saída.

```bash
curl -X GET http://localhost:3000/api/v1/banco-horas \
  -b cookies.txt
```

**Exemplo PowerShell:**
```powershell
curl.exe -X GET http://localhost:3000/api/v1/banco-horas -b cookies.txt
```

**Exemplo de Resposta:**
```json
{
  "saldoTotalMinutos": 15,
  "registros": [
    {
      "data": "2026-08-28T00:00:00.000Z",
      "saldo_minutos": 15,
      "detalhes": {
        "desvio_entrada_minutos": 0,
        "desvio_almoco_minutos": 5,
        "desvio_saida_minutos": 10
      }
    }
  ]
}
```

---

## 4. Justificativas de Ponto

### 4.1 Criar uma Justificativa de Ponto
Permite ao funcionário justificar a ausência ou esquecimento de uma batida de ponto passada (data <= hoje).

- `tipoPonto`: `"entrada"`, `"saida_almoco"`, `"retorno_almoco"` ou `"saida"`.
- `motivo`: Descrição com no mínimo 10 caracteres.

```bash
curl -X POST http://localhost:3000/api/v1/justificativas \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "data": "2026-08-28",
    "tipoPonto": "entrada",
    "motivo": "Consulta médica de rotina no início da manhã. Atestado entregue ao RH."
  }'
```

**Exemplo PowerShell:**
```powershell
curl.exe -X POST http://localhost:3000/api/v1/justificativas -b cookies.txt -H "Content-Type: application/json" -d '{\"data\": \"2026-08-28\", \"tipoPonto\": \"entrada\", \"motivo\": \"Consulta médica de rotina no início da manhã. Atestado entregue ao RH.\"}'
```

---

### 4.2 Listar Justificativas
- Se autenticado como **funcionário**: retorna apenas as próprias justificativas.
- Se autenticado como **gestor** ou **admin**: retorna todas as justificativas do sistema.

```bash
curl -X GET http://localhost:3000/api/v1/justificativas \
  -b cookies.txt
```

**Exemplo PowerShell:**
```powershell
curl.exe -X GET http://localhost:3000/api/v1/justificativas -b cookies.txt
```

---

### 4.3 Aprovar ou Recusar Justificativa
> **Restrito:** Exige usuário com papel `gestor` ou `admin`.

- `status`: `"aprovada"` ou `"recusada"`.
- `observacao`: Opcional (motivo da aprovação/recusa).

```bash
curl -X PATCH http://localhost:3000/api/v1/justificativas \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "status": "aprovada",
    "observacao": "Atestado médico validado."
  }'
```

**Exemplo PowerShell:**
```powershell
curl.exe -X PATCH http://localhost:3000/api/v1/justificativas -b cookies.txt -H "Content-Type: application/json" -d '{\"id\": 1, \"status\": \"aprovada\", \"observacao\": \"Atestado médico validado.\"}'
```

---

## 5. Status e Infraestrutura

### 5.1 Verificar Saúde da API e do Banco
Retorna versão do PostgreSQL, número de conexões abertas e status geral.

```bash
curl -X GET http://localhost:3000/api/v1/status
```

**Exemplo PowerShell:**
```powershell
curl.exe -X GET http://localhost:3000/api/v1/status
```

---

### 5.2 Listar Migrations Pendentes
> Requer o cabeçalho `x-admin-key` com o valor configurado em `ADMIN_KEY` no arquivo `.env`.

```bash
curl -X GET http://localhost:3000/api/v1/migrations \
  -H "x-admin-key: 001001001ADMIN_KEY=chave-secreta-de-desenvolvimento"
```

**Exemplo PowerShell:**
```powershell
curl.exe -X GET http://localhost:3000/api/v1/migrations -H "x-admin-key: 001001001ADMIN_KEY=chave-secreta-de-desenvolvimento"
```

---

### 5.3 Executar Migrations Pendentes
Aplica as migrations no banco de dados.

```bash
curl -X POST http://localhost:3000/api/v1/migrations \
  -H "x-admin-key: 001001001ADMIN_KEY=chave-secreta-de-desenvolvimento"
```

**Exemplo PowerShell:**
```powershell
curl.exe -X POST http://localhost:3000/api/v1/migrations -H "x-admin-key: 001001001ADMIN_KEY=chave-secreta-de-desenvolvimento"
```

---

## 🔄 Fluxo Completo de Testes (Passo a Passo)

Para rodar uma jornada completa de testes do início ao fim pelo terminal:

```bash
# 1. Verificar se a API está online
curl -X GET http://localhost:3000/api/v1/status

# 2. Cadastrar novo empregado
curl -X POST http://localhost:3000/api/v1/empregados \
  -H "Content-Type: application/json" \
  -d '{"nome": "Maria Souza", "email": "maria.souza@empresa.com", "matricula": "333333", "senha": "senha123"}'

# 3. Fazer Login e salvar cookie em cookies.txt
curl -X POST http://localhost:3000/api/v1/sessoes \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"matricula": "333333", "senha": "senha123"}'

# 4. Verificar sessão ativa
curl -X GET http://localhost:3000/api/v1/sessoes -b cookies.txt

# 5. Registrar os 4 pontos do dia
curl -X POST http://localhost:3000/api/v1/ponto -b cookies.txt -H "Content-Type: application/json" -d '{"type": "entrada"}'
curl -X POST http://localhost:3000/api/v1/ponto -b cookies.txt -H "Content-Type: application/json" -d '{"type": "saida_almoco"}'
curl -X POST http://localhost:3000/api/v1/ponto -b cookies.txt -H "Content-Type: application/json" -d '{"type": "retorno_almoco"}'
curl -X POST http://localhost:3000/api/v1/ponto -b cookies.txt -H "Content-Type: application/json" -d '{"type": "saida"}'

# 6. Consultar histórico de pontos
curl -X GET http://localhost:3000/api/v1/ponto -b cookies.txt

# 7. Consultar banco de horas calculado
curl -X GET http://localhost:3000/api/v1/banco-horas -b cookies.txt

# 8. Enviar uma justificativa de ponto
curl -X POST http://localhost:3000/api/v1/justificativas -b cookies.txt -H "Content-Type: application/json" -d '{"data": "2026-08-27", "tipoPonto": "saida", "motivo": "Esquecimento de bater o ponto na saída."}'

# 9. Listar justificativas
curl -X GET http://localhost:3000/api/v1/justificativas -b cookies.txt

# 10. Realizar logout
curl -X DELETE http://localhost:3000/api/v1/sessoes -b cookies.txt
```

---

## 🐳 Bônus: Consultar Diretamente no Docker / PostgreSQL

Caso você queira consultar os registros diretamente no banco de dados via Docker:

### 1. Listar todos os empregados cadastrados
```powershell
docker exec -it sistema-ponto-database psql -U postgres -d sistema_ponto -c "SELECT id, nome, email, matricula, papel, horario_entrada, horario_saida, criado_em FROM empregados;"
```

### 2. Listar empregados com sessão ativa no momento
```powershell
docker exec -it sistema-ponto-database psql -U postgres -d sistema_ponto -c "SELECT e.id, e.nome, e.email, e.matricula, e.papel, s.expira_em FROM empregados e JOIN sessoes s ON s.empregado_id = e.id WHERE s.expira_em > NOW();"
```

### 3. Acessar o terminal interativo do PostgreSQL (`psql`)
```powershell
docker exec -it sistema-ponto-database psql -U postgres -d sistema_ponto
```
*Comandos úteis dentro do `psql`:*
- `\dt` -> Lista todas as tabelas do banco.
- `SELECT * FROM empregados;` -> Consulta todos os dados da tabela.
- `\q` -> Sai do `psql`.

