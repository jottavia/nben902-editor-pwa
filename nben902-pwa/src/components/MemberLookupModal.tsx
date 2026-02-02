import React, { useState } from 'react';
import { useComptroller } from '../contexts/ComptrollerContext';
import type { UnifiedMemberProfile } from '../types/comptroller';
import { Search, Plus, UserCheck } from 'lucide-react';

interface MemberLookupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (member: UnifiedMemberProfile) => void;
    actionLabel?: string;
    actionIcon?: React.ElementType;
}

export const MemberLookupModal: React.FC<MemberLookupModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    actionLabel = "Add",
    actionIcon: Icon = Plus
}) => {
    const { lookupMember } = useComptroller();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UnifiedMemberProfile[]>([]);

    if (!isOpen) return null;

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (q.length > 2) {
            setResults(lookupMember(q));
        } else {
            setResults([]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50 rounded-t-xl">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Find member by name or ID (e.g., 'Smith' or 'N12345678')..."
                        value={query}
                        onChange={handleSearch}
                        className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 font-medium"
                    />
                    <button onClick={onClose} className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-200 rounded">Esc</button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {query.length > 2 && results.length === 0 && (
                        <div className="p-8 text-center text-gray-400">No members found.</div>
                    )}

                    {results.map(member => (
                        <div key={member.nysEmplid} className="p-3 hover:bg-blue-50 rounded-lg flex items-center justify-between group transition-colors cursor-default">
                            <div>
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                    {member.name}
                                    {member.in518 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><UserCheck size={10} /> Paying</span>}
                                </div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">
                                    ID: {member.nysEmplid} | Agency: {member.agencyCode}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    onSelect(member);
                                    onClose();
                                }}
                                className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded shadow-sm transition-all flex items-center gap-1"
                            >
                                <Icon size={12} /> {actionLabel}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
