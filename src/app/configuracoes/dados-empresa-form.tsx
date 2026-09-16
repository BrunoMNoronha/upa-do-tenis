"use client";

import { useMemo, useState } from "react";

import { Button, Card, Input, PanelHeader } from "@/components/ui";
import {
  dadosEmpresaSchema,
  type DadosEmpresa,
  type DadosEmpresaEntrada,
} from "@/lib/dados-empresa";
import { formatCEP, formatCPFCNPJ, formatPhone, maskCPFCNPJ, maskPhone } from "@/lib/formatters";

type Formulario = {
  nomeFantasia: string;
  nomeComplementar: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  horarioAtendimento: string;
  instagramUrl: string;
  facebookUrl: string;
};

function paraFormulario(dados: DadosEmpresa): Formulario {
  return {
    nomeFantasia: dados.nomeFantasia,
    nomeComplementar: dados.nomeComplementar ?? "",
    razaoSocial: dados.razaoSocial ?? "",
    cnpj: formatCPFCNPJ(dados.cnpj),
    telefone: formatPhone(dados.telefone),
    whatsapp: formatPhone(dados.whatsapp),
    email: dados.email ?? "",
    site: dados.site ?? "",
    logradouro: dados.endereco.logradouro ?? "",
    numero: dados.endereco.numero ?? "",
    complemento: dados.endereco.complemento ?? "",
    bairro: dados.endereco.bairro ?? "",
    cidade: dados.endereco.cidade ?? "",
    uf: dados.endereco.uf ?? "",
    cep: formatCEP(dados.endereco.cep),
    horarioAtendimento: dados.horarioAtendimento ?? "",
    instagramUrl: dados.instagramUrl ?? "",
    facebookUrl: dados.facebookUrl ?? "",
  };
}

function paraPayload(formulario: Formulario): DadosEmpresaEntrada {
  return {
    versao: 1,
    nomeFantasia: formulario.nomeFantasia,
    nomeComplementar: formulario.nomeComplementar,
    razaoSocial: formulario.razaoSocial,
    cnpj: formulario.cnpj,
    telefone: formulario.telefone,
    whatsapp: formulario.whatsapp,
    email: formulario.email,
    site: formulario.site,
    endereco: {
      logradouro: formulario.logradouro,
      numero: formulario.numero,
      complemento: formulario.complemento,
      bairro: formulario.bairro,
      cidade: formulario.cidade,
      uf: formulario.uf,
      cep: formulario.cep,
    },
    horarioAtendimento: formulario.horarioAtendimento,
    instagramUrl: formulario.instagramUrl,
    facebookUrl: formulario.facebookUrl,
  };
}

type CampoProps = {
  id: keyof Formulario;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  error?: string;
  description?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
};

function Campo({ id, label, value, onChange, error, description, required, type = "text", autoComplete }: CampoProps) {
  const descricaoId = description ? `${id}-descricao` : undefined;
  const erroId = error ? `${id}-erro` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-[color:var(--text)]">
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {description ? <p id={descricaoId} className="text-xs text-slate-500">{description}</p> : null}
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={[descricaoId, erroId].filter(Boolean).join(" ") || undefined}
        className={error ? "border-red-400 focus:border-red-500" : ""}
        onChange={(evento) => onChange(evento.target.value)}
      />
      {error ? <p id={erroId} role="alert" className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

export function DadosEmpresaForm({ dadosIniciais }: { dadosIniciais: DadosEmpresa }) {
  const inicial = useMemo(() => paraFormulario(dadosIniciais), [dadosIniciais]);
  const [formulario, setFormulario] = useState<Formulario>(inicial);
  const [salvo, setSalvo] = useState<Formulario>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const validacao = dadosEmpresaSchema.safeParse(paraPayload(formulario));
  const alterado = JSON.stringify(formulario) !== JSON.stringify(salvo);
  const erros = validacao.success
    ? new Map<string, string>()
    : new Map(validacao.error.issues.map((erro) => [erro.path.join("."), erro.message]));

  const atualizar = (campo: keyof Formulario, valor: string) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
    setMensagem(null);
  };

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setMensagem(null);
    if (!validacao.success || salvando) return;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/configuracoes/dados-empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validacao.data),
      });
      const payload = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setMensagem({ tipo: "erro", texto: payload?.message ?? "Não foi possível salvar os dados da empresa." });
        return;
      }

      const normalizado = dadosEmpresaSchema.parse(payload);
      const proximo = paraFormulario(normalizado);
      setFormulario(proximo);
      setSalvo(proximo);
      setMensagem({ tipo: "sucesso", texto: "Dados da empresa atualizados com sucesso." });
    } catch {
      setMensagem({ tipo: "erro", texto: "Falha de comunicação com o servidor. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[color:var(--border)] p-6">
        <PanelHeader title="Dados da empresa" description="Identificação, contatos e presença digital usados pelo sistema." />
      </div>
      <form onSubmit={salvar} className="space-y-8 p-6" noValidate>
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-[color:var(--text)]">Identificação</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="nomeFantasia" label="Nome fantasia" value={formulario.nomeFantasia} onChange={(v) => atualizar("nomeFantasia", v)} error={erros.get("nomeFantasia")} required />
            <Campo id="nomeComplementar" label="Nome complementar" value={formulario.nomeComplementar} onChange={(v) => atualizar("nomeComplementar", v)} error={erros.get("nomeComplementar")} />
            <Campo id="razaoSocial" label="Razão social" value={formulario.razaoSocial} onChange={(v) => atualizar("razaoSocial", v)} error={erros.get("razaoSocial")} description="Preencha somente após confirmação documental." />
            <Campo id="cnpj" label="CNPJ" value={formulario.cnpj} onChange={(v) => atualizar("cnpj", maskCPFCNPJ(v))} error={erros.get("cnpj")} description="Opcional; os dígitos verificadores serão validados." />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-[color:var(--text)]">Contato</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="telefone" label="Telefone" value={formulario.telefone} onChange={(v) => atualizar("telefone", maskPhone(v))} error={erros.get("telefone")} autoComplete="tel" />
            <Campo id="whatsapp" label="WhatsApp" value={formulario.whatsapp} onChange={(v) => atualizar("whatsapp", maskPhone(v))} error={erros.get("whatsapp")} autoComplete="tel" />
            <Campo id="email" label="E-mail" value={formulario.email} onChange={(v) => atualizar("email", v)} error={erros.get("email")} type="email" autoComplete="email" />
            <Campo id="site" label="Site" value={formulario.site} onChange={(v) => atualizar("site", v)} error={erros.get("site")} type="url" autoComplete="url" />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-[color:var(--text)]">Endereço</legend>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2"><Campo id="logradouro" label="Logradouro" value={formulario.logradouro} onChange={(v) => atualizar("logradouro", v)} error={erros.get("endereco.logradouro")} autoComplete="address-line1" /></div>
            <Campo id="numero" label="Número" value={formulario.numero} onChange={(v) => atualizar("numero", v)} error={erros.get("endereco.numero")} />
            <Campo id="complemento" label="Complemento" value={formulario.complemento} onChange={(v) => atualizar("complemento", v)} error={erros.get("endereco.complemento")} autoComplete="address-line2" />
            <Campo id="bairro" label="Bairro" value={formulario.bairro} onChange={(v) => atualizar("bairro", v)} error={erros.get("endereco.bairro")} />
            <Campo id="cidade" label="Cidade" value={formulario.cidade} onChange={(v) => atualizar("cidade", v)} error={erros.get("endereco.cidade")} autoComplete="address-level2" />
            <Campo id="uf" label="UF" value={formulario.uf} onChange={(v) => atualizar("uf", v.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase())} error={erros.get("endereco.uf")} autoComplete="address-level1" />
            <Campo id="cep" label="CEP" value={formulario.cep} onChange={(v) => { const d = v.replace(/\D/g, "").slice(0, 8); atualizar("cep", d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d); }} error={erros.get("endereco.cep")} autoComplete="postal-code" />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-[color:var(--text)]">Atendimento e presença digital</legend>
          <div className="space-y-1.5">
            <label htmlFor="horarioAtendimento" className="block text-sm font-semibold text-[color:var(--text)]">Horário de atendimento</label>
            <textarea id="horarioAtendimento" name="horarioAtendimento" rows={4} value={formulario.horarioAtendimento} onChange={(e) => atualizar("horarioAtendimento", e.target.value)} aria-invalid={Boolean(erros.get("horarioAtendimento"))} aria-describedby={erros.get("horarioAtendimento") ? "horarioAtendimento-erro" : undefined} className="w-full rounded-[var(--r-field)] border border-[color:var(--border)] bg-white px-3 py-2 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]" />
            {erros.get("horarioAtendimento") ? <p id="horarioAtendimento-erro" role="alert" className="text-xs font-semibold text-red-600">{erros.get("horarioAtendimento")}</p> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="instagramUrl" label="Instagram" value={formulario.instagramUrl} onChange={(v) => atualizar("instagramUrl", v)} error={erros.get("instagramUrl")} type="url" />
            <Campo id="facebookUrl" label="Facebook" value={formulario.facebookUrl} onChange={(v) => atualizar("facebookUrl", v)} error={erros.get("facebookUrl")} type="url" />
          </div>
        </fieldset>

        {mensagem ? <div role={mensagem.tipo === "erro" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm font-medium ${mensagem.tipo === "erro" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{mensagem.texto}</div> : null}

        <div className="flex flex-wrap gap-3 border-t border-black/5 pt-4">
          <Button type="submit" disabled={salvando || !alterado || !validacao.success} isLoading={salvando}>Salvar alterações</Button>
          <Button type="button" variant="secondary" disabled={salvando || !alterado} onClick={() => { setFormulario(salvo); setMensagem(null); }}>Descartar alterações</Button>
        </div>
      </form>
    </Card>
  );
}
