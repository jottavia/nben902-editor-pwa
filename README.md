# NBEN902 Editor

A modern Progressive Web App (PWA) for editing and managing NBEN902 payroll deduction files with secure SFTP transmission capabilities.

## Features

- **File Editor**: Open, edit, and save NBEN902 input files
- **Comptroller Integration**: Import data from 528, 518, 753, 772, and 530 files
- **Non-Payer Import**: Automatically identify and import members not currently paying dues
- **Prior File Filtering**: Filter out members from previous submissions
- **Reconciliation Reports**: Track deleted/excluded entries with reasons
- **Secure SFTP Transmission**: Upload files directly to your SFTP server
- **Member Lookup**: Search and add members from loaded data
- **Change Reports**: Generate reports from 530 change data

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS
- **Local Server**: Python Flask + Paramiko (for SFTP)
- **Build**: PyInstaller (standalone executable)

## Quick Start

### Development Mode

1. **Install PWA dependencies:**
   ```bash
   cd nben902-pwa
   npm install
   npm run dev
   ```

2. **Run the Flask server (for SFTP):**
   ```bash
   cd launcher
   pip install flask paramiko
   python app.py
   ```

3. Open `http://localhost:5173` (Vite dev server) or `http://localhost:9020` (Flask server)

### Production Build

1. **Build the PWA:**
   ```bash
   cd nben902-pwa
   npm run build
   ```

2. **Create standalone executable:**
   ```bash
   cd launcher
   pip install pyinstaller
   pyinstaller --onefile --name NBEN902_Launcher --add-data "../nben902-pwa/dist;www" app.py
   ```

3. The executable will be in `launcher/dist/NBEN902_Launcher.exe`

## Configuration

Edit `nben902-pwa/src/types/settings.ts` to configure default values:

```typescript
export const DEFAULT_SETTINGS: AppSettings = {
    agencyCode: "00000",           // Your agency code
    sftpHost: "sftp.example.com",  // Your SFTP server
    sftpUser: "your_username",     // Your SFTP username
    sftpRemotePath: "/inbound",    // Remote upload directory
    // ... other settings
};
```

Users can also modify these settings at runtime via the Settings panel in the app.

## Project Structure

```
nben902-editor_pwa/
├── launcher/
│   ├── app.py              # Flask server + SFTP handler
│   └── requirements.txt    # Python dependencies
├── nben902-pwa/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── vite.config.ts
└── docs/
    └── NBEN902_User_Guide.md
```

## File Format

The NBEN902 format is a fixed-width text format for payroll deduction transactions:

| Field | Position | Length | Description |
|-------|----------|--------|-------------|
| Agency Code | 1-5 | 5 | Agency identifier |
| Name | 6-55 | 50 | Employee name |
| Employee ID | 56-66 | 11 | NYS Employee ID |
| Deduction Code | 67-69 | 3 | Deduction type code |
| Effective Date | 70-77 | 8 | Start date (MMDDYYYY) |
| End Date | 78-85 | 8 | End date (MMDDYYYY) |
| Amount | 86-92 | 7 | Deduction amount (cents) |

## Requirements

### Frontend
- Node.js 18+
- npm or yarn

### Backend (for SFTP)
- Python 3.9+
- Flask
- Paramiko

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues or feature requests, please open a GitHub issue.
