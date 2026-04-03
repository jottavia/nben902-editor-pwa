import type { NPAY528Record, NBEN530Record, GenericComptrollerRecord, NPAY518Record } from '../types/comptroller';

// 528 Parsing Logic
// Widths: [9, 50, 5, 35, 35, 35, 35, 30, 30, 2, 10, 3, 10, 7, 30, 5, 3, 10, 2, 3, 9]
// Cumulative Start Indices:
// 0: Emplid (0-9)
// 1: Name (9-59)
// 2: Agency (59-64)
// 3: Addr1 (64-99)
// ...
export const parseNPAY528 = (content: string): NPAY528Record[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 10); // Basic filter
    return lines.map(line => {
        // Helper to safe slice
        const get = (start: number, len: number) => line.slice(start, start + len).trim();

        // Agency Code Padding Logic: "05527"
        let agency = get(59, 5);
        if (agency && /^\d+$/.test(agency)) {
            agency = agency.padStart(5, '0');
        }

        return {
            nysEmplid: get(0, 9),
            name: get(9, 50),
            agencyCode: agency,
            address1: get(64, 35),
            address2: get(99, 35),
            address3: get(134, 35),
            address4: get(169, 35),
            city: get(204, 30),
            county: get(234, 30),
            state: get(264, 2),
            zip: get(266, 10),
            country: get(276, 3),
            annualSalary: get(279, 10),
            titleCode: get(289, 7),
            titleCodeDesc: get(296, 30),
            partTimePercent: get(326, 5),
            payBasisCode: get(331, 3),
            totalGross: get(334, 10),
            bargainUnit: get(344, 2),
            dedCodeHealth: get(346, 3),
            workLocation: line.slice(349).trim(),
            originalLine: line
        };
    });
};

// 530 Parsing Logic
// Based on transform_530.sh:
// Name: cut -c16-65 (Indices 15-65)
// Code: cut -c75-77 (Indices 74-77)
export const parseNBEN530 = (content: string): NBEN530Record[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 10);
    return lines.map(line => {
        const code = line.slice(74, 77).trim();
        return {
            name: line.slice(15, 65).trim(),
            reasonCode: code,
            reasonDesc: getReasonDescription(code, true),
            originalLine: line
        };
    });
};

export const getReasonDescription = (code: string, includeCode = false): string => {
    const c = code.trim();
    let desc = "";
    switch (c) {
        case "804": desc = "Social Security Number Change"; break;
        case "805": desc = "Transfer"; break;
        case "806": desc = "Leave of Absence"; break;
        case "807": desc = "Name Change"; break;
        case "808": desc = "Termination"; break;
        case "809": desc = "Deceased"; break;
        case "810": desc = "Retirement"; break;
        case "812": desc = "Return from Leave"; break;
        case "818": desc = "Workers Compensation Supplemental Leave"; break;
        case "819": desc = "On Leave"; break; // or "On Leave/LTD" depending on context
        case "920": desc = "Negotiating Unit Change"; break;
        default: desc = "Unknown Code"; break;
    }

    if (includeCode) {
        return `${c} - ${desc}`;
    }
    if (includeCode) {
        return `${c} - ${desc}`;
    }
    return desc === "Unknown Code" ? `${desc} (${c})` : desc;
};

export const getPayBasisDescription = (code: string): string => {
    const c = code.trim().toUpperCase();
    const map: Record<string, string> = {
        'ANN': 'Annual',
        'HRY': 'Hourly',
        'BIW': 'Biweekly',
        'DLY': 'Daily',
        'FEE': 'Fee Basis',
        'LUMP': 'Lump Sum'
    };
    return map[c] ? `${map[c]} (${c})` : c;
};

// Generic Parser (753/772) - Assumes standard header
export const parseGenericComptroller = (content: string, filename: string): GenericComptrollerRecord[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 10);
    return lines.map(line => {
        let agency = line.slice(59, 64).trim();
        if (agency && /^\d+$/.test(agency)) {
            agency = agency.padStart(5, '0');
        }

        return {
            nysEmplid: line.slice(0, 9).trim(),
            name: line.slice(9, 59).trim(),
            agencyCode: agency,
            fileSource: filename,
            originalLine: line
        };
    });
};

// 518 Parsing Logic
// Based on NPAY518.md
export const parseNPAY518 = (content: string): NPAY518Record[] => {
    const lines = content.split(/\r?\n/);
    const records: NPAY518Record[] = [];

    lines.forEach(line => {
        if (line.length < 10) return;
        const type = line.charAt(0);

        // We only care about Detail Records ('2')
        if (type === '2') {
            const get = (start: number, len: number) => line.slice(start, start + len).trim();
            // Positions are 1-based in spec, so 0-based index is pos-1
            records.push({
                recordType: type,
                checkDate: get(1, 8),
                name: get(9, 50),
                nysEmplid: get(59, 9),
                agencyCode: get(68, 5),
                lineItem: get(73, 5),
                deductionCode: get(78, 3),
                deductionDesc: get(84, 30),
                amountTaken: get(114, 11),
                refundAmount: get(125, 11),
                amountNotTaken: get(136, 11),
                originalLine: line
            });
        }
    });
    return records;
};

// Helper to format S8.2 signed values from 518
// Examples: "+0000005000" -> "$50.00", "00000000200" -> "$2.00" (implied), "000000.50" -> "$0.50"
export const formatComptrollerCurrency = (raw: string): string => {
    if (!raw || !raw.trim()) return "$0.00";

    let clean = raw.trim();
    let sign = 1;

    if (clean.startsWith('+')) {
        clean = clean.substring(1);
    } else if (clean.startsWith('-')) {
        sign = -1;
        clean = clean.substring(1);
    }

    let val = 0;
    if (clean.includes('.')) {
        val = parseFloat(clean);
    } else {
        // Assume implied decimal (last 2 digits) if no dot found
        // S8.2 usually implies 2 decimal places
        val = parseFloat(clean) / 100;
    }

    if (isNaN(val)) return raw; // Fallback

    val = val * sign;

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(val);
};

export const formatComptrollerPercent = (raw: string): string => {
    if (!raw || !raw.trim()) return "0.00%";
    const val = parseFloat(raw);
    if (isNaN(val)) return raw;
    // implied 2 decimals: 10000 -> 100.00
    return (val / 100).toFixed(2) + '%';
};

// Legacy ID Extractor (kept for safety, though mapped via new parser in context now)
export const extractIDs = (content: string): Set<string> => {
    const ids = new Set<string>();
    const matches = content.matchAll(/N\d{8}/g);
    for (const match of matches) {
        ids.add(match[0]);
    }
    return ids;
};
