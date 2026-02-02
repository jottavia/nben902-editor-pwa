
import React, { useRef } from 'react';
import { X, Upload, Download, Save } from 'lucide-react';
import { type AppSettings, DEFAULT_SETTINGS } from '../types/settings';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (newSettings: AppSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tempSettings, setTempSettings] = React.useState<AppSettings>(settings);

    // Sync state when modal opens
    React.useEffect(() => {
        if (isOpen) setTempSettings(settings);
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleChange = (field: keyof AppSettings, value: string) => {
        setTempSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);
            // Basic validation: check if keys exist
            const isValid = Object.keys(DEFAULT_SETTINGS).every(k => k in json);
            if (isValid) {
                setTempSettings(json as AppSettings);
                alert("Configuration loaded successfully!");
            } else {
                alert("Invalid configuration file format.");
            }
        } catch (err) {
            alert("Failed to parse configuration file.");
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(tempSettings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nben_config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSave = () => {
        onSave(tempSettings);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-bg-panel border border-border/50 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="text-xl font-semibold text-zinc-100">Application Settings</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

                    {/* General */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">General Defaults</h3>

                        <div className="space-y-1">
                            <label className="text-xs text-zinc-400">Default Agency Code</label>
                            <input
                                type="text"
                                value={tempSettings.agencyCode}
                                onChange={e => handleChange('agencyCode', e.target.value)}
                                className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500 hover:border-blue-500/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* File Load Defaults */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">File Load Defaults</h3>
                        <p className="text-xs text-zinc-500 -mt-3">Applied when opening files with empty fields.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Deduction Code</label>
                                <input
                                    type="text"
                                    value={tempSettings.loadDefaultDeductionCode}
                                    onChange={e => handleChange('loadDefaultDeductionCode', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Deduction Amount</label>
                                <input
                                    type="text"
                                    value={tempSettings.loadDefaultDeductionAmount}
                                    onChange={e => handleChange('loadDefaultDeductionAmount', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* New Record Defaults */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">New Record Defaults</h3>
                        <p className="text-xs text-zinc-500 -mt-3">Applied when adding a new row manually.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Deduction Code</label>
                                <input
                                    type="text"
                                    value={tempSettings.newRowDeductionCode}
                                    onChange={e => handleChange('newRowDeductionCode', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Deduction Amount</label>
                                <input
                                    type="text"
                                    value={tempSettings.newRowDeductionAmount}
                                    onChange={e => handleChange('newRowDeductionAmount', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Duplicate / Import Member Defaults */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Duplicate / Import Member Defaults</h3>
                        <p className="text-xs text-zinc-500 -mt-3">Applied when duplicating a record or importing a new member.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Deduction Code</label>
                                <input
                                    type="text"
                                    value={tempSettings.duplicateDeductionCode}
                                    onChange={e => handleChange('duplicateDeductionCode', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Deduction Amount</label>
                                <input
                                    type="text"
                                    value={tempSettings.duplicateDeductionAmount}
                                    onChange={e => handleChange('duplicateDeductionAmount', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Transmission Settings */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Transmission Configuration</h3>
                        <p className="text-xs text-zinc-500 -mt-3">Configure connection to Local Agent and Remote SFTP.</p>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Local Agent URL</label>
                                <input
                                    type="text"
                                    value={tempSettings.localServerUrl}
                                    onChange={e => handleChange('localServerUrl', e.target.value)}
                                    placeholder="http://localhost:9020"
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-400">SFTP Host</label>
                                    <input
                                        type="text"
                                        value={tempSettings.sftpHost}
                                        onChange={e => handleChange('sftpHost', e.target.value)}
                                        className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-400">SFTP Port</label>
                                    <input
                                        type="number"
                                        value={tempSettings.sftpPort}
                                        // @ts-ignore
                                        onChange={e => handleChange('sftpPort', parseInt(e.target.value) || 22)}
                                        className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">SFTP User</label>
                                <input
                                    type="text"
                                    value={tempSettings.sftpUser}
                                    onChange={e => handleChange('sftpUser', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Bind Source IP (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 192.168.1.100 (Leave empty for default)"
                                    value={tempSettings.sftpSourceIp || ''}
                                    onChange={e => handleChange('sftpSourceIp', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500 font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-400">Remote Folder Path</label>
                                <input
                                    type="text"
                                    value={tempSettings.sftpRemotePath}
                                    onChange={e => handleChange('sftpRemotePath', e.target.value)}
                                    className="w-full bg-bg-app border border-border rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer (Actions) */}
                <div className="p-4 border-t border-border/50 bg-bg-app/50 flex items-center justify-between">
                    <div className="flex gap-2">
                        <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors" title="Import Config">
                            <Upload size={16} />
                            <span className="hidden sm:inline">Import</span>
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors" title="Export Config">
                            <Download size={16} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 hover:bg-white/5 text-zinc-400 hover:text-white rounded-lg text-sm transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all">
                            <Save size={16} />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}
