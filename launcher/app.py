
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
    return jsonify({"status": "ok", "agent": "NBEN902 Launcher", "version": "1.0.0"})

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

        host = data.get('host')
        port = int(data.get('port', 22))
        username = data.get('username')
        password = data.get('password')
        source_ip = data.get('source_ip')  # Optional source binding
        remote_path = data.get('remote_path', '/inbound/')
        filename = data.get('filename')
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
            # Create socket for connection
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(15)  # 15 second connection timeout

            # Bind to specific interface if specified
            if source_ip:
                try:
                    debug_log.append(f"Binding to source IP: {source_ip}")
                    sock.bind((source_ip, 0))
                except Exception as bind_e:
                    debug_log.append(f"Bind failed: {bind_e}, using default route")

            # Connect
            debug_log.append(f"Connecting to {host}:{port}...")
            sock.connect((host, port))
            debug_log.append("TCP connection established")

            # Create Paramiko transport
            debug_log.append("Initiating SSH handshake...")
            transport = paramiko.Transport(sock)
            
            debug_log.append(f"Authenticating as {username}...")
            transport.connect(username=username, password=password)
            debug_log.append("Authentication successful")

            # Create SFTP client
            sftp = paramiko.SFTPClient.from_transport(transport)
            debug_log.append("SFTP session opened")

            # Write content to temp file for upload
            temp_local_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, mode='w', encoding='utf-8', suffix='.tmp') as tf:
                    tf.write(content)
                    temp_local_path = tf.name
                
                # Construct remote path
                if remote_path and not remote_path.endswith('/'):
                    remote_path += '/'
                remote_full_path = remote_path + filename
                
                debug_log.append(f"Uploading to: {remote_full_path}")
                
                # Perform upload
                sftp.put(temp_local_path, remote_full_path)
                debug_log.append("Upload complete!")
                
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
            debug_log.append(f"Connection timed out: {timeout_e}")
            return jsonify({
                "success": False,
                "message": f"Connection to {host}:{port} timed out. Check network/firewall.",
                "debug_log": "\n".join(debug_log)
            }), 504

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


def open_browser():
    """Wait a moment for server to start, then open browser."""
    time.sleep(1.5)
    url = f"http://{HOST}:{PORT}"
    print(f"Opening browser to {url}...")
    webbrowser.open(url)

if __name__ == "__main__":
    # Auto-launch browser in a separate thread
    threading.Thread(target=open_browser).start()
    
    print(f"Starting Local Agent on port {PORT}...")
    app.run(host=HOST, port=PORT, debug=False)
