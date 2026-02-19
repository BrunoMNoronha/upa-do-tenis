
import React, { useState } from 'react';

const AdminDocs: React.FC = () => {
  const [activeSection, setActiveSection] = useState('geral');

  const sections = [
    { id: 'geral', label: 'Visão Geral' },
    { id: 'regras', label: 'Regras de Negócio' },
    { id: 'api', label: 'APIs e Integrações' },
    { id: 'banco', label: 'Banco de Dados' },
    { id: 'usuarios', label: 'Usuários e Acesso' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Documentação Administrativa</h1>
          <p className="text-sm text-gray-500">Área restrita para documentação técnica e configurações do sistema.</p>
        </div>
        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
          ACESSO RESTRITO: ADMIN
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar de Navegação da Doc */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-6 py-4 text-sm font-medium border-b border-gray-50 last:border-0 transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-light/10 text-primary border-l-4 border-l-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-l-transparent'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
          
          {activeSection === 'geral' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Visão Geral do Projeto</h2>
              <p className="text-gray-600 leading-relaxed">
                O <strong>UPA do Tênis - Gestão de OS</strong> é uma Single Page Application (SPA) desenvolvida para gerenciamento de sapatarias e lavanderias de tênis.
                O sistema centraliza o controle de ordens de serviço, cadastro de clientes, controle de estoque de produtos e serviços, além de um fluxo de caixa simplificado.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-2">Stack Tecnológica</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>React 19 (Hooks, Context)</li>
                    <li>TypeScript (Tipagem Estática)</li>
                    <li>Tailwind CSS (Estilização)</li>
                    <li>Recharts (Visualização de Dados)</li>
                    <li>Google Gemini AI (Inteligência Artificial)</li>
                  </ul>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-2">Estrutura de Pastas</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li><code>/components</code>: Componentes de UI</li>
                    <li><code>/services</code>: Integrações externas</li>
                    <li><code>types.ts</code>: Definições de Tipos</li>
                    <li><code>store.ts</code>: Lógica de Estado e Persistência</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'regras' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Regras de Negócio</h2>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                  <h3 className="font-bold text-yellow-800 mb-1">1. Fluxo de Ordem de Serviço (OS)</h3>
                  <p className="text-sm text-yellow-800/80">
                    O ciclo de vida de uma OS segue os status: 
                    <span className="font-mono bg-white px-1 rounded ml-1">RECEBIDO</span> -> 
                    <span className="font-mono bg-white px-1 rounded ml-1">EM_ANDAMENTO</span> -> 
                    <span className="font-mono bg-white px-1 rounded ml-1">AGUARDANDO_CLIENTE</span> -> 
                    <span className="font-mono bg-white px-1 rounded ml-1">ENTREGUE</span>.
                    Toda mudança de status gera um registro no histórico.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 mb-2">2. Financeiro e Pagamentos</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                    <li>O pagamento de uma OS pode ser parcial ou total.</li>
                    <li>O sistema calcula automaticamente o valor "Pendente" (Total - Valor Pago).</li>
                    <li>Toda entrada de pagamento em uma OS gera automaticamente um registro de <strong>RECEITA</strong> no Fluxo de Caixa vinculada àquela OS.</li>
                    <li>Não é permitido salvar uma OS onde o valor de entrada inicial seja maior que o total dos serviços.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 mb-2">3. Estoque e Serviços</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                    <li>Produtos possuem controle de quantidade (estoque).</li>
                    <li>Serviços são itens intangíveis e não decrementam estoque.</li>
                    <li>Ao adicionar um item à OS, o valor unitário pode ser alterado manualmente para aquele pedido específico, sem afetar o cadastro original.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">APIs e Integrações</h2>
              
              <div>
                <h3 className="flex items-center text-lg font-bold text-primary mb-2">
                  <span className="mr-2">✨</span> Google Gemini API
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  O sistema utiliza o modelo <code>gemini-3-flash-preview</code> para gerar insights de negócio inteligentes no Dashboard.
                </p>
                
                <div className="bg-gray-900 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                  <p className="text-slate-500 mb-2">// Exemplo de chamada (services/gemini.ts)</p>
                  <p>const ai = new GoogleGenAI({`{ apiKey: process.env.API_KEY }`});</p>
                  <p>const response = await ai.models.generateContent({`{`}</p>
                  <p className="pl-4">model: 'gemini-3-flash-preview',</p>
                  <p className="pl-4">contents: promptData,</p>
                  <p className="pl-4">config: {`{ responseMimeType: "application/json" }`}</p>
                  <p>});</p>
                </div>
              </div>

              <div>
                <h3 className="flex items-center text-lg font-bold text-green-600 mb-2">
                  <span className="mr-2">📱</span> Integração WhatsApp
                </h3>
                <p className="text-gray-600 text-sm">
                  O sistema gera links profundos (Deep Links) para a API do WhatsApp (<code>wa.me</code>) para facilitar a comunicação com clientes. 
                  O número é formatado automaticamente para o padrão brasileiro (+55).
                </p>
              </div>
            </div>
          )}

          {activeSection === 'banco' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Banco de Dados e Persistência</h2>
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                <h3 className="font-bold text-blue-800 flex items-center">
                  <span className="mr-2">💾</span> LocalStorage Strategy
                </h3>
                <p className="text-sm text-blue-800/80 mt-1">
                  Este sistema opera como uma aplicação "Client-Side Only" neste estágio. Todos os dados são persistidos no <code>localStorage</code> do navegador do usuário.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-2">Chaves de Armazenamento</h3>
                <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-500 font-semibold">
                    <tr>
                      <th className="p-3 border-b">Chave (Key)</th>
                      <th className="p-3 border-b">Conteúdo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="p-3 font-mono text-primary">upa_clients</td><td className="p-3">Array de Clientes (JSON)</td></tr>
                    <tr><td className="p-3 font-mono text-primary">upa_products</td><td className="p-3">Array de Produtos (JSON)</td></tr>
                    <tr><td className="p-3 font-mono text-primary">upa_services</td><td className="p-3">Array de Serviços (JSON)</td></tr>
                    <tr><td className="p-3 font-mono text-primary">upa_orders</td><td className="p-3">Ordens de Serviço e Histórico (JSON)</td></tr>
                    <tr><td className="p-3 font-mono text-primary">upa_cashflow</td><td className="p-3">Transações Financeiras (JSON)</td></tr>
                    <tr><td className="p-3 font-mono text-primary">upa_useMockData</td><td className="p-3">Boolean (Estado do modo de demonstração)</td></tr>
                    <tr><td className="p-3 font-mono text-primary">upa_showGeminiInsights</td><td className="p-3">Boolean (Estado da ativação dos insights Gemini)</td></tr>
                    <tr><td className="p-3 font-mono text-primary">upa_currentUser (sessionStorage)</td><td className="p-3">Objeto User (JSON) do usuário logado</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'usuarios' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Usuários e Permissões</h2>
              
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  A autenticação no sistema é realizada através de um <strong>Login com Google simulado</strong>. Após o login bem-sucedido, um objeto <code>User</code> é armazenado no <code>sessionStorage</code>.
                </p>
                <p className="text-gray-600 text-sm">
                  Existem dois níveis de acesso definidos pela propriedade <code>role</code> do objeto <code>User</code>:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cartão Admin */}
                  <div className="border border-red-200 bg-red-50 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-red-200 text-red-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">ADMIN</div>
                    <h3 className="font-bold text-red-900 mb-1">Super Admin</h3>
                    <p className="text-xs text-red-800 mb-3">Acesso total ao sistema, incluindo este menu administrativo. Este perfil é concedido quando o email do usuário logado (simulado) corresponde a um email de administrador pré-definido (por exemplo, <code>admin@example.com</code>).</p>
                    <div className="bg-white/60 p-2 rounded text-xs font-mono text-red-900 space-y-1">
                      <p><strong>Role:</strong> <code>'admin'</code></p>
                    </div>
                  </div>

                  {/* Cartão Operador */}
                  <div className="border border-green-200 bg-green-50 rounded-xl p-5 relative overflow-hidden">
                     <div className="absolute top-0 right-0 bg-green-200 text-green-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">OPERADOR</div>
                    <h3 className="font-bold text-green-900 mb-1">Operador Padrão</h3>
                    <p className="text-xs text-green-800 mb-3">Acesso às rotinas diárias (Dashboard, OS, Clientes, Estoque & Serviços, Fluxo de Caixa, Relatórios), sem acesso à documentação técnica. Este é o perfil padrão para qualquer usuário logado que não seja um administrador.</p>
                    <div className="bg-white/60 p-2 rounded text-xs font-mono text-green-900 space-y-1">
                      <p><strong>Role:</strong> <code>'licensed_user'</code></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDocs;
