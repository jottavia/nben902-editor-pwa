# NBEN902 Editor - User Guide

**Version:** 2.8.4  
**Last Updated:** February 2026

---

## Quick Start

1. **Double-click** `NBEN902_Launcher.exe`
2. Your web browser will automatically open to the editor
3. Start working with your NBEN902 files
4. When finished, close the black console window to exit

---

## First-Time Setup

When running the application for the first time, you may encounter the following prompts:

### Windows SmartScreen Warning

You may see a message: **"Windows protected your PC"**

This appears because the application is not digitally signed. It is safe to run.

**To proceed:**
1. Click **"More info"**
2. Click **"Run anyway"**

This prompt will not appear again after the first run.

---

### Windows Firewall Prompt

You may see: **"Windows Defender Firewall has blocked some features"**

The application needs to open a local port (9020) to serve the web interface.

**To proceed:**
1. Check **"Private networks"** (recommended)
2. Optionally check "Public networks" if needed
3. Click **"Allow access"**

This allows your browser to communicate with the local server.

---

### Antivirus Warnings

Some antivirus software may flag the application as suspicious. This is a **false positive** common with applications built using PyInstaller.

**If blocked:**
1. Open your antivirus settings
2. Add `NBEN902_Launcher.exe` to the exceptions/whitelist
3. Try running again

---

## Using the Editor

### Opening Files

1. Click **"OPEN NBEN902"** in the toolbar
2. Select a `.input`, `.txt`, or `.902` file
3. The file contents will appear in the grid

### Editing Records

- Click any cell to edit
- Use **Tab** or **Enter** to move between cells
- Changes are made in real-time (no auto-save)

### Adding Records

- Click **"Add Row"** to add a blank record
- Or use **"Add existing member"** to search and add from loaded data

### Duplicating Records

- Click the duplicate icon on any row
- A copy is created with configured default deduction code/amount

### Deleting Records

- Click the delete icon on any row
- Deleted records are moved to the Reconciliation Report

### Saving Files

1. Click **"SAVE"** in the toolbar
2. The file downloads as `paysrp.nben902.Your Organization.input`
3. If you have deleted records, you'll be prompted to save a Reconciliation Report

---

## Transmitting Files via SFTP

### Prerequisites

- Valid SFTP credentials for the OSC server
- Network access to `sftp.example.com`

### Transmission Steps

1. Click **"Transmit"** in the toolbar
2. The Secure Transmit dialog opens
3. Verify the destination server and username
4. Click **"Browse"** to select the file to send
5. Enter your SFTP **password**
6. Click **"Transmit File"**
7. Wait for confirmation

### Transmission Settings

Access via the **Settings** (gear icon) button:

| Setting | Description |
|---------|-------------|
| SFTP Host | Server address (default: `sftp.example.com`) |
| SFTP Port | Port number (default: `22`) |
| SFTP User | Your username (default: `your_username`) |
| Source IP | Optional - bind to specific network interface |
| Remote Path | Server directory for uploads (default: `/inbound`) |

---

## Loading Comptroller Data

For advanced features (non-payer import, reports), load your data folder:

1. Click **"Load Folder"** in the Data Hub section
2. Select the folder containing your Comptroller files:
   - `npay528` (Master file)
   - `npay518` (Current payers)
   - `nben753` / `nben772` (New members)
   - `nben530` (Change reports)

3. Once loaded, additional features become available:
   - **Import Non-Payers**: Add members from 753/772 not in 518
   - **Reports**: Generate spreadsheets and change reports
   - **Member Lookup**: Search for specific members

---

## Troubleshooting

### "Port 9020 already in use"

Another instance may be running, or another application uses this port.

**Solution:**
1. Close any other NBEN902 Launcher windows
2. Check Task Manager for existing `NBEN902_Launcher.exe` processes
3. End any duplicate processes and try again

### Browser doesn't open automatically

**Solution:**
1. Manually open your browser
2. Navigate to `http://localhost:9020`

### SFTP Connection Timeout

**Possible causes:**
- Network/firewall blocking port 22
- Incorrect server address
- VPN not connected (if required)

**Solutions:**
1. Verify network connectivity
2. Check SFTP settings are correct
3. Try specifying a Source IP if you have multiple network adapters

### Application won't start

**Possible causes:**
- Antivirus blocking the application
- Missing Visual C++ Redistributable

**Solutions:**
1. Check antivirus logs and add exception
2. Install Visual C++ Redistributable 2015-2022 from Microsoft

---

## Settings Reference

Access settings via the gear icon in the toolbar.

### Default Values

| Setting | Default | Description |
|---------|---------|-------------|
| Agency Code | 00000 | Default agency for new records |
| Load Deduction Code | 456 | Code for imported records |
| Load Deduction Amount | 2000 | Amount for imported records |
| New Row Code | 456 | Code for manually added rows |
| New Row Amount | 2000 | Amount for manually added rows |
| Duplicate Code | 407 | Code when duplicating |
| Duplicate Amount | 100 | Amount when duplicating |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Tab | Move to next cell |
| Shift+Tab | Move to previous cell |
| Enter | Confirm edit, move down |
| Escape | Cancel edit |

---

## Support

For issues or feature requests, contact your system administrator or the development team.

---

*NBEN902 Editor - Your Organization Payroll Services*
