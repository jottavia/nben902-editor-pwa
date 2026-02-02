import React, { useState } from 'react';
import { X, Save, FileText, Trash2 } from 'lucide-react';
import type { NBEN902Record } from '../utils/nb902';

interface ReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    deletedRecords: NBEN902Record[];
    onSaveReport: (recordsWithReasons: { record: NBEN902Record; reason: string }[]) => void;
    onClear: () => void;
    onRemoveRecord: (id: string) => void;
    prefilledReasons?: Record<string, string>;
}

const REASON_OPTIONS = [
    "No authorization",
    "Already entered",
    "No longer employed",
    "Transferred",
    "Other"
];

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
    isOpen,
    onClose,
    deletedRecords,
    onSaveReport,
    onClear,
    onRemoveRecord,
    prefilledReasons
}) => {
    // Map of record ID to selected dropdown value
    const [selections, setSelections] = useState<Record<string, string>>({});
    // Map of record ID to custom text input (only used if "Other" is selected)
    const [customText, setCustomText] = useState<Record<string, string>>({});

    React.useEffect(() => {
        if (prefilledReasons) {
            setSelections(prev => ({ ...prev, ...prefilledReasons }));
        }
    }, [prefilledReasons]);

    if (!isOpen) return null;

    const handleSelectionChange = (id: string, value: string) => {
        setSelections(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleCustomTextChange = (id: string, value: string) => {
        setCustomText(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSave = () => {
        const result = deletedRecords.map(r => {
            const selectedReason = selections[r.id] || "No authorization";
            const finalReason = selectedReason === "Other"
                ? (customText[r.id] || "No reason provided")
                : selectedReason;

            return {
                record: r,
                reason: finalReason
            };
        });
        onSaveReport(result);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg-panel border border-border rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-100">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-bg-panel shrink-0">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="text-blue-400" size={20} />
                        Reconciliation Report Editor
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-bg-deep border-b border-border shrink-0">
                    <p className="text-sm text-zinc-400">
                        These items were deleted or excluded. Please select a reason for the reconciliation report.
                    </p>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs font-semibold text-zinc-500 border-b border-border">
                                <th className="p-2 w-32">Employee ID</th>
                                <th className="p-2 w-1/4">Name</th>
                                <th className="p-2 w-20">Agency</th>
                                <th className="p-2">Reason for Exclusion</th>
                                <th className="p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {deletedRecords.map(record => {
                                const currentSelection = selections[record.id] || "No authorization";
                                return (
                                    <tr key={record.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                                        <td className="p-2 font-mono text-zinc-300">{record.employeeId}</td>
                                        <td className="p-2 font-medium text-white">{record.name}</td>
                                        <td className="p-2 text-zinc-400">{record.agencyCode}</td>
                                        <td className="p-2">
                                            <div className="flex gap-2">
                                                <select
                                                    value={currentSelection}
                                                    onChange={(e) => handleSelectionChange(record.id, e.target.value)}
                                                    className="bg-bg-app border border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                                                >
                                                    {REASON_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>

                                                {currentSelection === "Other" && (
                                                    <input
                                                        type="text"
                                                        placeholder="Enter reason..."
                                                        value={customText[record.id] || ''}
                                                        onChange={(e) => handleCustomTextChange(record.id, e.target.value)}
                                                        className="flex-1 bg-bg-app border border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                                                        autoFocus
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-2 text-right">
                                            <button
                                                onClick={() => onRemoveRecord(record.id)}
                                                className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                                title="Remove from report"
                                            >
                                                <X size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {deletedRecords.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-zinc-500 italic">
                                        No deleted records to reconcile.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-bg-panel flex justify-between gap-2 shrink-0">
                    <button
                        onClick={() => {
                            if (confirm("Are you sure? This will remove all items from the reconciliation list.")) {
                                onClear();
                            }
                        }}
                        disabled={deletedRecords.length === 0}
                        className="px-4 py-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded text-sm transition-colors flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={16} />
                        Clear List
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={deletedRecords.length === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={16} />
                            Save Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
