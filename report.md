# 🛡️ Sentinel Security Report

## Verdict
PR CREATED

## Severity
LOW

## Category
Information Exposure / Error Handling

## Finding
A API privada de clientes (`/api/clientes/[id]`) no método `PATCH` permitia vazamento indireto de detalhes do banco de dados (Information Exposure) caso o usuário enviasse um update violando uma constraint de unicidade (ex: e-mail ou CPF/CNPJ duplicado). Ao invés de ser adequadamente capturada e classificada (como `P2002`), a violação caia no bloco `catch` genérico, retornando um status `500 Internal Server Error` no client. Em ambientes em que erros não tratados vazam logs com stack traces longos (ou são mapeados diretamente para o corpo da resposta por ferramentas de monitoramento), isso poderia revelar informações desnecessárias sobre as views e infraestrutura interna.

## Evidence
A análise de `src/app/api/clientes/[id]/route.ts` mostrou a captura explícita do erro `P2025` (Record not found), mas a ausência da captura para `P2002` (Unique constraint failed). Diferente do método `POST` da criação em `src/app/api/clientes/route.ts`, que possuía o handler `P2002` para retornar o erro mapeado de negócio com status `409`, o `PATCH` falhava genericamente ao cair no catch principal da route, gerando um status 500 para uma regra de negócio validada no banco.

## Security impact
Baixo. Trata-se de uma melhoria do mecanismo de tratamento de erros para prevenir potenciais cenários de "Information Exposure" e melhorar a observabilidade. Reduz o volume de falsos positivos de alertas baseados em métricas de erros "5xx", transferindo exceções esperadas para códigos HTTP corretos de controle e status de cliente (409).

## Fix
Adicionado um bloco condicional no statement catch do handler `PATCH` em `src/app/api/clientes/[id]/route.ts`. Quando `error.code === "P2002"` for capturado, a aplicação devolve um erro formatado e seguro com status `409 Conflict`, replicando o comportamento já validado em `src/app/api/clientes/route.ts`. O mesmo padrão de não exposição foi aplicado no backend.

## Files changed
- `src/app/api/clientes/[id]/route.ts`
- `src/app/api/clientes/[id]/clientes-crud.test.ts`

## Validation
| Check | Result |
|---|---|
| lint | PASS |
| tests | PASS |
| targeted security test | PASS |
| build | PASS |
| diff review | PASS |

## Regression protection
O arquivo `src/app/api/clientes/[id]/clientes-crud.test.ts` foi atualizado adicionando uma validação dedicada para quando `prismaMock.cliente.update` rejeita a promise com `code: "P2002"`, validando que um erro interno obscuro não chega até a resposta, a qual é tratada como `409 Conflict`.

## Remaining risks
Nenhum. A alteração foi completamente tratada, coberta por unit tests e alinhada com o que o projeto já aplica na rota de inserção da mesma API de clientes.

## Pull Request
🛡️ Sentinel: prevent unique constraint details exposure in customer updates

## Disclosure
public-safe

## Journal
no critical learning
