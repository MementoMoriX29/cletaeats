// Tabla simple con desplazamiento horizontal en pantallas chicas.
import type { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  caption?: string;
}

export function DataTable<T>({ rows, columns, rowKey, onRowClick, caption }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
      <table className="w-full min-w-[720px] text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line text-ink-2">
            {columns.map((column) => (
              <th key={column.header} scope="col" className={`whitespace-nowrap px-4 py-3 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-canvas' : ''}>
              {columns.map((column) => (
                <td key={column.header} className={`px-4 py-3 align-middle ${column.align === 'right' ? 'money text-right' : ''} ${column.className ?? ''}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
