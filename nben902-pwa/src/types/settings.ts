
export interface AppSettings {
    agencyCode: string;
    loadDefaultDeductionCode: string;
    loadDefaultDeductionAmount: string;
    newRowDeductionCode: string;
    newRowDeductionAmount: string;
    duplicateDeductionCode: string;
    duplicateDeductionAmount: string;

    // Transmission Settings
    sftpHost: string;
    sftpPort: number;
    sftpUser: string;
    sftpSourceIp?: string;
    sftpRemotePath: string;
    localServerUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
    agencyCode: "00000",
    loadDefaultDeductionCode: "456",
    loadDefaultDeductionAmount: "1000",
    newRowDeductionCode: "456",
    newRowDeductionAmount: "1000",
    duplicateDeductionCode: "407",
    duplicateDeductionAmount: "100",

    // Transmission Defaults
    sftpHost: "",
    sftpPort: 22,
    sftpUser: "",
    sftpSourceIp: "",
    sftpRemotePath: "/inbound",
    localServerUrl: "http://localhost:9020"
};
