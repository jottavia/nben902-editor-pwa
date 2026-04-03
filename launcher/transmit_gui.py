
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import paramiko
import os
import sys
import socket
import argparse
import threading
from urllib.parse import unquote

# Define Colors to match PWA (Dark Mode)
BG_COLOR = "#0f172a"        # Slate 900
CARD_BG = "#1e293b"         # Slate 800
TEXT_COLOR = "#f8fafc"      # Slate 50
INPUT_BG = "#334155"        # Slate 700
INPUT_FG = "#ffffff"
ACCENT_COLOR = "#3b82f6"    # Blue 500
BUTTON_HOVER = "#2563eb"    # Blue 600
STATUS_SUCCESS = "#4ade80"  # Green 400
STATUS_ERROR = "#f87171"    # Red 400

class ModernSFTPApp(tk.Tk):
    def __init__(self, file_path, host, user, password=None, source_ip=None):
        super().__init__()

        self.title("Secure Transmission | NBEN902")
        self.geometry("500x600")
        self.configure(bg=BG_COLOR)
        self.resizable(False, False)

        # Set window icon if available (skip for now to avoid errors)
        
        # Data
        self.file_path = file_path or ""
        self.host_val = host or "sft.osc.state.ny.us"
        self.user_val = user or "sccea_paysr"
        self.pass_val = password or ""
        self.source_ip_val = source_ip or ""
        
        # Styles
        style = ttk.Style()
        style.theme_use('clam')
        
        style.configure("Horizontal.TProgressbar", background=ACCENT_COLOR, troughcolor=INPUT_BG, bordercolor=BG_COLOR, lightcolor=ACCENT_COLOR, darkcolor=ACCENT_COLOR)

        self.setup_ui()

    def setup_ui(self):
        # Header
        header_frame = tk.Frame(self, bg=BG_COLOR)
        header_frame.pack(fill="x", pady=20, padx=30)
        
        tk.Label(header_frame, text="Transmit File", font=("Segoe UI", 18, "bold"), bg=BG_COLOR, fg=TEXT_COLOR).pack(anchor="w")
        tk.Label(header_frame, text="Secure SFTP Uplink", font=("Segoe UI", 10), bg=BG_COLOR, fg="#94a3b8").pack(anchor="w")

        # Buttons (Pack first to ensure visibility at bottom)
        btn_frame = tk.Frame(self, bg=BG_COLOR)
        btn_frame.pack(fill="x", padx=30, pady=30, side="bottom")

        self.btn_send = tk.Button(btn_frame, text="TRANSMIT SECURELY", command=self.start_transmission, 
                                  bg=ACCENT_COLOR, fg="white", font=("Segoe UI", 10, "bold"), 
                                  relief="flat", pady=10, cursor="hand2")
        self.btn_send.pack(fill="x")

        # Hover effects
        self.btn_send.bind("<Enter>", lambda e: self.btn_send.config(bg=BUTTON_HOVER))
        self.btn_send.bind("<Leave>", lambda e: self.btn_send.config(bg=ACCENT_COLOR))

        # Form Container
        form_frame = tk.Frame(self, bg=BG_COLOR)
        form_frame.pack(fill="both", expand=True, padx=30)

        # --- Host ---
        self.create_label(form_frame, "Destination Host")
        self.host_entry = self.create_input(form_frame, self.host_val)

        # --- User ---
        self.create_label(form_frame, "Username")
        self.user_entry = self.create_input(form_frame, self.user_val)

        # --- Password ---
        self.create_label(form_frame, "Password")
        self.pass_entry = self.create_input(form_frame, self.pass_val, show="*")

        # --- File Path ---
        self.create_label(form_frame, "File to Transmit")
        
        file_frame = tk.Frame(form_frame, bg=BG_COLOR)
        file_frame.pack(fill="x", pady=(5, 0))
        
        self.file_entry = tk.Entry(file_frame, bg=INPUT_BG, fg=INPUT_FG, insertbackground="white", 
                         relief="flat", font=("Segoe UI", 10))
        self.file_entry.pack(side="left", fill="x", expand=True, ipady=5)
        self.file_entry.insert(0, self.file_path)
        
        self.browse_btn = tk.Button(file_frame, text="Browse", command=self.browse_file,
                                    bg=CARD_BG, fg=TEXT_COLOR, relief="flat", font=("Segoe UI", 9))
        self.browse_btn.pack(side="right", padx=(5, 0), ipady=2)

        # --- Remote Path (Hidden/Fixed usually, but good to show) ---
        self.create_label(form_frame, "Remote Directory")
        self.remote_entry = self.create_input(form_frame, "/inbound/")


        # --- Advanced Settings (Adapter Bind) ---
        self.create_label(form_frame, "Network Interface (Advanced)")
        
        self.ip_list = self.get_ip_addresses()
        self.adapter_var = tk.StringVar()
        
        # Determine default selection
        current_selection = "Default (Auto)"
        if self.source_ip_val and self.source_ip_val in self.ip_list:
            current_selection = self.source_ip_val
        elif self.source_ip_val:
            # If passed IP isn't in detected list (e.g. VPN virtual IP), add it temporarily
            self.ip_list.append(self.source_ip_val)
            current_selection = self.source_ip_val
            
        self.adapter_combo = ttk.Combobox(form_frame, textvariable=self.adapter_var, values=self.ip_list, state="readonly", font=("Segoe UI", 9))
        self.adapter_combo.pack(fill="x", pady=(5, 0), ipady=3)
        self.adapter_combo.set(current_selection)

        # Progress Bar
        self.progress = ttk.Progressbar(form_frame, orient="horizontal", mode="determinate", length=100, style="Horizontal.TProgressbar")
        self.progress.pack(fill="x", pady=(20, 5))

        # Status Label
        self.status_label = tk.Label(form_frame, text="Ready to connect...", bg=BG_COLOR, fg="#94a3b8", font=("Segoe UI", 9))
        self.status_label.pack(fill="x", pady=5)



    def create_label(self, parent, text):
        tk.Label(parent, text=text, bg=BG_COLOR, fg="#cbd5e1", font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(10, 0))

    def create_input(self, parent, value, show=None):
        entry = tk.Entry(parent, bg=INPUT_BG, fg=INPUT_FG, insertbackground="white", 
                         relief="flat", font=("Segoe UI", 10), show=show)
        entry.pack(fill="x", pady=(5, 0), ipady=5)
        entry.insert(0, value)
        return entry

    def browse_file(self):
        filename = filedialog.askopenfilename(title="Select File to Transmit")
        if filename:
            self.file_entry.delete(0, tk.END)
            self.file_entry.insert(0, filename)

    def get_ip_addresses(self):
        ips = ["Default (Auto)"]
        try:
            # Get local hostname
            hostname = socket.gethostname()
            # Get list of IP addresses associated with hostname
            _, _, ip_list = socket.gethostbyname_ex(hostname)
            ips.extend(ip_list)
        except Exception as e:
            print(f"Failed to detect IPs: {e}")
        return ips
        
    def start_transmission(self):
        # Read values in MAIN THREAD (Tkinter is not thread safe)
        host = self.host_entry.get().strip()
        user = self.user_entry.get().strip()
        password = self.pass_entry.get().strip()
        local_path = self.file_entry.get().strip()
        remote_dir = self.remote_entry.get().strip()
        
        selected_adapter = self.adapter_combo.get()
        source_ip = None
        if selected_adapter != "Default (Auto)":
            source_ip = selected_adapter

        # Run in thread to keep GUI responsive, passing data explicitly
        threading.Thread(target=self.transmit_thread, 
                         args=(host, user, password, local_path, remote_dir, source_ip), 
                         daemon=True).start()

    def transmit_thread(self, host, user, password, local_path, remote_dir, source_ip_val):
        # Use .after to update GUI from thread safely (though usually config works okay-ish on Windows, strictly it shouldn't)
        # For simplicity we will access methods directly but minimal logic
        self.btn_send.config(state="disabled", text="CONNECTING...")
        self.status_label.config(text="Initializing connection...", fg=TEXT_COLOR)
        
        self.source_ip_val = source_ip_val # Sync class var just in case
        
        # (Removed Reading Logic - Data passed in)
        
        if not os.path.exists(local_path):
            self.status("Error: File not found: " + local_path, STATUS_ERROR)
            self.reset_btn()
            return

        try:
            # Create a socket for the connection
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10) # 10s connection timeout

            # Bind to specific Interface if selected
            if self.source_ip_val:
                try:
                    self.status(f"Binding to {self.source_ip_val}...", ACCENT_COLOR)
                    sock.bind((self.source_ip_val, 0))
                except Exception as bind_e:
                    print(f"Bind failed: {bind_e}")
                    self.status(f"Bind failed ({bind_e}), trying default...", STATUS_ERROR)
                    # Proceed without binding (OS default)

            self.status("Connecting to " + host + "...", ACCENT_COLOR)

            # Connect the socket
            try:
                sock.connect((host, 22))
            except Exception as tcp_e:
                # Check for blocking-wait error 10035 (not a real fail)
                err_code = getattr(tcp_e, 'errno', None)
                if str(err_code) == "10035":
                    pass # It's connecting...
                else:
                    raise tcp_e
            
            # Hand over connected socket to Paramiko
            self.status("Handshaking SSH...", ACCENT_COLOR)
            transport = paramiko.Transport(sock)
            
            self.status(f"Authenticating...", ACCENT_COLOR)
            transport.connect(username=user, password=password)

            sftp = paramiko.SFTPClient.from_transport(transport)

            # Calculate file size for progress bar
            file_size = os.path.getsize(local_path)
            
            # Construct remote path
            # USE LOCAL FILENAME (Allows test files like paysr...input)
            remote_filename = os.path.basename(local_path)
            
            # Ensure remote_dir ends with slash if not empty
            if remote_dir and not remote_dir.endswith("/"):
                remote_dir += "/"
            remote_path = remote_dir + remote_filename
            
            self.progress["maximum"] = file_size
            self.progress["value"] = 0
            
            def progress_callback(transferred, total):
                # Update progress bar safely from thread
                self.progress["value"] = transferred
                self.update_idletasks()
                
            sftp.put(local_path, remote_path, callback=progress_callback)
            
            sftp.close()
            transport.close()
            
            self.status("SUCCESS: File Transmitted.", STATUS_SUCCESS)
            self.btn_send.config(text="TRANSMISSION COMPLETE", bg=STATUS_SUCCESS)
            messagebox.showinfo("Success", f"File '{remote_filename}' successfully transmitted to {host}.")
            
            # Optional: Close after success?
            # self.after(2000, self.destroy)
            self.reset_btn()

        except Exception as e:
            err_msg = str(e)
            print(f"Error: {err_msg}")
            self.status(f"Error: {err_msg}", STATUS_ERROR)
            messagebox.showerror("Transmission Failed", err_msg)
            # self.reset_btn() # KEEP UI STUCK ON ERROR FOR USER TO READ

    def status(self, text, color):
        self.status_label.config(text=text, fg=color)

    def reset_btn(self):
        self.btn_send.config(state="normal", text="TRANSMIT SECURELY", bg=ACCENT_COLOR)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Standalone SFTP GUI')
    parser.add_argument('--file', help='Path to file to upload')
    parser.add_argument('--host', help='SFTP Host')
    parser.add_argument('--user', help='SFTP User')
    parser.add_argument('--passw', help='SFTP Password') # 'pass' is reserved in some parsers logic maybe? using passw
    parser.add_argument('--source_ip', help='Optional Source IP to bind to')
    
    args = parser.parse_args()
    
    # Handle URL decoding if passed from web launch etc (safety)
    fpath = unquote(args.file) if args.file else None
    
    app = ModernSFTPApp(file_path=fpath, host=args.host, user=args.user, password=args.passw, source_ip=args.source_ip)
    app.mainloop()
