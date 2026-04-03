export interface NBEN902Record {
    agencyCode: string; // 0-10 (10 chars)
    name: string; // 10-60 (50 chars)
    employeeId: string; // 60-69 (9 chars)
    deductionCode: string; // 69-75 (6 chars)
    effectiveDate: string; // 75-85 (10 chars)
    deductionEndDate: string; // 85-95 (10 chars)
    deductionAmount: string; // 95-103 (8 chars)
    id: string; // Internal unique ID for React (UUID)
}

// Strictly matches the original Python colspecs
export const COLUMN_SPECS = [
    { key: 'agencyCode', start: 0, end: 10, width: 10, label: "Agency Code" },
    { key: 'name', start: 10, end: 60, width: 50, label: "Name" },
    { key: 'employeeId', start: 60, end: 69, width: 9, label: "Employee ID" },
    { key: 'deductionCode', start: 69, end: 75, width: 6, label: "Deduction Code" },
    { key: 'effectiveDate', start: 75, end: 85, width: 10, label: "Effective Date" },
    { key: 'deductionEndDate', start: 85, end: 95, width: 10, label: "Deduction End Date" },
    { key: 'deductionAmount', start: 95, end: 103, width: 8, label: "Deduction Amount" },
] as const;

export const TOOLTIPS: Record<string, string> = {
    "Agency Code": "Agency Code for Suffolk County is 05527\nAgency Code for the Academy is 05007",
    "Deduction Code": "456 for union dues\n407 for the PAC fund",
    "Effective Date": "The Thursday after the last payday",
    "Deduction End Date": "Can be the Thursday after the last payday"
};

// Internal helper to generate UUIDs
const generateId = () => crypto.randomUUID();

// Validation Logic mirroring Python's `editable_table.py`
export const validateRecord = (record: NBEN902Record): { isValid: boolean; errors: Record<keyof NBEN902Record, string | null> } => {
    const errors: Record<keyof NBEN902Record, string | null> = {
        id: null,
        agencyCode: null,
        name: null,
        employeeId: null,
        deductionCode: null,
        effectiveDate: null,
        deductionEndDate: null,
        deductionAmount: null
    };
    let isValid = true;

    // Agency Code: bool(value) -> Not empty
    if (!record.agencyCode) {
        errors.agencyCode = "Required";
        isValid = false;
    }

    // Name: bool(value) -> Not empty
    if (!record.name) {
        errors.name = "Required";
        isValid = false;
    }

    // Employee ID: ^N\d{8}$
    if (!/^N\d{8}$/.test(record.employeeId)) {
        errors.employeeId = "Format: N + 8 digits";
        isValid = false;
    }

    // Deduction Code: bool(value) -> Not empty
    if (!record.deductionCode) {
        errors.deductionCode = "Required";
        isValid = false;
    }

    // Effective Date: "" or ^\d{2}-\d{2}-\d{4}$
    if (record.effectiveDate && !/^\d{2}-\d{2}-\d{4}$/.test(record.effectiveDate)) {
        errors.effectiveDate = "Format: MM-DD-YYYY";
        isValid = false;
    }

    // Deduction End Date: "" or ^\d{2}-\d{2}-\d{4}$
    if (record.deductionEndDate && !/^\d{2}-\d{2}-\d{4}$/.test(record.deductionEndDate)) {
        errors.deductionEndDate = "Format: MM-DD-YYYY";
        isValid = false;
    }

    // Deduction Amount: digits and > 0 (ignoring dot for validation logic, but original code used float check)
    // Python: value.replace(".", "", 1).isdigit() and float(value) > 0
    if (record.deductionAmount) {
        const amtStr = record.deductionAmount.replace(".", "");
        const isDigit = /^\d+$/.test(amtStr);
        const val = parseFloat(record.deductionAmount);
        if (!isDigit || val <= 0) {
            errors.deductionAmount = "Must be > 0";
            isValid = false;
        }
    } else {
        // Python `bool(value)` check wasn't explicitly there for amount, but `float(value)` would crash on empty.
        // But `editable_table.py` validates `value.replace...isdigit()`, empty string returns False for isdigit usually?
        // Wait: "".isdigit() is False. So Amount is Required.
        errors.deductionAmount = "Required";
        isValid = false;
    }

    return { isValid, errors };
};

import { type AppSettings } from '../types/settings';

// ... (existing imports/interfaces)



// Layout for 753/772 files based on combiner.py
// We only need the first 3 fields: ID, Name, Agency
// (Code extracted directly in loop for simplicity)

export const parseRawDataFile = (content: string, settings?: AppSettings, existingIds: Set<string> = new Set()): NBEN902Record[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    const records: NBEN902Record[] = [];

    // Configurable defaults
    const defaultDedCode = settings?.loadDefaultDeductionCode || "456";
    const defaultDedAmt = settings?.loadDefaultDeductionAmount || "2000";

    for (const line of lines) {
        // Safe extraction
        const employeeId = line.substring(0, 9).trim();
        const name = line.substring(9, 59).trim();
        const agencyCode = line.substring(59, 64).trim();

        // Skip if ID is missing or already processed (Deduplication)
        if (!employeeId || existingIds.has(employeeId)) {
            continue;
        }

        // Mark this ID as seen
        existingIds.add(employeeId);

        records.push({
            id: generateId(), // React key
            agencyCode: agencyCode.padStart(5, '0'), // Ensure padding like legacy
            name: name,
            employeeId: employeeId,
            deductionCode: defaultDedCode,
            effectiveDate: "", // Blank by default
            deductionEndDate: "", // Blank by default
            deductionAmount: defaultDedAmt
        });
    }

    return records;
};

export const parseNBEN902 = (content: string, settings?: AppSettings): NBEN902Record[] => {
    const lines = content.split(/\r?\n/).filter(line => line.length > 0);

    // Defaults if settings not provided (fallback)
    const defaultDedCode = settings?.loadDefaultDeductionCode || "456";
    const defaultDedAmt = settings?.loadDefaultDeductionAmount || "2000";

    return lines.map(line => {
        // ... (lines)

        const dedCode = line.slice(69, 75).trim();
        const dedAmt = line.slice(95, 103).trim();

        return {
            id: generateId(),
            agencyCode: line.slice(0, 10).trim(),
            name: line.slice(10, 60).trim(),
            employeeId: line.slice(60, 69).trim(),
            deductionCode: dedCode || defaultDedCode,
            effectiveDate: line.slice(75, 85).trim(),
            deductionEndDate: line.slice(85, 95).trim(),
            deductionAmount: dedAmt || defaultDedAmt,
        };
    });
};

export const generateNBEN902Content = (records: NBEN902Record[]): string => {
    return records.map(record => {
        let line = "";

        // 1. Agency Code (10) - ljust
        line += (record.agencyCode || "").padEnd(10, ' ').slice(0, 10);

        // 2. Name (50) - ljust
        line += (record.name || "").padEnd(50, ' ').slice(0, 50);

        // 3. Employee ID (9) - ljust
        line += (record.employeeId || "").padEnd(9, ' ').slice(0, 9);

        // 4. Deduction Code (6) - ljust
        line += (record.deductionCode || "").padEnd(6, ' ').slice(0, 6);

        // 5. Effective Date (10) - ljust (or space if empty)
        // Python: "if value == "": value = " " * col_widths[idx]" -> simple ljust handles this if value is empty string
        line += (record.effectiveDate || "").padEnd(10, ' ').slice(0, 10);

        // 6. Deduction End Date (10)
        line += (record.deductionEndDate || "").padEnd(10, ' ').slice(0, 10);

        // 7. Deduction Amount (8) - rjust with '0'
        // Python: formatted_value = str(value).rjust(col_widths[idx], '0')
        const amount = record.deductionAmount || "";
        // Note: Python `rjust(8, '0')` on an empty string results in "00000000" IF the value was empty? 
        // Wait, if Pandas DataFrame has NaN/None, it might behave differently.
        // In `editable_table.py`, empty string inputs are allowed.
        // If input is "", `str("").rjust(8, '0')` is "00000000".
        // Is that desired? 
        // Python code: `if idx == 6: formatted_value = str(value).rjust(col_widths[idx], '0')`
        // Yes, if value is empty, it becomes "00000000".
        line += amount.padStart(8, '0').slice(0, 8);

        return line;
    }).join('\r\n') + '\r\n'; // Add trailing newline (Windows CRLF)
};

// Helper to extract all unique Employee IDs (N + 8 digits) from a raw text file
// Used for parsing the 518 report to find existing payers
export const extractEmployeeIds = (content: string): Set<string> => {
    const ids = new Set<string>();
    // Regex for N followed by 8 digits
    const matches = content.matchAll(/N\d{8}/g);
    for (const match of matches) {
        ids.add(match[0]);
    }
    return ids;
};
