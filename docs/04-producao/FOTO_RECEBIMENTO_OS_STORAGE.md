# Foto de recebimento da OS — armazenamento privado

## Escopo

A foto é opcional e pertence a um item da ordem de serviço. O banco persiste somente o `pathname` privado; a imagem é lida por uma rota autenticada da aplicação e nunca por URL pública do provedor.

Formatos aceitos: JPEG, PNG e WebP. O backend aceita arquivos de até **4.000.000 bytes (4 MB)** e valida o MIME informado e a assinatura binária do arquivo.

## Otimização no navegador

Antes do envio, a foto é processada no próprio aparelho por `src/lib/imagem-otimizacao.ts` (APIs nativas `createImageBitmap` + canvas, sem dependência nova), usada pelo cadastro da OS e pelo detalhe via `useFotoOtimizada`:

1. valida MIME (JPEG/PNG/WebP), arquivo não vazio e original de até **25 MB**;
2. decodifica aplicando a orientação EXIF; recusa arquivo corrompido e imagens acima de 64 MP;
3. limita o maior lado a **1600 px**, preservando a proporção e sem upscale;
4. recodifica em **WebP qualidade 0,85** (fundo branco, sem transparência); se passar de 600 KB, faz uma única segunda passada a 0,75;
5. se o navegador não codificar WebP no canvas (Safari), usa **JPEG 0,85**;
6. se a imagem não precisou de redimensionamento e o original já é menor que a recodificação, mantém o original para não aumentar o arquivo.

A recodificação descarta metadados EXIF (inclusive GPS). O preview mostra o arquivo otimizado, e somente ele é enviado; a Object URL é revogada ao trocar, cancelar ou desmontar.

Medição (Chromium, fotos reais de calçados do Wikimedia Commons, em 2026-09-16):

| Original | Final | Redução |
| --- | --- | --- |
| 4,77 MB · 3477×2320 | 162 KB · 1600×1068 | 96,6% |
| 5,18 MB · 5184×3456 | 228 KB · 1600×1067 | 95,6% |
| 2,70 MB · 3104×3104 | 276 KB · 1600×1600 | 89,8% |
| 12,29 MB · 6000×4000 | 362 KB · 1600×1067 | 97,1% |
| 14,75 MB · 4000×6000 (retrato) | 137 KB · 1067×1600 | 99,1% |

A 0,80 a textura de desgaste da sola ficava visivelmente alisada (PSNR ~36,5 dB); a 0,85 ganha ~1,2–1,6 dB e continua na faixa de 140–360 KB. O processamento levou 0,2–0,5 s por foto.

### Por que o upload continua passando pela API

O upload direto client → Blob foi avaliado e **não** foi adotado nesta etapa:

- `handleUpload`/`generateClientTokenFromReadWriteToken` exigem `BLOB_READ_WRITE_TOKEN`, e produção usa OIDC sem token estático;
- o fluxo compatível com OIDC (`issueSignedToken` + `uploadPresigned`) é recente e não há credencial de Blob local para validá-lo;
- no upload direto, o servidor perderia a validação da assinatura binária antes do armazenamento e passaria a existir uma janela de Blobs órfãos (token emitido, upload feito, vínculo nunca confirmado);
- após a otimização, o corpo enviado à Function fica tipicamente abaixo de 400 KB, então o ganho de banda/tempo da Function é marginal.

Fica como evolução futura, se o volume justificar.

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
4. Criar uma OS com foto JPEG/PNG/WebP (inclusive foto de celular acima de 4 MB) e conferir o resumo "Otimizada para envio".
5. Abrir o detalhe autenticado e confirmar a exibição.
6. Substituir e remover a foto enquanto a OS estiver aberta.
7. Alterar a OS para `EM_ANDAMENTO` e confirmar o modo somente leitura.
8. Testar captura pela câmera em aparelho móvel.
9. Confirmar 401 para a rota da imagem sem cookie de sessão.
10. No DevTools (Network), conferir que o `POST .../foto` envia `foto-recebimento.webp` (ou `.jpg` no Safari) com o tamanho otimizado.
11. Fotografar na vertical e confirmar que a orientação é mantida.
12. Selecionar PDF, TXT e imagem corrompida e confirmar as mensagens de erro.

HEIC/HEIF não é aceito. No iPhone, o seletor com `accept` JPEG/PNG/WebP costuma converter para JPEG automaticamente; confirmar em aparelho real.

## Continuidade

O Blob não faz parte do backup PostgreSQL. Imagens já armazenadas antes da otimização não são recomprimidas. A política de retenção/backup do armazenamento e um processo periódico de reconciliação de Blobs órfãos continuam como decisões operacionais necessárias antes de considerar a funcionalidade plenamente homologada em produção.
