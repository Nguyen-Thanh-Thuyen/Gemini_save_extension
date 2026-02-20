// content.js - Phiên bản V18: Đã fix lỗi nhận diện ảnh tiếng Việt

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_chat_html") {
    const data = scrapeChatHTML();
    sendResponse({ result: data });
  }
});

// Hàm bỏ dấu tiếng Việt (giữ nguyên logic cũ)
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
}

// --- [LOGIC QUÉT TEXT DUMP] ---
function getTitleFromTextDump() {
    const fullText = document.body.innerText;
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (let i = 0; i < Math.min(lines.length, 30); i++) {
        const currentLine = lines[i];
        if (currentLine === "Gemini") {
            if (i + 1 < lines.length) {
                let candidate = lines[i+1];
                if (candidate === "Advanced" || candidate === "PRO") {
                    if (i + 2 < lines.length) {
                        return lines[i+2]; 
                    }
                }
                if (candidate.length > 2) {
                    return candidate;
                }
            }
        }
    }
    return null; 
}

// Hàm Backup lấy câu hỏi đầu
function getFirstUserQuery() {
    const blocks = document.querySelectorAll('.user-query, [data-test-id="user-query"], div[data-message-id]');
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].querySelector('.model-response') || blocks[i].classList.contains('model-response')) continue;
        let text = blocks[i].innerText.replace(/\n/g, " ").trim();
        if (text.length > 5) return text.substring(0, 50);
    }
    return "Cuoc_tro_chuyen_Gemini";
}

function scrapeChatHTML() {
  // --- BƯỚC 1: LẤY TÊN ĐỂ LÀM PREFIX ---
  let rawTitle = getTitleFromTextDump();
  
  if (!rawTitle || rawTitle.length < 1) {
      rawTitle = getFirstUserQuery();
  }
  
  // 1. Bỏ dấu tiếng Việt
  // let safeTitle = removeVietnameseTones(rawTitle);
  
  // 2. Xử lý tên cho sạch đẹp:
  let filePrefix = rawTitle
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, '_'); // Thay thế cụm khoảng trắng bằng 1 dấu gạch dưới duy nhất
  
  // Cắt ngắn nếu tên quá dài (để cỡ chừng 40 ký tự là đẹp)
  if (filePrefix.length > 40) filePrefix = filePrefix.substring(0, 40);
  
  // Nếu hổng lấy được tên thì đặt mặc định
  if (!filePrefix || filePrefix.length < 2) filePrefix = "Anh_Gemini";

  // --- BƯỚC 2: QUÉT TIN NHẮN ---
  let chatData = [];
  let lastPureText = ""; 
  let imgGlobalCount = 1; // Biến đếm số thứ tự ảnh

  const blocks = document.querySelectorAll('.markdown, [class*="user-query"], [data-test-id="user-query"]');
  const allBlocks = blocks.length > 0 ? blocks : document.querySelectorAll('div[data-message-id]');

  if (allBlocks.length > 0) {
      allBlocks.forEach((block) => {
        if (block.offsetParent === null) return;

        let checkClone = block.cloneNode(true);
        checkClone.querySelectorAll('button, span[role="button"]').forEach(n => n.remove());
        let currentPureText = checkClone.innerText.trim();

        if (currentPureText === lastPureText || currentPureText.length < 1) return;
        lastPureText = currentPureText;

        let type = "user"; 
        if (block.classList.contains('markdown') || block.querySelector('.markdown') || block.innerHTML.includes('model-response')) {
            type = "gemini";
        }

        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = block.innerHTML;

        // --- PHẦN QUAN TRỌNG: XỬ LÝ ẢNH ---
        const images = tempDiv.querySelectorAll('img');
        images.forEach(img => {
            let altText = img.getAttribute('alt') || "";
            
            // FIX Ở ĐÂY: Thêm điều kiện check tiếng Việt
            let isUserUpload = altText === "Uploaded image preview" || altText === "Bản xem trước hình ảnh đã tải lên";

            // Logic bỏ qua icon rác
            if (altText.toLowerCase().includes("icon")) return;
            if ((img.closest('button') || img.closest('span[role="button"]')) && !isUserUpload) return;

            // Đặt tên file = Tên cuộc trò chuyện + số thứ tự
            let finalName = `${filePrefix}_${imgGlobalCount}`;
            imgGlobalCount++; // Tăng số thứ tự lên

            // Tạo nhãn hiển thị tên file
            const fileLabel = document.createElement('div'); 
            fileLabel.style.cssText = "display: block; background: #e8f0fe; color: #1967d2; padding: 5px 10px; border-radius: 4px; font-size: 13px; font-weight: bold; margin: 8px 0; border: 1px dashed #1967d2; width: fit-content; font-family: monospace;";
            // Hiển thị tên file.png cho bạn dễ thấy
            fileLabel.innerHTML = `🖼️ FILE: [${finalName}.png]`;
            
            // Chèn nhãn lên trước tấm hình
            img.parentNode.insertBefore(fileLabel, img);
            
            // Gán lại alt và title để sau này cần thì dùng
            img.setAttribute('alt', finalName);
            img.setAttribute('title', finalName);
            
            // Style lại cho ảnh gọn đẹp
            img.style.display = "block";
            img.style.maxWidth = "100%";
            img.style.border = "1px solid #ccc";
        });

        // Cleanup mấy nút dư thừa
        const buttons = tempDiv.querySelectorAll('button, span[role="button"]');
        buttons.forEach(btn => {
            if (btn.innerText.trim().length === 0 && btn.querySelectorAll('img').length === 0) btn.remove();
        });

        chatData.push({
            type: type,
            content: tempDiv.innerHTML
        });
      });
  }

  return {
      messages: chatData,
      title: rawTitle 
  };
}