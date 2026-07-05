
import os
import sys
import webbrowser
import threading
import time
import json
import paramiko
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
import io
import socket
import subprocess
import tempfile
import stat
import urllib.parse
import shutil

# Configuration
PORT = 9020
HOST = 'localhost'

# Determine paths
if getattr(sys, 'frozen', False):
    # If we are running in a PyInstaller bundle
    BASE_DIR = sys._MEIPASS
    STATIC_FOLDER = os.path.join(BASE_DIR, 'www')
else:
    # If we are running as a script (Development)
    # We assume the script is in /launcher, and the react build is in /nben902-pwa/dist
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_FOLDER = os.path.join(BASE_DIR, '..', 'nben902-pwa', 'dist')

print(f"Server Root: {BASE_DIR}")
print(f"Serving Web App from: {STATIC_FOLDER}")

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='')
CORS(app)  # Enable CORS for all routes (useful if dev server is separate)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # Fallback to index.html for React Router
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "agent": "NBEN902 Launcher", "version": "2.8.7"})

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Headless SFTP Upload - performs transmission directly and returns result to PWA.
    No external GUI window is launched.
    """
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        host = data.get('host', '').strip()
        # Remove sftp:// or ftp:// prefix if user pasted it
        if host.startswith('sftp://'):
            host = host[7:]
        elif host.startswith('ftp://'):
            host = host[6:]
        
        port = int(data.get('port', 22))
        username = data.get('username', '').strip()
        password = data.get('password', '')
        source_ip = data.get('source_ip', '').strip()
        remote_path = data.get('remote_path', '/inbound/').strip()
        filename = data.get('filename', '').strip()
        content = data.get('file_content')

        # Debug: Log what we received BEFORE validation
        print(f"=== UPLOAD REQUEST RECEIVED ===")
        print(f"Host: {host}, User: {username}")
        print(f"Password: {'SET' if password else 'EMPTY'}")
        print(f"Filename: {filename}")
        print(f"Content length: {len(content) if content else 0}")
        sys.stdout.flush()

        # Validation
        if not all([host, username, password]):
            return jsonify({"success": False, "message": "Missing required fields (Host/User/Password)"}), 400
        
        if not filename:
            return jsonify({"success": False, "message": "No filename provided"}), 400
        
        # Allow empty content (empty file upload)
        if content is None:
            content = ""

        # Debug logging
        debug_log = []
        debug_log.append(f"Starting connection to {host}:{port}...")
        debug_log.append(f"User: {username}")
        debug_log.append(f"Remote Path: {remote_path}")
        debug_log.append(f"File: {filename} ({len(content)} bytes)")
        
        print(f"=== SFTP UPLOAD REQUEST ===")
        print(f"Host: {host}:{port}, User: {username}")
        print(f"File: {filename} ({len(content)} bytes)")
        print(f"Remote Path: {remote_path}")
        sys.stdout.flush()

        try:
            # Resolve host first so DNS failures are distinct from timeouts
            debug_log.append(f"Resolving host {host}...")
            resolved_ip = socket.gethostbyname(host)
            debug_log.append(f"Resolved {host} -> {resolved_ip}")

            # Create socket for connection
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(15)  # 15 second connection timeout

            # Bind to specific interface if specified
            if source_ip:
                try:
                    debug_log.append(f"Binding to source IP: {source_ip}")
                    sock.bind((source_ip, 0))
                    debug_log.append(f"Bound to {source_ip}. NOTE: if the connection times out, clear the Source IP setting - this interface may not have a route to the server.")
                except Exception as bind_e:
                    debug_log.append(f"Bind failed: {bind_e}, using default route")

            # Connect
            debug_log.append(f"Connecting to {resolved_ip}:{port} (TCP)...")
            sock.connect((resolved_ip, port))
            debug_log.append("TCP connection established")

            # Create Paramiko transport
            debug_log.append("Initiating SSH handshake...")
            transport = paramiko.Transport(sock)
            transport.banner_timeout = 30
            transport.auth_timeout = 30

            debug_log.append(f"Authenticating as {username}...")
            transport.connect(username=username, password=password)
            debug_log.append("Authentication successful")

            # Create SFTP client
            sftp = paramiko.SFTPClient.from_transport(transport)
            debug_log.append("SFTP session opened")

            # Write content to temp file for upload
            temp_local_path = None
            try:
                # `newline=''` ensures we don't accidentally do \r\n -> \r\r\n on Windows
                with tempfile.NamedTemporaryFile(delete=False, mode='w', encoding='utf-8', suffix='.tmp', newline='') as tf:
                    tf.write(content)
                    temp_local_path = tf.name

                # Integrity guard: the bytes on disk must be exactly the bytes
                # received. If they ever differ, abort - never send an altered file.
                import hashlib
                expected_bytes = content.encode('utf-8')
                with open(temp_local_path, 'rb') as vf:
                    written_bytes = vf.read()
                if written_bytes != expected_bytes:
                    debug_log.append("INTEGRITY CHECK FAILED: written file does not match received content. Transmission aborted.")
                    return jsonify({
                        "success": False,
                        "message": "File integrity check failed - transmission aborted. The file was NOT sent.",
                        "debug_log": "\n".join(debug_log)
                    }), 500
                sha256 = hashlib.sha256(written_bytes).hexdigest()
                debug_log.append(f"Integrity verified: {len(written_bytes)} bytes, SHA-256 {sha256[:16]}...")

                # Construct remote path
                if remote_path and not remote_path.endswith('/'):
                    remote_path += '/'
                remote_full_path = remote_path + filename

                debug_log.append(f"Uploading to: {remote_full_path}")

                # Perform upload (put() confirms the remote file size matches)
                sftp.put(temp_local_path, remote_full_path)
                debug_log.append(f"Upload complete! Remote size confirmed = {len(written_bytes)} bytes.")
                
            finally:
                # Cleanup temp file
                if temp_local_path and os.path.exists(temp_local_path):
                    os.unlink(temp_local_path)

            # Close connections
            sftp.close()
            transport.close()
            
            print(f"=== UPLOAD SUCCESS: {filename} ===")
            sys.stdout.flush()

            return jsonify({
                "success": True,
                "message": f"File '{filename}' transmitted successfully to {host}.",
                "timestamp": time.time(),
                "debug_log": "\n".join(debug_log)
            })

        except paramiko.AuthenticationException as auth_e:
            debug_log.append(f"Authentication failed: {auth_e}")
            return jsonify({
                "success": False,
                "message": "Authentication failed. Check username/password.",
                "debug_log": "\n".join(debug_log)
            }), 401

        except socket.timeout as timeout_e:
            last_stage = debug_log[-1] if debug_log else "unknown stage"
            debug_log.append(f"Connection timed out: {timeout_e}")
            hint = "Try clearing the Source IP setting." if source_ip else "Check network/VPN/firewall (outbound port 22)."
            return jsonify({
                "success": False,
                "message": f"Connection to {host}:{port} timed out during: {last_stage} - {hint}",
                "debug_log": "\n".join(debug_log)
            }), 504

        except paramiko.SSHException as ssh_e:
            debug_log.append(f"SSH handshake/protocol error: {ssh_e}")
            return jsonify({
                "success": False,
                "message": f"SSH negotiation with {host}:{port} failed: {ssh_e}",
                "debug_log": "\n".join(debug_log)
            }), 502

        except socket.gaierror as gai_e:
            debug_log.append(f"Host resolution failed: {gai_e}")
            return jsonify({
                "success": False,
                "message": f"Could not resolve host '{host}'. Check the hostname and your network.",
                "debug_log": "\n".join(debug_log)
            }), 400

        except Exception as sftp_e:
            debug_log.append(f"SFTP Error: {sftp_e}")
            print(f"SFTP Error: {sftp_e}")
            sys.stdout.flush()
            return jsonify({
                "success": False,
                "message": f"SFTP Error: {str(sftp_e)}",
                "debug_log": "\n".join(debug_log)
            }), 500

    except Exception as e:
        print(f"Server Error: {e}")
        sys.stdout.flush()
        return jsonify({"success": False, "message": f"Server Error: {str(e)}"}), 500


@app.route('/test-connection', methods=['POST'])
def test_connection():
    """
    Staged SFTP connectivity diagnostic: DNS -> TCP -> SSH -> Auth -> SFTP.
    Auth and SFTP stages only run when username/password are provided.
    Read-only - never writes to the remote server.
    """
    data = request.json or {}
    host = (data.get('host') or '').strip()
    if host.startswith('sftp://'):
        host = host[7:]
    elif host.startswith('ftp://'):
        host = host[6:]
    try:
        port = int(data.get('port', 22))
    except (TypeError, ValueError):
        port = 22
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    source_ip = (data.get('source_ip') or '').strip()
    remote_path = (data.get('remote_path') or '.').strip()

    stages = []

    def stage(name, ok, detail):
        stages.append({"stage": name, "ok": ok, "detail": detail})
        print(f"[test-connection] {name}: {'OK' if ok else 'FAIL'} - {detail}")
        sys.stdout.flush()

    def result(success):
        return jsonify({"success": success, "stages": stages})

    if not host:
        stage("Input", False, "No host configured. Set the SFTP Host in Settings.")
        return result(False)

    # Stage 1: DNS
    try:
        t0 = time.time()
        resolved_ip = socket.gethostbyname(host)
        stage("DNS", True, f"{host} -> {resolved_ip} ({int((time.time() - t0) * 1000)} ms)")
    except socket.gaierror as e:
        stage("DNS", False, f"Cannot resolve '{host}': {e}. Check the hostname, VPN, or DNS.")
        return result(False)

    # Stage 2: TCP connect (with optional source interface bind)
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(15)
    if source_ip:
        try:
            sock.bind((source_ip, 0))
            stage("Bind", True, f"Bound to source IP {source_ip}")
        except Exception as e:
            stage("Bind", False, f"Could not bind to {source_ip} ({e}); using default route")
    try:
        t0 = time.time()
        sock.connect((resolved_ip, port))
        stage("TCP", True, f"Connected to {resolved_ip}:{port} ({int((time.time() - t0) * 1000)} ms)")
    except socket.timeout:
        hint = "Try clearing the Source IP setting." if source_ip else "A firewall or VPN is likely blocking outbound port 22."
        stage("TCP", False, f"Connection to {resolved_ip}:{port} timed out. {hint}")
        sock.close()
        return result(False)
    except Exception as e:
        stage("TCP", False, f"Connect failed: {e}")
        sock.close()
        return result(False)

    # Stage 3: SSH handshake
    transport = None
    try:
        transport = paramiko.Transport(sock)
        transport.banner_timeout = 30
        t0 = time.time()
        transport.start_client(timeout=20)
        key_name = transport.get_remote_server_key().get_name()
        stage("SSH", True, f"Handshake OK, server key {key_name} ({int((time.time() - t0) * 1000)} ms)")
    except Exception as e:
        stage("SSH", False, f"SSH handshake failed: {e}")
        if transport:
            transport.close()
        return result(False)

    # Stage 4: Authentication (optional)
    if not username or not password:
        stage("Auth", True, "Skipped (enter username/password to test login). Network path is good.")
        transport.close()
        return result(True)
    try:
        transport.auth_password(username, password)
        stage("Auth", True, f"Authenticated as {username}")
    except paramiko.AuthenticationException as e:
        stage("Auth", False, f"Authentication rejected: {e}")
        transport.close()
        return result(False)
    except Exception as e:
        stage("Auth", False, f"Authentication error: {e}")
        transport.close()
        return result(False)

    # Stage 5: SFTP session + directory listing (read-only)
    try:
        sftp = paramiko.SFTPClient.from_transport(transport)
        entries = sftp.listdir(remote_path or '.')
        stage("SFTP", True, f"Session opened, listed '{remote_path}' ({len(entries)} entries)")
        sftp.close()
    except Exception as e:
        stage("SFTP", False, f"Session/list failed for '{remote_path}': {e}")
        transport.close()
        return result(False)

    transport.close()
    return result(True)


# ============== System Tray Implementation ==============
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as item

# Global references
flask_thread = None
tray_icon = None

def create_tray_icon():
    """Create a simple green circle icon for the system tray."""
    # Create a 64x64 image with a green circle
    size = 64
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Draw green circle with border
    margin = 4
    draw.ellipse([margin, margin, size - margin, size - margin], 
                 fill=(34, 197, 94, 255),  # Green
                 outline=(22, 163, 74, 255), width=2)
    
    # Draw "N" in the center
    try:
        from PIL import ImageFont
        # Try to use a system font
        font = ImageFont.truetype("arial.ttf", 32)
    except:
        font = ImageFont.load_default()
    
    # Center the text
    text = "N"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 4
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    return image

def open_browser_action(icon=None, item=None):
    """Open the browser to the PWA."""
    url = f"http://{HOST}:{PORT}"
    webbrowser.open(url)

def restart_server_action(icon=None, item=None):
    """Restart the Flask server."""
    global flask_thread
    
    # Note: Flask doesn't support graceful restart easily
    # For now, just open browser again
    open_browser_action()

def exit_action(icon=None, item=None):
    """Exit the application."""
    global tray_icon
    if tray_icon:
        tray_icon.stop()
    os._exit(0)

def run_flask():
    """Run Flask server in a thread."""
    # Suppress Flask's default logging for cleaner operation
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False, threaded=True)

def setup_tray():
    """Set up and run the system tray icon."""
    global tray_icon
    
    icon_image = create_tray_icon()
    
    menu = pystray.Menu(
        item('Open NBEN902 Editor', open_browser_action, default=True),
        item('Restart Server', restart_server_action),
        pystray.Menu.SEPARATOR,
        item('Exit', exit_action)
    )
    
    tray_icon = pystray.Icon(
        "NBEN902",
        icon_image,
        "NBEN902 Server Running",
        menu
    )
    
    return tray_icon

def run_native_window():
    """Open the PWA in a native desktop window (Edge WebView2 via pywebview)."""
    import webview
    webview.create_window(
        'NBEN902 Editor',
        f"http://{HOST}:{PORT}",
        width=1280,
        height=850,
        min_size=(900, 600)
    )
    webview.start()  # Blocks until the window is closed


if __name__ == "__main__":
    # Start Flask server in background thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Wait for server to start
    time.sleep(1.5)

    # Preferred mode: native desktop window. Closing the window exits the app.
    # Fallback mode (WebView2 unavailable): legacy browser tab + system tray.
    try:
        run_native_window()
        os._exit(0)
    except Exception as e:
        print(f"Native window unavailable ({e}), falling back to browser + tray")
        open_browser_action()
        tray = setup_tray()
        tray.run()

