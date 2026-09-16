# Foto de recebimento da OS — armazenamento privado

## Escopo

A foto é opcional e pertence a um item da ordem de serviço. O banco persiste somente o `pathname` privado; a imagem é lida por uma rota autenticada da aplicação e nunca por URL pública do provedor.

Formatos aceitos: JPEG, PNG e WebP. Limite: **4.000.000 bytes (4 MB)**. O backend valida o MIME informado e a assinatura binária do arquivo.

## Vercel Blob

- Store: `upa-do-tenis-blob`
- Acesso: privado
- Região: `gru1` (São Paulo)
- Ambientes conectados: Production e Preview
- Autenticação: OIDC gerenciado pela Vercel

Variáveis gerenciadas pela integração:

- `BLOB_STORE_ID`
- `BLOB_WEBHOOK_PUBLIC_KEY`

`BLOB_READ_WRITE_TOKEN` é somente uma alternativa para execução local e não deve ser versionado.

## Banco de dados

A migration `20260916150851_add_foto_recebimento_item_os` adiciona a coluna opcional `ItemOrdemServico.fotoRecebimentoPathname`. Ela é aditiva e não altera registros existentes.

Aplicar em cada ambiente com o fluxo já adotado pelo projeto:

```powershell
pnpm exec prisma migrate deploy
```

Antes de produção, executar o preflight e o backup exigidos pelo procedimento operacional do projeto. Esta entrega não aplicou a migration em produção.

## Operação e segurança

- Upload, leitura e remoção exigem sessão válida.
- Upload e remoção são permitidos apenas enquanto a OS está `ABERTA`.
- O caminho privado não é exposto no JSON de listagem nem no detalhe; a interface recebe apenas `possuiFotoRecebimento`.
- Substituição grava a nova referência no banco antes de tentar excluir o Blob anterior.
- Se houver concorrência ao vincular o novo Blob, a aplicação tenta apagar o upload que perdeu a corrida.
- Falhas ao apagar um Blob já desvinculado são registradas no log e não restauram uma referência inválida.

## Homologação em Preview

1. Aplicar a migration no banco de Preview.
2. Confirmar que a integração Blob está conectada ao deployment.
3. Criar uma OS sem foto e confirmar o fluxo anterior.
4. Criar uma OS com foto JPEG/PNG/WebP menor que 4 MB.
5. Abrir o detalhe autenticado e confirmar a exibição.
6. Substituir e remover a foto enquanto a OS estiver aberta.
7. Alterar a OS para `EM_ANDAMENTO` e confirmar o modo somente leitura.
8. Testar captura pela câmera em aparelho móvel.
9. Confirmar 401 para a rota da imagem sem cookie de sessão.

## Continuidade

O Blob não faz parte do backup PostgreSQL. A política de retenção/backup do armazenamento e um processo periódico de reconciliação de Blobs órfãos continuam como decisões operacionais necessárias antes de considerar a funcionalidade plenamente homologada em produção.
