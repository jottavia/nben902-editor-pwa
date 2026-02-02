export interface NPAY528Record {
    nysEmplid: string; // 9 chars
    name: string; // 50 chars
    agencyCode: string; // 5 chars
    address1: string; // 35 chars
    address2: string; // 35 chars
    address3: string; // 35 chars
    address4: string; // 35 chars
    city: string; // 30 chars
    county: string; // 30 chars
    state: string; // 2 chars
    zip: string; // 10 chars
    country: string; // 3 chars
    annualSalary: string; // 10 chars
    titleCode: string; // 7 chars
    titleCodeDesc: string; // 30 chars
    partTimePercent: string; // 5 chars
    payBasisCode: string; // 3 chars
    totalGross: string; // 10 chars
    bargainUnit: string; // 2 chars
    dedCodeHealth: string; // 3 chars
    workLocation: string; // 9 chars
    originalLine: string; // Persist original for reference
}

export interface NBEN530Record {
    name: string;
    reasonCode: string;
    reasonDesc: string;
    originalLine: string;
}

// 753 and 772 often share stricture with 528 for the first block (ID, Name, Agency)
// We'll define a generic member interface for them for now
export interface GenericComptrollerRecord {
    nysEmplid: string;
    name: string;
    agencyCode: string;
    fileSource: string; // Filename this came from
    originalLine: string;
}

export interface ComptrollerData {
    npay528: NPAY528Record[]; // The Master List
    nben530: NBEN530Record[]; // Changes
    nben753: GenericComptrollerRecord[]; // New Entrants
    npay772: GenericComptrollerRecord[]; // Non-Members
    npay518: NPAY518Record[]; // Deduction Details
    npay518Ids: Set<string>; // Set of IDs that are already paying (Exclusions)
    raw518?: string;

    // Derived / Aggregated
    allMembersMap: Map<string, UnifiedMemberProfile>;
}

export interface UnifiedMemberProfile {
    nysEmplid: string;
    name: string;
    agencyCode: string;

    // Status Flags
    in528: boolean;
    in518: boolean; // Active Payer
    in753: boolean; // New Entrant
    in772: boolean; // Non-Member
    in530: boolean; // Has Change

    // Data Pointers
    data528?: NPAY528Record;
    data530?: NBEN530Record;
    data518?: NPAY518Record[]; // Array because one member can have Dues + PAC
}

export interface NPAY518Record {
    recordType: string;
    checkDate: string;
    name: string;
    nysEmplid: string;
    agencyCode: string;
    lineItem: string;
    deductionCode: string; // 201=Dues, etc.
    deductionDesc: string;
    amountTaken: string;
    refundAmount: string;
    amountNotTaken: string;
    originalLine: string;
}
