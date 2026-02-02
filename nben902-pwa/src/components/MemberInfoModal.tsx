import React from 'react';
import type { UnifiedMemberProfile } from '../types/comptroller';
import { X, Printer, Download, User } from 'lucide-react';
import { formatComptrollerCurrency, formatComptrollerPercent, getPayBasisDescription } from '../utils/comptrollerParsers';

interface MemberInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: UnifiedMemberProfile | null;
}

export const MemberInfoModal: React.FC<MemberInfoModalProps> = ({ isOpen, onClose, member }) => {
    if (!isOpen || !member) return null;

    const data528 = member.data528;
    const data518 = member.data518;

    const [showRaw, setShowRaw] = React.useState(false);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const lines = [
            `MEMBER INFORMATION REPORT`,
            `Date: ${new Date().toLocaleString()}`,
            `--------------------------------------------------`,
            `Name: ${member.name}`,
            `NYS ID: ${member.nysEmplid}`,
            `Agency: ${member.agencyCode}`,
            `--------------------------------------------------`,
            `MASTER FILE DATA (528)`,
            `Status: ${member.in528 ? "Present" : "Not components found in Master File"}`,
            ...(data528 ? [
                `Address 1: ${data528.address1}`,
                `Address 2: ${data528.address2}`,
                `City/State/Zip: ${data528.city}, ${data528.state} ${data528.zip}`,
                `Annual Salary: ${formatComptrollerCurrency(data528.annualSalary)}`,
                `Title: ${data528.titleCodeDesc} (${data528.titleCode})`,
                `Pay Basis: ${getPayBasisDescription(data528.payBasisCode)}`,
                `Gross: ${formatComptrollerCurrency(data528.totalGross)}`,
                `Part-Time %: ${formatComptrollerPercent(data528.partTimePercent)}`,
                `Bargaining Unit: ${data528.bargainUnit}`,
                `Health Code: ${data528.dedCodeHealth}`
            ] : []),
            `--------------------------------------------------`,
            `DEDUCTION DETAILS (518)`,
            `Status: ${member.in518 ? "Active Payer" : "No Deductions Found"}`,
            ...(data518 && data518.length > 0 ? [
                `--------------------------------------------------`,
                `Code | Description                    | Amount      | Arrears / Missed`,
                `-----|--------------------------------|-------------|-----------------`,
                ...data518.map(d => {
                    const missed = d.amountNotTaken && parseFloat(d.amountNotTaken) !== 0
                        ? formatComptrollerCurrency(d.amountNotTaken)
                        : "-";
                    return `${d.deductionCode.padEnd(4)} | ${d.deductionDesc.padEnd(30)} | ${formatComptrollerCurrency(d.amountTaken).padEnd(11)} | ${missed}`;
                })
            ] : []),
        ];

        const blob = new Blob([lines.join("\n")], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Memberinfo_${member.nysEmplid}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm print:bg-white print:p-0">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200 print:shadow-none print:w-full print:max-w-none print:h-auto print:rounded-none">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-zinc-50 rounded-t-xl print:bg-white print:border-b-2 print:border-black">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 text-blue-600 bg-blue-100 rounded-full flex items-center justify-center print:hidden">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{member.name}</h2>
                            <div className="text-sm text-gray-500 font-mono flex gap-3">
                                <span>ID: <span className="text-gray-900">{member.nysEmplid}</span></span>
                                <span>AGENCY: <span className="text-gray-900">{member.agencyCode}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 print:hidden">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mr-2 cursor-pointer select-none">
                            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-0" />
                            Debug Raw
                        </label>
                        <button onClick={handleDownload} className="btn-icon-text bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold uppercase flex items-center gap-2 transition-colors">
                            <Download size={16} /> Save .txt
                        </button>
                        <button onClick={handlePrint} className="btn-icon-text bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold uppercase flex items-center gap-2 transition-colors">
                            <Printer size={16} /> Print / PDF
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors ml-2">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 print:overflow-visible">

                    {/* Master Data Section */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                            Master Details (528)
                            {member.in528 ? <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold">FOUND</span> : <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold">MISSING</span>}
                        </h3>
                        {data528 ? (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                <InfoRow label="Address" value={
                                    <>
                                        {data528.address1}<br />
                                        {data528.address2 && <>{data528.address2}<br /></>}
                                        {data528.address3 && <>{data528.address3}<br /></>}
                                        {data528.city}, {data528.state} {data528.zip}
                                    </>
                                } />
                                <InfoRow label="Title" value={`${data528.titleCodeDesc} (${data528.titleCode})`} />
                                <InfoRow label="Annual Salary" value={formatComptrollerCurrency(data528.annualSalary)} />
                                <InfoRow label="Total Gross" value={formatComptrollerCurrency(data528.totalGross)} />
                                <InfoRow label="Pay Basis" value={getPayBasisDescription(data528.payBasisCode)} />
                                <InfoRow label="Part-Time %" value={formatComptrollerPercent(data528.partTimePercent)} />
                                <InfoRow label="Bargain Unit" value={data528.bargainUnit} />
                                <InfoRow label="Work Loc" value={data528.workLocation} />
                                <InfoRow label="Health Code" value={data528.dedCodeHealth} />
                            </div>
                        ) : (
                            <div className="text-gray-400 italic text-sm">No Master Record found in loaded 528 file.</div>
                        )}
                    </section>

                    {/* Deductions Section */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                            Deductions / Settings (518)
                            {member.in518 ? <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE PAYER</span> : null}
                        </h3>

                        {data518 && data518.length > 0 ? (
                            <div className="overflow-hidden rounded-lg border border-gray-200">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-2">Code</th>
                                            <th className="px-4 py-2">Description</th>
                                            <th className="px-4 py-2 text-right">Amount</th>
                                            <th className="px-4 py-2 text-right">Arrears / Missed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data518.map((d, i) => (
                                            <React.Fragment key={i}>
                                                <tr className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-2 font-mono text-zinc-600 align-top">{d.deductionCode}</td>
                                                    <td className="px-4 py-2 text-gray-800 align-top">{d.deductionDesc}</td>
                                                    <td className="px-4 py-2 text-right font-medium text-gray-900 align-top">{formatComptrollerCurrency(d.amountTaken)}</td>
                                                    <td className="px-4 py-2 text-right text-red-400 align-top">
                                                        {d.amountNotTaken && !d.amountNotTaken.includes('0000000.00') && parseFloat(d.amountNotTaken) !== 0
                                                            ? formatComptrollerCurrency(d.amountNotTaken)
                                                            : "-"}
                                                    </td>
                                                </tr>
                                                {showRaw && (
                                                    <tr>
                                                        <td colSpan={4} className="bg-zinc-50 px-4 py-1">
                                                            <div className="text-[10px] font-mono text-zinc-500 break-all border-l-2 border-blue-400 pl-2">
                                                                RAW: {d.originalLine}<br />
                                                                <span className="text-red-400">Idx Check: Code[78]: "{d.originalLine.slice(78, 81)}" | Desc[84]: "{d.originalLine.slice(84, 114)}" | Amt[114]: "{d.originalLine.slice(114, 125)}"</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-gray-400 italic text-sm">No deduction records found in loaded 518 file.</div>
                        )}
                    </section>

                </div>
            </div>

            {/* Print Styles Injection */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .fixed, .fixed * {
                        visibility: visible;
                    }
                    .fixed {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        background: white;
                        padding: 0;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

const InfoRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase font-bold text-gray-400">{label}</span>
        <span className="text-gray-800 font-medium">{value}</span>
    </div>
);
