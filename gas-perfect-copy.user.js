// ==UserScript==
// @name         Google AI Studio - Perfect Copy
// @namespace    http://tampermonkey.net/
// @version      10.0.0
// @description  A clean, optimized script to copy markdown from Google AI Studio. Fixes LaTeX, removes redirect URLs, formats code blocks, and cleans up whitespaces/newlines.
// @author       Jessica939
// @match        https://aistudio.google.com/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/turndown/7.1.2/turndown.min.js
// @run-at       document-end
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/Jessica939/google-ai-studio-copy/main/gas-perfect-copy.user.js
// @downloadURL  https://raw.githubusercontent.com/Jessica939/google-ai-studio-copy/main/gas-perfect-copy.user.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Security: Initialize Trusted Types for strict CSP compatibility
     */
    if (window.trustedTypes?.createPolicy && !window.trustedTypes.defaultPolicy) {
        try {
            window.trustedTypes.createPolicy('default', {
                createHTML: (s) => s,
                createScriptURL: (s) => s,
                createScript: (s) => s,
            });
        } catch (e) { /* ignore */ }
    }

    /**
     * UI: Toast Notification Manager
     */
    const Notification = {
        element: null,
        init() {
            GM_addStyle(`
                .gas-copy-toast {
                    position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-150%);
                    background: #2e7d32; color: white; padding: 12px 24px; border-radius: 8px;
                    font-family: 'Google Sans', sans-serif; font-size: 14px; font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 2147483647;
                    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
                    display: flex; align-items: center; gap: 8px;
                }
                .gas-copy-toast.show { transform: translateX(-50%) translateY(0); }
            `);
            this.element = document.createElement('div');
            this.element.className = 'gas-copy-toast';
            this.element.innerHTML = '<span>✨</span> 完美排版已复制';
            document.body.appendChild(this.element);
        },
        show() {
            if (!this.element) this.init();
            this.element.classList.add('show');
            setTimeout(() => this.element.classList.remove('show'), 2000);
        }
    };

    /**
     * Core: Turndown Service Initialization
     */
    const getTurndownService = () => {
        const service = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            hr: '---',
            bulletListMarker: '-',
            emDelimiter: '*',
        });

        // Ignore UI buttons/icons
        service.addRule('ignoreUI', {
            filter: (node) => {
                const cls = node.className || '';
                return typeof cls === 'string' && (cls.includes('material-icons') || cls.includes('mat-icon') || cls.includes('action-button'));
            },
            replacement: () => ''
        });

        // Format inline code properly
        service.addRule('inlineCode', {
            filter: (node) => node.nodeName === 'CODE' && node.parentNode.nodeName !== 'PRE',
            replacement: (content) => `\`${content.trim()}\``
        });

        return service;
    };

    const turndownService = getTurndownService();

    /**
     * Core: Cleans up the DOM before converting to Markdown
     * Handles KaTeX blocks, unneeded code wrappers, and Google URL redirects
     */
    const cleanDom = (root) => {
        // Unpack KaTeX elements
        root.querySelectorAll('.katex').forEach(node => {
            const annotation = node.querySelector('annotation');
            if (annotation) {
                const latex = annotation.textContent.trim();
                node.replaceWith(document.createTextNode(` $${latex}$ `));
            }
        });

        // Resolve code vs math block conflicts
        root.querySelectorAll('pre, code').forEach(block => {
            const text = block.textContent;
            const hasMath = text.includes('$');
            const looksLikeCode = /def |return |import |console\.log/.test(text);
            const hasLangClass = block.className?.includes('language-');

            if (hasMath && !looksLikeCode && !hasLangClass) {
                const span = document.createElement('span');
                span.append(...block.childNodes);
                block.replaceWith(span);
            }
        });

        // Clean Google redirect URLs
        root.querySelectorAll('a').forEach(a => {
            try {
                const url = new URL(a.href);
                if (url.hostname.includes('google.com') && url.pathname === '/url') {
                    const realUrl = url.searchParams.get('q');
                    if (realUrl) a.href = realUrl;
                }
            } catch (e) { /* ignore invalid URLs */ }
        });

        return root;
    };

    /**
     * Core: Post-processes the markdown string (Unescapes LaTeX, formats layout)
     */
    const postProcessMarkdown = (markdown) => {
        // Unescape LaTeX characters modified by Turndown
        let result = markdown.replace(/(\$\$?)([\s\S]*?)\1/g, (match, delimiter, content) => {
            const unescaped = content
                .replace(/\\_/g, '_')
                .replace(/\\\[/g, '[')
                .replace(/\\\]/g, ']')
                .replace(/\\\\/g, '\\')
                .replace(/\\\*/g, '*')
                .replace(/\\\{/g, '{')
                .replace(/\\\}/g, '}')
                .replace(/\\&/g, '&')
                .replace(/\\#/g, '#');
            return delimiter + unescaped + delimiter;
        });

        // Format whitespaces, spacing, and layout
        return result
            .replace(/\u00A0/g, ' ')                                      // 1. Convert non-breaking spaces
            .replace(/\n[ \t]+(?=\n)/g, '\n')                             // 2. Remove ghost empty lines
            .replace(/\n[ \t]*\n+([ \t]*[-*+]\s|[ \t]*\d+\.\s)/g, '\n$1') // 3. Compress loose lists
            .replace(/\n{3,}/g, '\n\n')                                   // 4. Enforce standard paragraph spacing
            .trim();
    };

    /**
     * Entry Point: Main copy interceptor
     */
    document.addEventListener('copy', (e) => {
        const activeEl = document.activeElement;
        const isInput = ['TEXTAREA', 'INPUT'].includes(activeEl.tagName) || activeEl.isContentEditable;
        if (isInput) return;

        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return;

        // Ignore if selecting inside a preformatted code block
        let parentNode = selection.getRangeAt(0).commonAncestorContainer;
        if (parentNode.nodeType === Node.TEXT_NODE) parentNode = parentNode.parentNode;
        if (parentNode.closest('pre')) return;

        e.preventDefault();
        e.stopPropagation();

        const container = document.createElement('div');
        for (let i = 0; i < selection.rangeCount; i++) {
            container.appendChild(selection.getRangeAt(i).cloneContents());
        }

        try {
            cleanDom(container);
            const rawMarkdown = turndownService.turndown(container);
            const finalMarkdown = postProcessMarkdown(rawMarkdown);

            if (e.clipboardData) {
                e.clipboardData.setData('text/plain', finalMarkdown);
            } else {
                GM_setClipboard(finalMarkdown, 'text');
            }

            Notification.show();
        } catch (err) {
            console.error('[GAS Perfect Copy] Copy failed, falling back to default:', err);
            e.clipboardData.setData('text/plain', selection.toString());
        }
    }, true);

})();
