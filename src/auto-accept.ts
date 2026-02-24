import * as vscode from 'vscode';
import * as http from 'http';
import WebSocket from 'ws';

/**
 * AutoAcceptService: CDP-based auto-accept for Antigravity IDE
 *
 * Connects to VS Code's Chromium debugger via Chrome DevTools Protocol
 * and automatically clicks accept/run/allow buttons in agent webviews.
 *
 * ⚠️ This does NOT touch the Language Server, CSRF tokens, or quota data.
 *    It only interacts with the local IDE UI via CDP.
 */
export class AutoAcceptService implements vscode.Disposable {
    private _enabled = false;
    private _interval: number;
    private _timer: ReturnType<typeof setInterval> | undefined;
    private _msgId = 1;
    private _connections = new Map<string, WebSocket>();

    private readonly BASE_PORT = 9000;
    private readonly PORT_RANGE = 5;

    private _outputChannel: vscode.OutputChannel;

    constructor(interval: number = 800) {
        this._interval = interval;
        this._outputChannel = vscode.window.createOutputChannel('Auto-Accept Lite');
    }

    // ─── Public API ──────────────────────────────────────────

    start(): void {
        if (this._enabled) return;
        this._enabled = true;
        this._timer = setInterval(() => this._tick(), this._interval);
        this._log('Auto-accept started');
    }

    stop(): void {
        if (!this._enabled) return;
        this._enabled = false;
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
        this._log('Auto-accept stopped');
    }

    toggle(): boolean {
        if (this._enabled) {
            this.stop();
        } else {
            this.start();
        }
        return this._enabled;
    }

    isRunning(): boolean {
        return this._enabled;
    }

    updateInterval(ms: number): void {
        this._interval = ms;
        if (this._enabled && this._timer) {
            clearInterval(this._timer);
            this._timer = setInterval(() => this._tick(), this._interval);
        }
    }

    dispose(): void {
        this.stop();
        this._connections.forEach((ws) => {
            try { ws.close(); } catch { /* ignore */ }
        });
        this._connections.clear();
        this._outputChannel.dispose();
    }

    // ─── Core Logic ──────────────────────────────────────────

    private async _tick() {
        if (!this._enabled) return;
        try {
            await this._scanAndClick();
        } catch (err) {
            this._log(`Error: ${err}`);
        }
    }

    /**
     * Scan all local CDP ports for webview pages and inject the clicker script
     */
    private async _scanAndClick() {
        for (
            let port = this.BASE_PORT - this.PORT_RANGE;
            port <= this.BASE_PORT + this.PORT_RANGE;
            port++
        ) {
            const pages = await this._getPages(port);
            for (const page of pages) {
                if (page.type !== 'page' && page.type !== 'webview') continue;
                if ((page.title || '').includes('Extension Host')) continue;

                const id = `${port}:${page.id}`;
                if (!this._connections.has(id) && page.webSocketDebuggerUrl) {
                    await this._connectToPage(id, page.webSocketDebuggerUrl);
                }

                const ws = this._connections.get(id);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    await this._evaluate(ws, this._getClickerScript());
                }
            }
        }
    }

    /**
     * The clicker script injected into webview contexts.
     *
     * Target keywords (user-customized):
     *   - accept all, accept, confirm, run, always allow, allow
     *   - always run (< 25 chars), run alt*
     *   - expand all, requires input (expanders)
     *
     * Removed from original:
     *   - "allow once" (user only wants "always allow")
     *   - "expand" (replaced with "expand all")
     */
    private _getClickerScript(): string {
        return `
            (() => {
                const getAllRoots = (root = document) => {
                    let roots = [root];
                    try {
                        const iframes = root.querySelectorAll('iframe, frame');
                        for (const iframe of iframes) {
                            try {
                                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                if (doc) roots.push(...getAllRoots(doc));
                            } catch (e) { }
                        }
                        const shadowHosts = root.querySelectorAll('*');
                        for (const el of shadowHosts) {
                            if (el.shadowRoot) roots.push(...getAllRoots(el.shadowRoot));
                        }
                    } catch (e) { }
                    return roots;
                };

                const roots = getAllRoots();
                const pageTitle = document.title || "";
                const isReviewPage = pageTitle.includes("Review Changes");

                roots.forEach(root => {
                    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
                    let el;
                    while (el = walker.nextNode()) {
                        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;

                        const rawText = (el.innerText || el.textContent || "").trim().toLowerCase();
                        if (!rawText) continue;

                        let isMatch = false;
                        let isExpander = false;

                        // ── Target tokens ──
                        if (['accept all', 'accept', 'confirm', 'run', 'always allow', 'allow'].includes(rawText)) isMatch = true;
                        if (rawText.includes('always run') && rawText.length < 25) isMatch = true;
                        if (rawText.startsWith('run alt')) isMatch = true;

                        // ── Expanders ── (expand all only, not plain "expand")
                        if (rawText === 'expand all') { isMatch = true; isExpander = true; }
                        if (rawText.includes('requires input')) { isMatch = true; isExpander = true; }

                        // ── Noise filter ──
                        if (rawText.includes('.js') || rawText.includes('.ts')) isMatch = false;

                        if (isMatch) {
                            if (el.dataset.cdpAutoClicked === 'true') continue;

                            // Security: only click actual interactive elements
                            if (!isReviewPage && !isExpander) {
                                let safe = false;
                                if (el.tagName === 'BUTTON') safe = true;
                                try {
                                    const style = window.getComputedStyle(el);
                                    if (style.cursor === 'pointer') safe = true;
                                } catch(e) {}
                                if (!safe) continue;
                                if (el.closest('pre') || el.closest('code')) continue;
                            }

                            // Mark as clicked
                            el.dataset.cdpAutoClicked = 'true';
                            if (isExpander) { setTimeout(() => { el.dataset.cdpAutoClicked = 'false'; }, 2000); }

                            try {
                                el.click();
                                const rect = el.getBoundingClientRect();
                                const opts = {
                                    view: window, bubbles: true, cancelable: true,
                                    clientX: rect.left + rect.width / 2,
                                    clientY: rect.top + rect.height / 2,
                                    buttons: 1
                                };
                                el.dispatchEvent(new MouseEvent('mousedown', opts));
                                el.dispatchEvent(new MouseEvent('mouseup', opts));
                                el.dispatchEvent(new MouseEvent('click', opts));
                            } catch(e) {}

                            // Parent triggering for React synthetic events
                            let p = el.parentElement;
                            if (p) { p.click(); if (p.parentElement) p.parentElement.click(); }
                        }
                    }
                });
            })()
        `;
    }

    // ─── CDP Helpers ─────────────────────────────────────────

    private _getPages(port: number): Promise<any[]> {
        return new Promise((resolve) => {
            const req = http.get(
                { hostname: '127.0.0.1', port, path: '/json/list', timeout: 500 },
                (res) => {
                    let body = '';
                    res.on('data', (chunk: string) => (body += chunk));
                    res.on('end', () => {
                        try { resolve(JSON.parse(body)); }
                        catch { resolve([]); }
                    });
                }
            );
            req.on('error', () => resolve([]));
            req.on('timeout', () => { req.destroy(); resolve([]); });
        });
    }

    private _connectToPage(id: string, wsUrl: string): Promise<boolean> {
        return new Promise((resolve) => {
            const ws = new WebSocket(wsUrl);
            ws.on('open', () => {
                this._connections.set(id, ws);
                ws.send(JSON.stringify({ id: this._msgId++, method: 'Runtime.enable' }));
                resolve(true);
            });
            ws.on('error', () => resolve(false));
            ws.on('close', () => this._connections.delete(id));
        });
    }

    private _evaluate(ws: WebSocket, expression: string): Promise<void> {
        return new Promise((resolve) => {
            ws.send(
                JSON.stringify({
                    id: this._msgId++,
                    method: 'Runtime.evaluate',
                    params: { expression, userGesture: true, awaitPromise: true },
                })
            );
            resolve();
        });
    }

    // ─── Logging ─────────────────────────────────────────────

    private _log(message: string) {
        const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
        this._outputChannel.appendLine(`[${ts}] ${message}`);
    }
}
