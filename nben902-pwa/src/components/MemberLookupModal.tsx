import React, { useState, useEffect } from 'react';
import { useComptroller } from '../contexts/ComptrollerContext';
import type { UnifiedMemberProfile } from '../types/comptroller';
import { Search, UserCheck, CheckSquare, Square } from 'lucide-react';

interface MemberLookupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (members: UnifiedMemberProfile | UnifiedMemberProfile[]) => void;
    mode?: 'add' | 'info';
}

export const MemberLookupModal: React.FC<MemberLookupModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    mode = 'add'
}) => {
    const { lookupMember } = useComptroller();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UnifiedMemberProfile[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<Map<string, UnifiedMemberProfile>>(new Map());

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedMembers(new Map());
        }
        setResults([]);
    }, [isOpen]);

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

    const toggleMember = (member: UnifiedMemberProfile) => {
        if (mode === 'info') {
            onSelect(member);
            onClose();
            return;
        }

        setSelectedMembers(prev => {
            const next = new Map(prev);
            if (next.has(member.nysEmplid)) {
                next.delete(member.nysEmplid);
            } else {
                next.set(member.nysEmplid, member);
            }
            return next;
        });
    };

    const handleAddSelected = () => {
        if (selectedMembers.size > 0) {
            onSelect(Array.from(selectedMembers.values()));
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50 rounded-t-xl shrink-0">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        autoFocus
                        type="text"
                        placeholder={mode === 'add' ? "Search to select members..." : "Search member to view info..."}
                        value={query}
                        onChange={handleSearch}
                        className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 font-medium"
                    />
                    {mode === 'add' && selectedMembers.size > 0 && (
                        <button 
                            onClick={handleAddSelected}
                            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg shadow-sm"
                        >
                            Add ({selectedMembers.size})
                        </button>
                    )}
                    <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-200 rounded-lg font-medium">Esc</button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {query.length > 2 && results.length === 0 && (
                        <div className="p-8 text-center text-gray-400">No members found.</div>
                    )}

                    {results.map(member => {
                        const isSelected = selectedMembers.has(member.nysEmplid);
                        return (
                            <button 
                                key={member.nysEmplid} 
                                onClick={() => toggleMember(member)}
                                className={`w-full p-3 rounded-lg flex items-center gap-4 text-left transition-colors group mb-1 ${
                                    isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-blue-50/50 hover:ring-1 hover:ring-blue-100'
                                }`}
                            >
                                {mode === 'add' && (
                                    <div className={`shrink-0 flex items-center justify-center ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </div>
                                )}
                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                    {member.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 flex items-center gap-2 truncate">
                                        {member.name}
                                        {member.in518 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0"><UserCheck size={10}/> Paying</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                                        ID: {member.nysEmplid} | Agency: {member.agencyCode}
                                    </div>
                                </div>
                                <div className={`text-sm font-medium transition-opacity ${isSelected ? 'text-blue-600 opacity-100' : 'text-blue-600 opacity-0 group-hover:opacity-100'}`}>
                                    {mode === 'add' ? (isSelected ? 'Selected' : 'Select') : 'View \u2192'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
