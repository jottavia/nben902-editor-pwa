
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
    agencyCode: "00000",  // Configure your agency code
    loadDefaultDeductionCode: "456",
    loadDefaultDeductionAmount: "2000",
    newRowDeductionCode: "456",
    newRowDeductionAmount: "2000",
    duplicateDeductionCode: "407",
    duplicateDeductionAmount: "100",

    // Transmission Defaults - Configure for your SFTP server
    sftpHost: "sftp.example.com",
    sftpPort: 22,
    sftpUser: "your_username",
    sftpSourceIp: "",
    sftpRemotePath: "/inbound",
    localServerUrl: "http://localhost:9020"
};
