import React, { useRef } from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';

interface ReportViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string; // Plain text content
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({ isOpen, onClose, title, content }) => {
    const printRef = useRef<HTMLPreElement>(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: monospace; font-size: 12px; padding: 20px; white-space: pre-wrap; }
                    </style>
                </head>
                <body>
                    <pre>${content}</pre>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-2 text-gray-800 font-bold">
                        <FileText size={20} className="text-blue-600" />
                        {title}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-semibold transition-colors uppercase"
                        >
                            <Printer size={14} /> Print / Save PDF
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold transition-colors uppercase"
                        >
                            <Download size={14} /> Save Text
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-red-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-white p-6">
                    <pre ref={printRef} className="font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {content}
                    </pre>
                </div>
            </div>
        </div>
    );
};
