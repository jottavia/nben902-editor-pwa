import React, { useState, useRef } from 'react';
import { EditableTable } from './components/EditableTable';

import { parseNBEN902, generateNBEN902Content, type NBEN902Record } from './utils/nb902';
import { Plus, Save, FileUp, Settings, Send, FolderInput, UserPlus, Search as SearchIcon, FileText, ChevronDown, X, Eraser, FileMinus } from 'lucide-react';
import { usePersistentState } from './hooks/usePersistentState';
import { SettingsModal } from './components/SettingsModal';
import { MemberLookupModal } from './components/MemberLookupModal';
import { TransmitModal } from './components/TransmitModal';

import type { UnifiedMemberProfile } from './types/comptroller';
import { useComptroller } from './contexts/ComptrollerContext';
import { ReportViewerModal } from './components/ReportViewerModal';

import { MemberInfoModal } from './components/MemberInfoModal';
import { ReconciliationModal } from './components/ReconciliationModal';
import { type AppSettings, DEFAULT_SETTINGS } from './types/settings';

function App() {
  const [data, setData] = useState<NBEN902Record[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<NBEN902Record[]>([]); // Track deleted items
  const [reconciliationReasons, setReconciliationReasons] = useState<Record<string, string>>({});

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [includeReconciliation, setIncludeReconciliation] = useState(true); // Default checked
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const prior902InputRef = useRef<HTMLInputElement>(null);

  const [isMemberLookupOpen, setIsMemberLookupOpen] = useState(false);
  const [lookupMode, setLookupMode] = useState<'add' | 'info'>('add');
  const [selectedInfoMember, setSelectedInfoMember] = useState<UnifiedMemberProfile | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [isTransmitModalOpen, setIsTransmitModalOpen] = useState(false);

  // Reports Menu State
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
  const [reportModalState, setReportModalState] = useState<{ isOpen: boolean; title: string; content: string }>({ isOpen: false, title: '', content: '' });

  // Persistent Settings
  const [settings, setSettings] = usePersistentState<AppSettings>('nben902-settings', DEFAULT_SETTINGS);

  // Context Actions
  const { data: comptrollerData, loading: comptrollerLoading, processFiles, getNonPayingMembers, generateMasterExcel, generateChangeReport } = useComptroller();

  const handleShowChangeReport = () => {
    const content = generateChangeReport();
    if (content) {
      setReportModalState({
        isOpen: true,
        title: "NBEN530 Change Report",
        content: content
      });
      setIsReportsMenuOpen(false);
    }
  };

  const handleLookupSelect = (memberOrMembers: UnifiedMemberProfile | UnifiedMemberProfile[]) => {
    if (lookupMode === 'add') {
      const members = Array.isArray(memberOrMembers) ? memberOrMembers : [memberOrMembers];
      handleAddToEditor(members);
    } else {
      const member = Array.isArray(memberOrMembers) ? memberOrMembers[0] : memberOrMembers;
      setSelectedInfoMember(member);
      setIsInfoModalOpen(true);
    }
  };

  const handleAddToEditor = (members: UnifiedMemberProfile[]) => {
    let newRecords: NBEN902Record[] = [];
    let existingCount = 0;

    // We can use the state 'data' directly since it's the current snapshot
    const existingIds = new Set(data.map(r => r.employeeId));

    members.forEach(member => {
      // Check if member exists in the dataset.
      if (existingIds.has(member.nysEmplid)) {
        existingCount++;
      } else {
        newRecords.push(convertToRecord(member, {
          code: settings.duplicateDeductionCode,
          amount: settings.duplicateDeductionAmount
        }));
      }
    });

    if (newRecords.length > 0) {
      setData(prev => [...prev, ...newRecords]);
    }

    if (members.length === 1 && existingCount === 1) {
      alert(`${members[0].name} is already in the editor.`);
    } else if (members.length > 1) {
      const added = newRecords.length;
      if (existingCount > 0) {
          alert(`Added ${added} members. ${existingCount} were already in the editor.`);
      }
    }
  };

  // File Handlers
  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const newRecords = parseNBEN902(text, settings);
    if (data.length > 0) setData(prev => [...prev, ...newRecords]);
    else setData(newRecords);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilterPrior902 = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const priorRecords = parseNBEN902(text, settings); // Use settings for parsing

      // Create a set of Employee IDs from the prior file for O(1) lookup
      const priorIds = new Set(priorRecords.map(r => r.employeeId));

      let filteredCount = 0;
      let newDeletedRecords: NBEN902Record[] = [];
      let newReasons: Record<string, string> = {};

      // Filter current data
      const newData = data.filter(record => {
        if (priorIds.has(record.employeeId)) {
          // This record is in the prior file, so we move it to deleted/reconciled
          filteredCount++;
          newDeletedRecords.push(record);
          newReasons[record.id] = "Already entered";
          return false; // Remove from main data
        }
        return true; // Keep
      });

      if (filteredCount > 0) {
        setData(newData);
        setDeletedRecords(prev => [...prev, ...newDeletedRecords]);
        setReconciliationReasons(prev => ({ ...prev, ...newReasons }));
        alert(`Successfully filtered ${filteredCount} records that were present in the prior 902 file.\nThey have been moved to the Reconciliation Report as "Already entered".`);
      } else {
        alert("No matching members found in the selected prior 902 file.");
      }

    } catch (error) {
      console.error("Error parsing prior file:", error);
      alert("Error reading or parsing the file. Please ensure it is a valid NBEN902 input file.");
    } finally {
      // Reset input
      event.target.value = '';
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleImportNonPayers = () => {
    if (!comptrollerData) {
      alert("Please LOAD Comptroller Data first.");
      return;
    }
    const candidates = getNonPayingMembers();
    if (candidates.length === 0) {
      alert("No eligible non-paying members found (753/772 matches minus 518 duplicates).");
      return;
    }

    let addedCount = 0;
    const newRows: NBEN902Record[] = [];
    const existingIds = new Set(data.map(r => r.employeeId));

    candidates.forEach(m => {
      if (!existingIds.has(m.nysEmplid)) {
        newRows.push(convertToRecord(m));
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setData(prev => [...prev, ...newRows]);
      alert(`Successfully imported ${addedCount} non-paying members.`);
    } else {
      alert("All candidates are already in the editor.");
    }
  };

  const convertToRecord = (member: UnifiedMemberProfile, defaults?: { code: string, amount: string }): NBEN902Record => {
    return {
      id: crypto.randomUUID(),
      agencyCode: member.agencyCode || settings.agencyCode,
      name: member.name,
      employeeId: member.nysEmplid,
      deductionCode: defaults?.code || settings.loadDefaultDeductionCode || "456",
      effectiveDate: "",
      deductionEndDate: "",
      deductionAmount: defaults?.amount || settings.loadDefaultDeductionAmount || "2000"
    };
  };





  const handleSaveFile = () => {
    // Check for missing Effective Dates
    const missingDates = data.filter(record => !record.effectiveDate);
    if (missingDates.length > 0) {
      const confirmSave = window.confirm(
        `Warning: ${missingDates.length} record(s) have a missing Effective Date.\n\nDo you want to proceed with saving?`
      );
      if (!confirmSave) return;
    }

    const content = generateNBEN902Content(data);
    downloadFile(content, "paysrp.nben902.sccea.input");
    if (includeReconciliation && deletedRecords.length > 0) {
      setIsReconciliationModalOpen(true);
    }
  };

  const handleSaveReconciliationReport = (recordsWithReasons: { record: NBEN902Record; reason: string }[]) => {
    const reportContent = generateReconciliationReportWithReasons(recordsWithReasons);
    downloadFile(reportContent, "reconciliation_report.txt");
  };

  const handleCloseFile = () => {
    if (data.length > 0) {
      if (!confirm("Are you sure you want to close the file? Any unsaved changes will be lost.")) {
        return;
      }
    }
    setData([]);
    setDeletedRecords([]);
    setReconciliationReasons({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const generateReconciliationReportWithReasons = (items: { record: NBEN902Record; reason: string }[]): string => {
    let report = `RECONCILIATION REPORT - DELETED / EXCLUDED ENTRIES\n`;
    report += `Date: ${new Date().toLocaleString()}\n`;
    report += `Total Items: ${items.length}\n\n`;
    report += `ID         | Name                                               | Agency | Reason\n`;
    report += `-`.repeat(100) + `\n`;
    items.forEach(({ record, reason }) => {
      report += `${record.employeeId.padEnd(10)} | ${record.name.padEnd(50)} | ${record.agencyCode.padEnd(6)} | ${reason}\n`;
    });
    return report;
  };

  // Custom update handler to intercept deletions
  const handleDataUpdate = (newData: NBEN902Record[]) => {
    if (newData.length < data.length) {
      const newIds = new Set(newData.map(r => r.id));
      const deleted = data.filter(r => !newIds.has(r.id));
      setDeletedRecords(prev => [...prev, ...deleted]);
    }
    setData(newData);
  };

  const handleAddRow = () => {
    const newRecord: NBEN902Record = {
      id: crypto.randomUUID(),
      agencyCode: settings.agencyCode,
      name: "",
      employeeId: "N",
      deductionCode: settings.newRowDeductionCode,
      effectiveDate: "",
      deductionEndDate: "",
      deductionAmount: settings.newRowDeductionAmount
    };
    setData(prev => [...prev, newRecord]);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-app text-zinc-100 overflow-hidden font-sans" >
      {/* Command Bar */}
      <header className="h-14 border-b border-gray-800 bg-zinc-900 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">

        {/* Left: Branding & Core File Ops */}
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-sm font-bold tracking-wider text-green-500 select-none leading-none">NBEN902</h1>
            <span className="text-[10px] text-zinc-500 font-mono">v2.8.6 COMPTROLLER</span>
          </div>

          <div className="h-8 w-px bg-zinc-800"></div>

          {/* Core Editor Actions */}
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleOpenFile} className="hidden" accept=".input,.txt,.902" />
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-24 h-10 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <FileUp size={16} />
              <span className="text-[9px] mt-0.5 font-medium tracking-tight">OPEN NBEN902</span>
            </button>

            <button onClick={handleSaveFile} className="flex flex-col items-center justify-center w-12 h-10 rounded hover:bg-zinc-800 text-green-500 hover:text-green-400 transition-colors">
              <Save size={16} />
              <span className="text-[9px] mt-0.5 font-medium">SAVE</span>
            </button>

            <button onClick={handleCloseFile} className="flex flex-col items-center justify-center w-12 h-10 rounded hover:bg-zinc-800 text-red-500 hover:text-red-400 transition-colors" title="Close File / Clear Editor">
              <X size={16} />
              <span className="text-[9px] mt-0.5 font-medium">CLOSE</span>
            </button>
          </div>
        </div>

        {/* Center: Comptroller Data Hub Actions */}
        <div className="flex items-center gap-2 bg-zinc-800/50 p-1 rounded-lg border border-zinc-700/50">

          {/* 1. LOAD DATA */}
          <div className="relative group">
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFolderSelect}
              className="hidden"
              multiple
              // @ts-ignore
              webkitdirectory="" directory=""
            />
            <button
              onClick={() => folderInputRef.current?.click()}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${comptrollerData ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
            >
              <FolderInput size={14} />
              {comptrollerLoading ? "Loading..." : (comptrollerData ? "Data Loaded" : "Load Folder")}
            </button>
            {/* Status Tooltip */}
            {comptrollerData && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl text-xs z-50 hidden group-hover:block">
                <div className="font-bold text-zinc-300 mb-1">Loaded Records:</div>
                <div className="flex justify-between"><span>528 (Master):</span> <span className="text-white">{comptrollerData.npay528.length}</span></div>
                <div className="flex justify-between"><span>518 (Payers):</span> <span className="text-white">{comptrollerData.npay518Ids.size}</span></div>
                <div className="flex justify-between"><span>753 (New):</span> <span className="text-white">{comptrollerData.nben753.length}</span></div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-zinc-700 mx-1"></div>

          {/* 2. IMPORT NON PAYERS */}
          <button
            onClick={handleImportNonPayers}
            disabled={!comptrollerData}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Import 753/772 members who are NOT in 518"
          >
            <UserPlus size={14} />
            <span>Import Non-Payers</span>
          </button>

          {/* 3. FILTER PRIOR 902 */}
          <input
            type="file"
            ref={prior902InputRef}
            onChange={handleFilterPrior902}
            className="hidden"
            accept=".input,.txt,.902"
          />
          <button
            onClick={() => prior902InputRef.current?.click()}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Filter out members from a prior 902 file (Marks as 'Already entered')"
          >
            <FileMinus size={14} />
            <span>Filter Prior 902</span>
          </button>

          {/* 3. LOOKUP */}
          <button
            onClick={() => {
              setLookupMode('add');
              setIsMemberLookupOpen(true);
            }}
            disabled={!comptrollerData}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SearchIcon size={14} />
            <span>Add existing member</span>
          </button>

          {/* 4. REPORTS */}
          <div className="relative">
            <button
              onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
              disabled={!comptrollerData}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText size={14} />
              <span>Reports</span>
              <ChevronDown size={12} />
            </button>

            {isReportsMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsReportsMenuOpen(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-50 flex flex-col">
                  <button
                    onClick={() => { generateMasterExcel(); setIsReportsMenuOpen(false); }}
                    className="px-4 py-2 text-left text-sm text-purple-400 hover:bg-zinc-700 hover:text-purple-300"
                  >
                    Master Spreadsheet (528 .xlsx)
                  </button>
                  <button
                    onClick={handleShowChangeReport}
                    className="px-4 py-2 text-left text-sm text-purple-400 hover:bg-zinc-700 hover:text-purple-300"
                  >
                    Change Report View (530)
                  </button>
                  <div className="h-px bg-zinc-700 my-1"></div>
                  <button
                    onClick={() => {
                      setLookupMode('info');
                      setIsMemberLookupOpen(true);
                      setIsReportsMenuOpen(false);
                    }}
                    className="px-4 py-2 text-left text-sm text-purple-400 hover:bg-zinc-700 hover:text-purple-300 flex items-center justify-between"
                  >
                    <span>Member Info</span>
                    <SearchIcon size={12} className="opacity-50" />
                  </button>
                </div>
              </>
            )}
          </div>

        </div>


        {/* Right: Settings & Utils */}
        <div className="flex items-center gap-2">
          <button onClick={handleAddRow} className="btn-command btn-command-secondary text-blue-400">
            <Plus size={14} /> <span>Add Row</span>
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="btn-command btn-command-secondary">
            <Settings size={14} />
          </button>
          <div className="w-px h-6 bg-zinc-800 mx-2"></div>
          <button
            onClick={() => setIsTransmitModalOpen(true)}
            className="btn-command btn-command-primary text-white shadow-lg shadow-blue-500/10"
          >
            <Send size={14} /> <span>Transmit</span>
          </button>
        </div>

      </header>

      {/* Main Table Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {data.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 pointer-events-none opacity-50">
            <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 flex flex-col items-center">
              <p className="text-lg font-medium text-zinc-400">Ready to Edit</p>
              <p className="text-sm mt-2">1. Load Data Folder &rarr; 2. Import Non-Payers</p>
            </div>
          </div>
        )}
        <EditableTable
          data={data}
          onUpdate={handleDataUpdate}
          duplicateDefaults={{
            code: settings.duplicateDeductionCode,
            amount: settings.duplicateDeductionAmount
          }}
        />
      </main>

      {/* Status Bar */}
      <footer className="h-7 bg-bg-panel border-t border-border flex items-center justify-between px-3 text-[10px] font-mono text-zinc-500 select-none shrink-0">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition-colors">
            <input
              type="checkbox"
              checked={includeReconciliation}
              onChange={(e) => setIncludeReconciliation(e.target.checked)}
              className="rounded bg-zinc-700 border-zinc-600 text-green-500 w-3 h-3 focus:ring-0"
            />
            Include Reconciliation Report on Save
          </label>
          <div className="h-3 w-px bg-zinc-700"></div>
          <span>ROWS: <span className="text-zinc-300">{data.length}</span></span>
          <span>AGENCY: <span className="text-blue-400">{settings.agencyCode}</span></span>
          {deletedRecords.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsReconciliationModalOpen(true)}
                className="text-red-400 hover:text-red-300 hover:underline cursor-pointer flex items-center gap-1 transition-colors bg-transparent border-0 p-0 font-mono text-[10px]"
                title="Click to manage deleted entries"
              >
                DELETED: {deletedRecords.length}
              </button>
              <button
                onClick={() => {
                  if (confirm("Clear reconciliation list? This cannot be undone.")) {
                    setDeletedRecords([]);
                  }
                }}
                className="text-zinc-600 hover:text-red-400 transition-colors"
                title="Clear reconciliation list (Zero out)"
              >
                <Eraser size={12} />
              </button>
            </div>
          )}
        </div>
        <div>
          <span>NBEN902-OSC-COMPLIANT</span>
        </div>
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(newSettings) => setSettings(newSettings)}
      />

      <MemberLookupModal
        isOpen={isMemberLookupOpen}
        onClose={() => setIsMemberLookupOpen(false)}
        onSelect={handleLookupSelect}
        mode={lookupMode}
      />

      <ReconciliationModal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        deletedRecords={deletedRecords}
        onSaveReport={handleSaveReconciliationReport}
        onClear={() => {
          setDeletedRecords([]);
          setReconciliationReasons({});
        }}
        onRemoveRecord={(id: string) => {
          setDeletedRecords(prev => prev.filter(r => r.id !== id));
          // Optional: clean up reason
        }}
        prefilledReasons={reconciliationReasons}
      />

      <TransmitModal
        isOpen={isTransmitModalOpen}
        onClose={() => setIsTransmitModalOpen(false)}
        settings={settings}
      />

      <ReportViewerModal
        isOpen={reportModalState.isOpen}
        onClose={() => setReportModalState(prev => ({ ...prev, isOpen: false }))}
        title={reportModalState.title}
        content={reportModalState.content}
      />
      <MemberInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        member={selectedInfoMember}
      />
    </div>
  )
}

export default App
