## 2024-05-24 - Timing Attack em Validação de Senha
**Vulnerabilidade:** Ocultar o cálculo de hash da senha em fluxos de erro precoce (ex: se o usuário não for encontrado no banco de dados).
**Aprendizado:** A validação curta "early return" permitia que invasores verificassem se um email existia medindo o tempo de resposta do servidor, visto que `verifyPassword` leva significativamente mais tempo que falhas imediatas de banco de dados.
**Prevenção:** Sempre execute o cálculo de hash (`verifyPassword`) mesmo para usuários inexistentes usando um `DUMMY_HASH` consistente para mascarar diferenças no tempo de execução.
