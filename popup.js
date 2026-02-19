// popup.js - Phiên bản V12: Fix lỗi cú pháp xẹt và Diệt dấu cộng vô duyên

document.getElementById('btn-html').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes("gemini.google.com")) {
        document.getElementById('status').innerText = "❌ Mở Gemini lên bạn ơi!";
        document.getElementById('status').style.color = "red";
        return;
    }

    document.getElementById('status').innerText = "⏳ Đang xử lý...";

    chrome.tabs.sendMessage(tab.id, { action: "get_chat_html" }, (response) => {
        if (chrome.runtime.lastError) {
             document.getElementById('status').innerText = "⚠️ Hãy F5 (Tải lại) trang Gemini!";
             return;
        }
        if (!response || !response.result) {
            document.getElementById('status').innerText = "⚠️ Không tìm thấy nội dung!";
            return;
        }
        
        downloadHTML(response.result);
        document.getElementById('status').innerText = "✅ Đã tải xong!";
        document.getElementById('status').style.color = "green";
    });
});

document.getElementById('btn-copy').addEventListener('click', () => {
     document.getElementById('status').innerText = "Tính năng này tạm khóa ở bản Pro!";
});

function downloadHTML(data) {
    const chatArray = data.messages || []; 
    const pageTitle = data.title || "Gemini Chat Export";

    const cssStyle = `
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f4f9; margin: 0; padding: 40px 20px; color: #1f1f1f; }
            .chat-container { max-width: 900px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            h1 { text-align: center; color: #444; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 40px; font-size: 24px;}
            .msg-row { display: flex; margin-bottom: 30px; align-items: flex-start; }
            .msg-avatar { width: 36px; height: 36px; border-radius: 50%; margin-right: 15px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;}
            .msg-content { flex: 1; line-height: 1.6; font-size: 16px; overflow-x: hidden; min-width: 0;}
            .user .msg-avatar { background: #000; color: #fff; }
            .user .msg-content { background: #f2f2f2; padding: 12px 20px; border-radius: 20px; display: inline-block; }
            .gemini .msg-avatar { background: linear-gradient(135deg, #4285f4, #d96570); color: #fff; }
            .gemini .msg-content { padding: 0 5px; } 

            .code-wrapper { background-color: #1e1f20; border-radius: 8px; margin: 15px 0; overflow: hidden; border: 1px solid #444; }
            .code-header { display: flex; justify-content: space-between; align-items: center; background-color: #2b2d30; padding: 8px 16px; color: #e3e3e3; font-family: 'Segoe UI', sans-serif; font-size: 13px; font-weight: 500; border-bottom: 1px solid #3c4043; }
            .copy-btn { background: transparent; border: none; color: #a8c7fa; cursor: pointer; font-size: 12px; transition: color 0.2s; }
            .toggle-btn { background: transparent; border: none; color: #e3e3e3; cursor: pointer; margin-right: 8px; font-size: 12px; min-width: 20px; }
            pre { margin: 0; padding: 15px; overflow-x: auto; font-family: 'Consolas', monospace; background: transparent !important; color: #e3e3e3; }
            .code-wrapper.collapsed pre { display: none; }
            code { font-family: 'Consolas', monospace; }
            :not(pre) > code { background: #e0e0e0; color: #c7254e; padding: 2px 5px; border-radius: 4px; font-size: 0.9em; font-weight: bold;}
            img { max-width: 100%; border-radius: 8px; margin-top: 10px;}

            /* --- DIỆT DẤU CỘNG VÔ DUYÊN --- */
            sources-carousel-inline, .source-inline-chip-container, .source-footnote, .citation-button,
            button[aria-label*="source details"], button.multiple-button, .button-label,
            .mat-mdc-tooltip-trigger, mat-icon, svg { 
                display: none !important; 
            }
            
            .msg-content button, .msg-content span[role="button"] { 
                background: #fff !important; border: 1px solid #d0d7de !important; border-radius: 6px !important;
                padding: 4px 10px !important; margin: 5px 5px 5px 0 !important; color: #24292f !important;
                font-size: 13px !important; font-weight: 600 !important; display: inline-block !important; 
                cursor: default !important; text-decoration: none !important;
            }
        </style>
    `;

    const mathScripts = `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script>
            window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] } };
        </script>
        <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    `;

    const scriptInjection = `
        <script>
            document.addEventListener("DOMContentLoaded", function() {
                document.querySelectorAll('pre').forEach(pre => {
                    const wrapper = document.createElement('div'); 
                    wrapper.className = 'code-wrapper collapsed'; 
                    let langName = "Code";
                    const codeTag = pre.querySelector('code');
                    if (codeTag) {
                        const classes = Array.from(codeTag.classList);
                        const langClass = classes.find(c => c.startsWith('language-') || c.startsWith('lang-'));
                        if (langClass) langName = langClass.replace(/^(language-|lang-)/, '').toUpperCase();
                    }
                    const header = document.createElement('div');
                    header.className = 'code-header';
                    const leftSide = document.createElement('div');
                    leftSide.style.display = "flex"; leftSide.style.alignItems = "center";
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'toggle-btn'; toggleBtn.innerText = '▶'; 
                    const langLabel = document.createElement('span');
                    langLabel.innerText = langName; langLabel.style.cursor = "pointer";
                    langLabel.onclick = () => toggleBtn.click();
                    leftSide.appendChild(toggleBtn); leftSide.appendChild(langLabel);
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn'; copyBtn.innerText = '📋 Copy';
                    header.appendChild(leftSide); header.appendChild(copyBtn);
                    pre.parentNode.insertBefore(wrapper, pre);
                    wrapper.appendChild(header); wrapper.appendChild(pre);
                    toggleBtn.addEventListener('click', () => {
                        wrapper.classList.toggle('collapsed');
                        toggleBtn.innerText = wrapper.classList.contains('collapsed') ? '▶' : '▼';
                    });
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(pre.innerText).then(() => {
                            copyBtn.innerText = '✅ Copied!';
                            setTimeout(() => { copyBtn.innerText = '📋 Copy'; }, 2000);
                        });
                    });
                });
            });
        </script>
    `;

    let bodyContent = '<div class="chat-container"><h1>📜 ' + pageTitle + '</h1>';
    chatArray.forEach(item => {
        let avatar = item.type === 'user' ? '👤' : '✨';
        bodyContent += '<div class="msg-row ' + item.type + '"><div class="msg-avatar">' + avatar + '</div><div class="msg-content">' + item.content + '</div></div>';
    });
    bodyContent += '</div>';

    const fullHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + pageTitle + '</title>' + mathScripts + cssStyle + '</head><body>' + bodyContent + scriptInjection + '</body></html>';

    // Fix lỗi xẹt chỗ này cho chắc ăn nè
    const safeFileName = pageTitle
    .replace(/[\\/:*?"<>|]/g, "") 
    .trim()
    .replace(/\s+/g, "_"); 
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFileName + ".html";
    a.click();
    URL.revokeObjectURL(url);
}