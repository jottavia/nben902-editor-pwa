import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ComptrollerData, UnifiedMemberProfile } from '../types/comptroller';
import { parseNPAY528, parseNBEN530, parseGenericComptroller, parseNPAY518 } from '../utils/comptrollerParsers';
import * as XLSX from 'xlsx';

interface ComptrollerContextType {
    data: ComptrollerData | null;
    loading: boolean;
    processFiles: (files: File[]) => Promise<void>;
    clearData: () => void;
    lookupMember: (query: string) => UnifiedMemberProfile[];
    generateMasterExcel: () => void;
    getNonPayingMembers: () => UnifiedMemberProfile[];
    generateChangeReport: () => string | null;
}

const ComptrollerContext = createContext<ComptrollerContextType | undefined>(undefined);

export const ComptrollerProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<ComptrollerData | null>(null);
    const [loading, setLoading] = useState(false);

    const processFiles = async (files: File[]) => {
        setLoading(true);
        try {
            const newData: ComptrollerData = {
                npay528: [],
                nben530: [],
                nben753: [],
                npay772: [],
                npay518: [],
                npay518Ids: new Set(),
                allMembersMap: new Map()
            };

            for (const file of files) {
                const text = await file.text();
                const name = file.name.toLowerCase();

                if (name.includes('528')) {
                    newData.npay528 = parseNPAY528(text);
                } else if (name.includes('530')) {
                    newData.nben530 = parseNBEN530(text);
                } else if (name.includes('753') && !name.includes('.docx')) {
                    newData.nben753 = parseGenericComptroller(text, file.name);
                } else if (name.includes('772') && !name.includes('.docx')) {
                    newData.npay772 = parseGenericComptroller(text, file.name);
                } else if (name.includes('518') && !name.includes('.docx')) {
                    // NEW: Parse full details
                    const records = parseNPAY518(text);
                    newData.npay518 = [...newData.npay518, ...records];
                    records.forEach(r => newData.npay518Ids.add(r.nysEmplid));
                    newData.raw518 = text;
                }
            }

            // Build Unified Map
            const map = newData.allMembersMap;
            const nameToIdMap = new Map<string, string>(); // Helper for SSN linking

            // 1. Index 528 (The Core)
            newData.npay528.forEach(record => {
                const profile: UnifiedMemberProfile = {
                    nysEmplid: record.nysEmplid,
                    name: record.name,
                    agencyCode: record.agencyCode,
                    in528: true,
                    in518: false,
                    in753: false,
                    in772: false,
                    in530: false,
                    data528: record
                };
                map.set(record.nysEmplid, profile);
                nameToIdMap.set(record.name.trim().toUpperCase(), record.nysEmplid);
            });

            // 2. Index others (Merge or Create)
            const upsert = (id: string, name: string, agency: string, updates: Partial<UnifiedMemberProfile>) => {
                const existing = map.get(id);
                if (existing) {
                    Object.assign(existing, updates);
                } else {
                    map.set(id, {
                        nysEmplid: id,
                        name: name,
                        agencyCode: agency,
                        in528: false,
                        in518: false,
                        in753: false,
                        in772: false,
                        in530: false,
                        ...updates
                    });
                }
            };

            newData.nben753.forEach(r => upsert(r.nysEmplid, r.name, r.agencyCode, { in753: true }));
            newData.npay772.forEach(r => upsert(r.nysEmplid, r.name, r.agencyCode, { in772: true }));
            newData.nben530.forEach(() => {
                // 530 linking deferred
            });

            // Link 518 Data
            newData.npay518.forEach(r => {
                let id = r.nysEmplid;

                // Helper: If ID is numeric (SSN style) or not found, try to resolve via Name Map from 528
                // This fixes PAC lines using SSN but belonging to N-ID members
                if (!id.startsWith('N')) {
                    const mappedId = nameToIdMap.get(r.name.trim().toUpperCase());
                    if (mappedId) {
                        id = mappedId;
                    }
                }

                upsert(id, r.name, r.agencyCode, { in518: true });

                const profile = map.get(id)!;
                if (!profile.data518) profile.data518 = [];
                profile.data518.push(r);
            });

            setData(newData);
        } catch (error) {
            console.error("Error parsing files:", error);
            alert("Error parsing files. See console.");
        } finally {
            setLoading(false);
        }
    };

    const clearData = () => setData(null);

    const lookupMember = (query: string): UnifiedMemberProfile[] => {
        if (!data) return [];
        const q = query.toLowerCase();
        return Array.from(data.allMembersMap.values()).filter(p =>
            p.name.toLowerCase().includes(q) || p.nysEmplid.includes(q)
        );
    };

    const getNonPayingMembers = (): UnifiedMemberProfile[] => {
        if (!data) return [];
        return Array.from(data.allMembersMap.values()).filter(p => {
            const isCandidate = p.in753 || p.in772;
            const isPayer = p.in518;
            return isCandidate && !isPayer;
        });
    };

    const generateMasterExcel = () => {
        if (!data || data.npay528.length === 0) {
            alert("No 528 Data loaded to export.");
            return;
        }

        const headers = [
            "Name", "Address1", "City", "State", "Zip", "NYS Emplid",
            "Title Code Description", "Title Code", "Annual Salary",
            "Total Gross", "Agency Code", "Work Location"
        ];

        const rows = data.npay528.map(r => [
            r.name,
            r.address1,
            r.city,
            r.state,
            r.zip,
            r.nysEmplid,
            r.titleCodeDesc,
            r.titleCode,
            parseFloat(r.annualSalary) || 0,
            parseFloat(r.totalGross) || 0,
            r.agencyCode,
            r.workLocation
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wscols = headers.map(h => ({ wch: h.length + 5 }));
        wscols[0] = { wch: 30 };
        wscols[1] = { wch: 30 };
        wscols[6] = { wch: 30 };
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master Data");
        XLSX.writeFile(wb, "Employee_Database_Master.xlsx");
    };

    const generateChangeReport = (): string | null => {
        if (!data || data.nben530.length === 0) {
            alert("No Change Report (530) data loaded.");
            return null;
        }

        const lines = [
            "NBEN530 CHANGE REPORT",
            `Date: ${new Date().toLocaleString()}`,
            `Total Entries: ${data.nben530.length}`,
            "-".repeat(80),
            sprintf("%-50s | %s", "Name", "Reason"),
            "-".repeat(80)
        ];

        data.nben530.forEach(r => {
            lines.push(sprintf("%-50s | %s", r.name, r.reasonDesc));
        });

        return lines.join("\n");
    };

    // Helper for printf style padding
    const sprintf = (fmt: string, ...args: any[]) => {
        let i = 0;
        return fmt.replace(/%(-?)([0-9]*)s/g, (_match, sign, widthStr) => {
            const arg = String(args[i++] || "");
            const width = parseInt(widthStr, 10) || 0;
            if (sign === '-') {
                return arg.padEnd(width);
            } else if (width > 0) {
                return arg.padStart(width);
            }
            return arg;
        });
    };

    return (
        <ComptrollerContext.Provider value={{
            data,
            loading,
            processFiles,
            clearData,
            lookupMember,
            generateMasterExcel,
            getNonPayingMembers,
            generateChangeReport
        }}>
            {children}
        </ComptrollerContext.Provider>
    );
};

export const useComptroller = () => {
    const context = useContext(ComptrollerContext);
    if (context === undefined) {
        throw new Error('useComptroller must be used within a ComptrollerProvider');
    }
    return context;
};
