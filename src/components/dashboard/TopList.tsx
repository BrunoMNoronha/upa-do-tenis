import React from 'react';
import { Card } from '@/components/ui';

export interface TopListItem {
  id: string;
  nome: string;
  quantidade: number;
}

interface TopListProps {
  title: string;
  items: TopListItem[];
  emptyMessage: string;
}

export function TopList({ title, items, emptyMessage }: TopListProps) {
  return (
    <Card className="flex flex-col h-full p-6">
      <div className="pb-4 border-b border-black/10">
        <h3 className="text-lg font-medium tracking-tight text-[color:var(--text)]">{title}</h3>
      </div>
      <div className="flex-1 mt-4">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center py-6 text-sm text-slate-500 text-center">
            {emptyMessage}
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <span className="font-medium text-[color:var(--text)] truncate max-w-[200px]" title={item.nome}>
                    {item.nome}
                  </span>
                </div>
                <span className="font-semibold text-[color:var(--accent-strong)]">{item.quantidade}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
