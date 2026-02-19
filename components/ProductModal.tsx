
import React, { useState, useEffect } from 'react';
import { Product } from '../types';

interface ProductModalProps {
  isOpen: boolean;
  product: Product | null; // Null if adding a new product
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | Product) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, product, onClose, onSave }) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(''); // Store as string for input
  const [estoque, setEstoque] = useState(''); // Store as string for input

  useEffect(() => {
    if (product) {
      setNome(product.nome);
      setDescricao(product.descricao || '');
      setValor((product.valor / 100).toFixed(2).replace('.', ',')); // Convert cents to R$ for display with comma
      setEstoque(product.estoque.toString());
    } else {
      // Reset form for new product
      setNome('');
      setDescricao('');
      setValor('');
      setEstoque('');
    }
  }, [product, isOpen]); // Reset when modal opens or product changes

  if (!isOpen) return null;

  const handleSave = () => {
    // Allow both comma and dot for input, then convert to dot for parseFloat
    const parsedValor = parseFloat(valor.replace(',', '.'));
    const parsedEstoque = parseInt(estoque);

    if (!nome.trim() || isNaN(parsedValor) || parsedValor <= 0 || isNaN(parsedEstoque) || parsedEstoque < 0) {
      alert('Por favor, preencha o nome, um valor válido (>0) e um estoque válido (>=0).');
      return;
    }

    const productData = product
      ? { ...product, nome, descricao, valor: Math.round(parsedValor * 100), estoque: parsedEstoque }
      : { nome, descricao, valor: Math.round(parsedValor * 100), estoque: parsedEstoque };

    onSave(productData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={onClose}
         onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
         tabIndex={-1}
         aria-modal="true"
         role="dialog"
         aria-labelledby="productModalTitle"
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 id="productModalTitle" className="text-2xl font-black text-gray-800">{product ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
              <p className="text-sm text-gray-500">Preencha os dados do produto</p>
            </div>
            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar modal de produto">✕</button>
          </div>
        </div>

        <div className="flex-1 p-8 space-y-6">
          <div>
            <label htmlFor="productName" className="block text-sm font-semibold text-gray-700 mb-2">Nome do Produto</label>
            <input
              type="text"
              id="productName"
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Cadarço Branco"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="productDescription" className="block text-sm font-semibold text-gray-700 mb-2">Descrição (Opcional)</label>
            <textarea
              id="productDescription"
              rows={3}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all resize-y"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Cadarço de algodão para tênis de corrida."
              aria-label="Descrição do produto"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="productValue" className="block text-sm font-semibold text-gray-700 mb-2">Valor (R$)</label>
              <input
                type="text"
                id="productValue"
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
                value={valor}
                onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and a single comma/dot for decimal, then convert to comma for display
                    if (/^\d*([.,]\d{0,2})?$/.test(value) || value === '') {
                        setValor(value.replace('.', ',')); // Keep comma for display
                    }
                }}
                placeholder="Ex: 15,00"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="productStock" className="block text-sm font-semibold text-gray-700 mb-2">Estoque</label>
              <input
                type="number"
                id="productStock"
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-light outline-none transition-all"
                value={estoque}
                onChange={(e) => setEstoque(e.target.value)}
                placeholder="Ex: 50"
                min="0"
                aria-required="true"
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-all"
            aria-label="Cancelar e fechar"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-primary-light text-white rounded-xl font-bold shadow-lg shadow-primary-light/30 hover:bg-primary transition-all"
            aria-label="Salvar informações do produto"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;