import { test, expect } from 'vitest';
import * as assert from 'assert';

type MensagemGerada = {
  papel: string;
  conteudo: string;
  modelo: string | null;
  criadoEm: Date;
  tokensEntrada: number;
  tokensSaida: number;
  ordem: number;
};

type MensagemVisivel = {
  papel: "user" | "assistant";
  texto: string;
  modelo: string | null;
  criadoEm: string;
};

function eTurnoDoUsuario(papel: string, conteudo: any): boolean {
  return papel === "user" && Array.isArray(conteudo) && conteudo.every((bloco: any) => bloco.type === "text");
}
function extrairTexto(conteudo: any): string | null {
  if (Array.isArray(conteudo)) {
      for (const bloco of conteudo) {
          if (bloco.type === "text") return bloco.text;
      }
  }
  return null;
}

const mensagens = [
    { papel: 'user', conteudoApi: [{ type: 'text', text: 'Hello' }], modelo: null, criadoEm: new Date('2023-01-01T00:00:00.000Z') },
    { papel: 'assistant', conteudoApi: [{ type: 'text', text: 'Hi' }], modelo: 'gpt-4', criadoEm: new Date('2023-01-01T00:01:00.000Z') },
    { papel: 'user', conteudoApi: [{ type: 'text', text: 'How are you?' }], modelo: null, criadoEm: new Date('2023-01-01T00:02:00.000Z') },
];

function old_way(mensagens: any[]) {
    return {
        perguntas: mensagens.filter((m) => eTurnoDoUsuario(m.papel, m.conteudoApi)).length,
        visiveis: mensagens
        .map((m): MensagemVisivel | null => {
            const texto = extrairTexto(m.conteudoApi);
            if (!texto) return null;
            if (m.papel === "user" && !eTurnoDoUsuario(m.papel, m.conteudoApi)) return null;
            return {
            papel: m.papel as "user" | "assistant",
            texto,
            modelo: m.modelo,
            criadoEm: m.criadoEm.toISOString(),
            };
        })
        .filter((m): m is MensagemVisivel => m !== null),
    }
}

function new_way(mensagens: any[]) {
  let perguntas = 0;
  const visiveis: MensagemVisivel[] = [];

  for (const m of mensagens) {
    const eTurnoUsuario = eTurnoDoUsuario(m.papel, m.conteudoApi);
    if (eTurnoUsuario) perguntas++;

    const texto = extrairTexto(m.conteudoApi);
    if (!texto) continue;
    if (m.papel === "user" && !eTurnoUsuario) continue;

    visiveis.push({
      papel: m.papel as "user" | "assistant",
      texto,
      modelo: m.modelo,
      criadoEm: m.criadoEm.toISOString(),
    });
  }
  return { perguntas, visiveis };
}

console.log(JSON.stringify(old_way(mensagens), null, 2));
console.log(JSON.stringify(new_way(mensagens), null, 2));
assert.deepStrictEqual(old_way(mensagens), new_way(mensagens));
console.log('OK');
