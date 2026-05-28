# ✨ Google AI Studio - Perfect Copy

A Tampermonkey userscript that elegantly fixes the copy-paste experience in Google AI Studio, preserving formatting, math equations, and cleaning up useless metadata.

## 🌟 核心功能 (Features)

- 📐 **LaTeX 公式完美修复**：自动解析底层 KaTeX 节点，还原为标准的 `$$` 或 `$` Markdown 语法。
- 🔗 **解除 Google 重定向链接**：自动清理 `google.com/url?q=` 这种烦人的重定向包装，还原真实原始链接。
- 🧹 **精简排版与空行**：自动压缩多余的幽灵空行，将松散的列表和段落重新整合为标准、紧凑的 Markdown 格式。
- 💻 **代码块保护**：智能区分行内代码与代码块，防止包含数学符号的代码被误格式化。
- 🔔 **无感体验**：提供轻量级的绿底 Toast 弹窗提示，不打断原生操作。

## 📦 安装指南 (Installation)

1. 首先确保你的浏览器安装了 [Tampermonkey](https://www.tampermonkey.net/) 插件。
2. 点击下方的链接直接安装脚本：
   
   👉 **[点击这里安装脚本](https://raw.githubusercontent.com/Jessica939/google-ai-studio-copy/main/gas-perfect-copy.user.js)**

## 🛠️ 技术栈
- Vanilla JavaScript
- [Turndown.js](https://github.com/mixmark-io/turndown) (用于 HTML 到 Markdown 的转换)

## 📄 License
MIT License
