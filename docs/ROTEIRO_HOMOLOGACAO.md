# Roteiro de Homologação (UAT)

Este documento foi criado para o cliente final/usuários chave da Sapataria Alves operarem o MVP em ambiente de testes antes da ida para a produção definitiva. Siga o fluxo abaixo na ordem exata.

## Passo 1: Cadastro Base de Cliente
1. Acesse o menu lateral na aba **Clientes**.
2. Clique no botão de Novo Cliente.
3. Insira Nome e Telefone (campos obrigatórios) e um CPF genérico.
4. Salve.
**Critério de Aceite:** O cliente deve aparecer na listagem principal sem a necessidade de recarregar a página forçadamente (F5).

## Passo 2: Abertura da Ordem de Serviço
1. Navegue para a aba **Ordens de Serviço**.
2. Clique no botão de Nova OS (se já houver o fluxo completo no frontend) ou vincule-a através de um cliente listado.
3. Preencha as informações: Data de Previsão e Selecione o Cliente criado no Passo 1.
4. Salve a OS.
**Critério de Aceite:** A numeração gerada (ex: `OS-0005`) deve ser única e incremental, e o status inicial deve ser marcado visivelmente como **ABERTA**.

## Passo 3: Consulta de Valores Base
1. Clique na recém-criada OS para detalhamento.
2. Como itens e serviços profundos ainda farão parte do escopo V2, observe a ficha da OS.
3. Verifique se o **Saldo Devedor** inicia espelhando o **Valor Total** inserido e se os pagamentos estão zerados.

## Passo 4: Listagens e Fluxos de Navegação
1. Retorne à home (Dashboard).
2. Tente usar as opções de navegação rápida disponíveis.
3. Se houver buscas, teste pesquisar pelo nome do cliente cadastrado.
**Critério de Aceite:** As tabelas refletem com precisão os dados que você acabou de persistir, atestando o fluxo completo de roundtrip (Banco de Dados -> Prisma -> Next.js -> UI).
