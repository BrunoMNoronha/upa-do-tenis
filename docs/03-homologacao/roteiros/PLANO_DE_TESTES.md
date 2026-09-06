# Plano de Testes (Manual e UAT)

Este documento dita as rotinas de validação a serem executadas a cada grande release do MVP. O objetivo é evitar regressões e garantir estabilidade.

## 1. Módulo: Clientes

### 1.1 Cadastrar Novo Cliente
- [ ] Preencher todos os campos obrigatórios (Nome, Telefone) com dados válidos e salvar. -> **Esperado**: Cliente criado e listado no painel.
- [ ] Tentar salvar com campos vazios. -> **Esperado**: Zod bloqueia e exibe mensagens de erro (Required).
- [ ] Preencher telefone e CPF/CNPJ com caracteres incorretos. -> **Esperado**: Máscaras (se implementadas) ou validação reprovam o formato.

### 1.2 Editar Cliente Existente
- [ ] Abrir detalhes/edição de um cliente e alterar as `observacoes` ou `telefone`. -> **Esperado**: Dados atualizados persistidos na listagem.

## 2. Módulo: Ordem de Serviço (OS)

### 2.1 Cadastrar Ordem de Serviço
- [ ] Criar OS selecionando um cliente válido, datas de previsão corretas e observações. -> **Esperado**: OS gravada com numeração automática (ex: OS-0003), status = ABERTA.
- [ ] Validar bloqueio caso o cliente não seja selecionado.

### 2.2 Consultar OS
- [ ] Acessar detalhes de uma OS recém criada. -> **Esperado**: Os valores de `valorTotal`, `saldo`, `valorSinal` e `valorPago` devem estar condizentes com zero ou os lançamentos default estipulados no backend.

## 3. Módulos Adicionais / Base

### 3.1 Busca e Filtros
- [ ] (A Validar) Pesquisar cliente pelo nome parcial na listagem.
- [ ] (A Validar) Filtrar Ordens de Serviço pelo Status (ex: "ABERTA").

### 3.2 Tabelas de Apoio
- [ ] Verificar se "Formas de Pagamento" e "Serviços Básicos" injetados via Seed (`pnpm run seed`) aparecem no frontend (se houver interface disponível para listagem atual).

## 4. Testes de Regressão e Build
- [ ] O comando `pnpm run build` deve completar sem erro de estáticos.
- [ ] O comando `pnpm run lint` não deve reportar warnings.
- [ ] O comando `pnpm run typecheck` deve rodar em silêncio (exit code 0).
