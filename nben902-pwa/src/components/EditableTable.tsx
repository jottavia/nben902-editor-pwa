import React, { useRef, useState, useCallback } from 'react';
import { COLUMN_SPECS, TOOLTIPS, type NBEN902Record, validateRecord } from '../utils/nb902';
import { Copy, Trash2 } from 'lucide-react';
import { usePersistentState } from '../hooks/usePersistentState';

interface EditableTableProps {
    data: NBEN902Record[];
    onUpdate: (data: NBEN902Record[]) => void;
    duplicateDefaults: {
        code: string;
        amount: string;
    };
}

// Default widths matching the requested "Terminal" feel
// (Replaced by DEFAULT_LAYOUT above, keeping this block empty to remove old code)

// Fluid defaults that fill the screen based on content priority
const DEFAULT_LAYOUT = {
    dup: "40px",
    agencyCode: "minmax(90px, 1fr)",
    name: "minmax(200px, 3.5fr)",
    employeeId: "minmax(100px, 1.2fr)",
    deductionCode: "minmax(120px, 1.2fr)",
    effectiveDate: "minmax(120px, 1.3fr)",
    deductionEndDate: "minmax(140px, 1.5fr)",
    deductionAmount: "minmax(130px, 1.3fr)",
    del: "40px"
};

export const EditableTable: React.FC<EditableTableProps> = ({ data, onUpdate, duplicateDefaults }) => {
    const lastEffectiveDateRef = useRef<string>("");
    const headerRef = useRef<HTMLDivElement>(null);
    const [colWidths, setColWidths] = usePersistentState<Record<string, string | number>>('nben902_layout_v2', DEFAULT_LAYOUT);

    // Resize State
    const [resizingCol, setResizingCol] = useState<string | null>(null);
    const startXRef = useRef<number>(0);
    const startWidthRef = useRef<number>(0);
    const resizingKeyRef = useRef<string | null>(null);

    // Compute validation errors
    const validationErrors = React.useMemo(() => {
        const errors: Record<string, Record<Partial<keyof NBEN902Record>, string | null>> = {};
        data.forEach(record => {
            const { isValid, errors: recordErrors } = validateRecord(record);
            if (!isValid) {
                errors[record.id] = recordErrors;
            }
        });
        return errors;
    }, [data]);

    const handleCellChange = (id: string, field: keyof NBEN902Record, value: string) => {
        const newData = data.map(record => {
            if (record.id === id) {
                if (field === 'name') {
                    return { ...record, [field]: value.toUpperCase() };
                }
                return { ...record, [field]: value };
            }
            return record;
        });
        onUpdate(newData);
    };

    const handleDuplicate = (index: number) => {
        const original = data[index];
        const newRecord: NBEN902Record = {
            ...original,
            id: crypto.randomUUID(),
            deductionCode: duplicateDefaults.code,
            deductionAmount: duplicateDefaults.amount
        };
        const newData = [...data];
        newData.splice(index + 1, 0, newRecord);
        onUpdate(newData);
    };

    const handleDelete = (index: number) => {
        const newData = [...data];
        newData.splice(index, 1);
        onUpdate(newData);
    };

    const handleBlurEffectiveDate = (value: string) => {
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (dateRegex.test(value)) {
            lastEffectiveDateRef.current = value;
            const newData = data.map(r => ({ ...r, effectiveDate: value }));
            onUpdate(newData);
        }
    };

    // Resize Handlers
    // Resize Handlers
    const startResize = (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (headerRef.current) {
            let needsSnapshot = false;
            if (typeof colWidths[key] === 'string') {
                needsSnapshot = true;
            }

            if (needsSnapshot) {
                const headers = Array.from(headerRef.current.children) as HTMLElement[];
                const newPixelWidths: Record<string, number> = {};

                headers.forEach(header => {
                    const colKey = header.dataset.colKey;
                    if (colKey && colKey !== 'dup' && colKey !== 'del') {
                        newPixelWidths[colKey] = header.getBoundingClientRect().width;
                    }
                });
                newPixelWidths.dup = 40;
                newPixelWidths.del = 40;

                setColWidths(prev => ({ ...prev, ...newPixelWidths }));

                const headerEl = headers.find(h => h.dataset.colKey === key);
                startWidthRef.current = headerEl ? headerEl.getBoundingClientRect().width : 100;
            } else {
                startWidthRef.current = colWidths[key] as number;
            }
        }

        setResizingCol(key);
        resizingKeyRef.current = key;
        startXRef.current = e.pageX;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingKeyRef.current) return;
        const currentKey = resizingKeyRef.current;

        const diff = e.pageX - startXRef.current;
        const newWidth = Math.max(40, (startWidthRef.current || 0) + diff);

        setColWidths(prev => ({
            ...prev,
            [currentKey]: newWidth
        }));
    }, [setColWidths]);

    const onMouseUp = () => {
        setResizingCol(null);
        resizingKeyRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
    };

    const getValue = (val: string | number) => typeof val === 'number' ? `${val}px` : val;

    // Construct Dynamic Grid Template
    const gridTemplate = `
    ${getValue(colWidths.dup)} 
    ${getValue(colWidths.agencyCode)} 
    ${getValue(colWidths.name)} 
    ${getValue(colWidths.employeeId)} 
    ${getValue(colWidths.deductionCode)} 
    ${getValue(colWidths.effectiveDate)} 
    ${getValue(colWidths.deductionEndDate)} 
    ${getValue(colWidths.deductionAmount)} 
    ${getValue(colWidths.del)}
  `;

    return (
        <div className="flex-1 overflow-auto relative bg-bg-app select-none">
            <div
                className="grid border-b border-border sticky top-0 z-10 shadow-lg bg-bg-panel"
                style={{ gridTemplateColumns: gridTemplate, width: 'max-content' }}
            >
                {/* Dup */}
                <div className="relative bg-bg-panel text-zinc-300 text-[10px] uppercase font-bold flex items-center justify-center border-r border-border py-2">
                    Dup
                </div>

                {COLUMN_SPECS.map(col => (
                    <div
                        key={col.key}
                        className={`relative bg-bg-panel text-zinc-300 text-[10px] uppercase font-bold flex items-center px-3 border-r border-border py-2 whitespace-nowrap overflow-hidden group/header ${resizingCol === col.key ? 'bg-blue-500/10 text-blue-400' : ''}`}
                        title={TOOLTIPS[col.label] || col.label}
                    >
                        {col.label}
                        {/* Resize Handle */}
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20 opacity-0 group-hover/header:opacity-100"
                            onMouseDown={(e) => startResize(e, col.key)}
                        />
                    </div>
                ))}

                {/* Del */}
                <div className="relative bg-bg-panel text-zinc-300 text-[10px] uppercase font-bold flex items-center justify-center py-2">
                    Del
                </div>
            </div>

            {/* Data Rows */}
            <div className="bg-bg-app" style={{ width: '100%' }}>
                {data.map((record, idx) => (
                    <div
                        key={record.id}
                        className="grid hover:bg-bg-hover group transition-colors duration-75 border-b border-border/30"
                        style={{ gridTemplateColumns: gridTemplate }}
                    >
                        {/* Duplicate */}
                        <div className="flex items-center justify-center border-r border-border/30">
                            <button
                                onClick={() => handleDuplicate(idx)}
                                className="text-zinc-600 hover:text-blue-400 p-1 opacity-20 group-hover:opacity-100 transition-opacity"
                            >
                                <Copy size={12} />
                            </button>
                        </div>

                        {/* Columns */}
                        {COLUMN_SPECS.map(col => (
                            <div key={`${record.id}-${col.key}`} className="relative border-r border-border/30 h-[34px]">
                                <input
                                    value={record[col.key as keyof NBEN902Record] || ''}
                                    onChange={(e) => handleCellChange(record.id, col.key as keyof NBEN902Record, e.target.value)}
                                    maxLength={col.width}
                                    placeholder={col.key === 'deductionAmount' ? '2000' : ''}
                                    className={`input-grid ${validationErrors[record.id]?.[col.key as keyof NBEN902Record] ? 'bg-red-900/40 text-red-200 border-red-500 focus:border-red-400' : ''}`}
                                    spellCheck={false}
                                    title={validationErrors[record.id]?.[col.key as keyof NBEN902Record] || ""}
                                    onBlur={(e) => {
                                        if (col.key === 'effectiveDate') handleBlurEffectiveDate(e.target.value);
                                    }}
                                />
                            </div>
                        ))}

                        {/* Delete */}
                        <div className="flex items-center justify-center">
                            <button
                                onClick={() => handleDelete(idx)}
                                className="text-zinc-600 hover:text-red-400 p-1 opacity-20 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {
                data.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-600 w-full">
                        <p className="text-sm font-mono">No Records Loaded</p>
                        <p className="text-xs mt-2">Open a file or add a row to begin.</p>
                    </div>
                )
            }
        </div >
    );
};
