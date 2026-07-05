import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertCircle, FileKey, Terminal } from 'lucide-react';
import { type AppSettings } from '../types/settings';

interface TransmitModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSuccess?: () => void;
}

type TransmitStatus = 'idle' | 'sending' | 'testing' | 'tested' | 'success' | 'error';

interface TestStage {
    stage: string;
    ok: boolean;
    detail: string;
}

export function TransmitModal({ isOpen, onClose, settings, onSuccess }: TransmitModalProps) {
    const [password, setPassword] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [status, setStatus] = useState<TransmitStatus>('idle');
    const [message, setMessage] = useState('');
    const [debugLog, setDebugLog] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state on open
    React.useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setMessage('');
            setDebugLog('');
            setPassword('');
            setSelectedFile(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const normalizeBaseUrl = (url: string) => {
        let baseUrl = url.trim();
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        if (baseUrl.endsWith('/upload')) baseUrl = baseUrl.slice(0, -7);
        return baseUrl;
    };

    const handleTestConnection = async () => {
        if (!settings.localServerUrl || !settings.sftpHost) {
            setStatus('error');
            setMessage('Missing SFTP configuration in Settings.');
            return;
        }

        setStatus('testing');
        setMessage('Running connection diagnostics...');
        setDebugLog('');

        try {
            const response = await fetch(`${normalizeBaseUrl(settings.localServerUrl)}/test-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host: settings.sftpHost,
                    port: settings.sftpPort || 22,
                    username: settings.sftpUser || '',
                    source_ip: settings.sftpSourceIp || '',
                    password: password,
                    remote_path: settings.sftpRemotePath || '.'
                })
            });

            const data = await response.json();
            const stages: TestStage[] = data.stages || [];
            setDebugLog(stages.map(s => `${s.ok ? '[PASS]' : '[FAIL]'} ${s.stage}: ${s.detail}`).join('\n'));

            if (data.success) {
                setStatus('tested');
                setMessage(password
                    ? 'All checks passed. Ready to transmit.'
                    : 'Network checks passed. Enter your password to also test login.');
            } else {
                const failed = stages.find(s => !s.ok);
                setStatus('error');
                setMessage(failed ? `Failed at ${failed.stage} stage. See log below.` : 'Connection test failed.');
            }
        } catch (error: any) {
            setStatus('error');
            setMessage(`Connection Error: Could not reach Local Agent at ${settings.localServerUrl}. Is it running?`);
            setDebugLog(String(error?.message || error));
        }
    };

    const handleTransmit = async () => {
        if (!selectedFile) {
            setStatus('error');
            setMessage('Please select a file to transmit.');
            return;
        }
        if (!password) {
            setStatus('error');
            setMessage('Password is required.');
            return;
        }
        if (!settings.localServerUrl || !settings.sftpHost || !settings.sftpUser) {
            setStatus('error');
            setMessage('Missing SFTP configuration in Settings.');
            return;
        }

        setStatus('sending');
        setMessage('Establishing secure connection...');
        setDebugLog('');

        try {
            // Read file content
            console.log("Reading file:", selectedFile.name, "Size:", selectedFile.size);
            const fileContent = await selectedFile.text();
            console.log("File content length:", fileContent.length);

            // Prepare payload
            const payload = {
                host: settings.sftpHost,
                port: settings.sftpPort || 22,
                username: settings.sftpUser,
                source_ip: settings.sftpSourceIp || '',
                password: password,
                remote_path: settings.sftpRemotePath || '.',
                filename: selectedFile.name,
                file_content: fileContent
            };
            console.log("Payload filename:", payload.filename, "content length:", payload.file_content.length);
            // Send to Local Agent
            const response = await fetch(`${normalizeBaseUrl(settings.localServerUrl)}/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const textDetail = await response.text();
                throw new Error(`Server returned non-JSON response (${response.status} ${response.statusText}):\n${textDetail.substring(0, 150)}...`);
            }

            const rawText = await response.text();
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                throw new Error(`Invalid JSON received (${response.status}): ${rawText.substring(0, 150)}...`);
            }

            // Capture logs if present
            if (data.debug_log) {
                setDebugLog(data.debug_log);
            }

            if (response.ok && data.success) {
                setStatus('success');
                setMessage(data.message || 'File transmitted successfully.');
                if (onSuccess) onSuccess();
            } else {
                setStatus('error');
                setMessage(data.message || 'Transmission failed. Agent returned an error.');
            }

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            
            // Check if it's our custom error or a standard fetch connection error
            if (error.message && error.message.includes("Server returned non-JSON response")) {
                setMessage(`Local Agent responded with an unexpected format. Please check the 'localServerUrl' setting or ensure the agent isn't blocked by a firewall.`);
            } else {
                setMessage(`Connection Error: Could not reach Local Agent at ${settings.localServerUrl}. Is it running?`);
            }
            
            setDebugLog(prev => prev + `\nGUI Error: ${error.message || String(error)}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-zinc-800 border-b border-zinc-700 shrink-0">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload size={18} className="text-blue-400" />
                        Secure Transmit
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto">

                    {/* Status Info */}
                    <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-3">
                        <div className="flex justify-between text-xs text-blue-200 font-mono mb-1">
                            <span>DESTINATION:</span>
                            <span className="text-white">{settings.sftpHost}:{settings.sftpPort || 22}</span>
                        </div>
                        <div className="flex justify-between text-xs text-blue-200 font-mono">
                            <span>USER:</span>
                            <span className="text-white">{settings.sftpUser}</span>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">

                        {/* File Selector */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">File to Transmit</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 truncate font-mono">
                                    {selectedFile ? selectedFile.name : <span className="text-zinc-600 italic">No file selected</span>}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".input,.txt,.902"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm font-medium transition-colors"
                                >
                                    Browse...
                                </button>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">SFTP Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileKey size={14} className="text-zinc-500" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your secure password"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Feedback Area */}
                    {status !== 'idle' && (
                        <div className="space-y-2">
                            <div className={`rounded-lg p-3 text-sm flex items-start gap-3 ${status === 'error' ? 'bg-red-900/20 text-red-200 border border-red-900/50' :
                                (status === 'success' || status === 'tested') ? 'bg-green-900/20 text-green-200 border border-green-900/50' :
                                    'bg-zinc-800 text-zinc-300'
                                }`}>
                                {(status === 'sending' || status === 'testing') && <Loader2 size={18} className="animate-spin text-blue-400 shrink-0 mt-0.5" />}
                                {(status === 'success' || status === 'tested') && <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />}
                                {status === 'error' && <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />}
                                <span className="leading-5 font-medium">{message}</span>
                            </div>

                            {/* Debug Logs - ALWAYS VISIBLE */}
                            <div className="mt-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Terminal size={12} className="text-zinc-500" />
                                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Transmission Logs</span>
                                </div>
                                <div className="bg-black border border-zinc-700/50 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] text-zinc-400 whitespace-pre-wrap shadow-inner">
                                    {debugLog || <span className="text-zinc-700 italic">Logs will appear here after connection attempt...</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-zinc-800/50 border-t border-zinc-700 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={handleTestConnection}
                        disabled={status === 'sending' || status === 'testing' || status === 'success'}
                        className="mr-auto px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {status === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={status === 'sending' || status === 'testing'}
                        className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleTransmit}
                        disabled={status === 'sending' || status === 'testing' || status === 'success'}
                        className={`px-6 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 shadow-lg transition-all ${status === 'success' ? 'bg-green-600 cursor-default' :
                            (status === 'sending' || status === 'testing') ? 'bg-blue-600/50 cursor-wait' :
                                'bg-blue-600 hover:bg-blue-500 hover:translate-y-[-1px]'
                            }`}
                    >
                        {status === 'sending' ? 'Transmitting...' : (status === 'success' ? 'Sent' : 'Transmit File')}
                        {(status === 'idle' || status === 'error' || status === 'tested') && <Upload size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
