function insertMemoButton() {
  if (document.getElementById("czp-memo-btn")) return;

  const target = document.querySelector(".live_chatting_input_send_button__8KBrn");
  if (!target || !target.parentElement) return;

  const btn = document.createElement("button");
  btn.id = "czp-memo-btn";
  btn.textContent = "📝 메모";
  btn.style.cssText = "margin-left:6px;padding:4px 8px;font-size:12px;cursor:pointer;";

  btn.onclick = () => {
    const existing = document.getElementById("czp-note-frame");
    if (existing) {
      existing.remove();
    } else {
      const baseURL = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL("note.html")
        : "note.html";

      const channel = location.pathname.split("/").pop() || "";

      const iframe = document.createElement("iframe");
      iframe.id = "czp-note-frame";
      iframe.src = `${baseURL}?channel=${channel}`;
      iframe.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        width: 300px;
        height: 400px;
        z-index: 99999;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(iframe);
    }
  };

  target.parentElement.appendChild(btn);
}

const observer = new MutationObserver(() => {
  const target = document.querySelector(".live_chatting_input_send_button__8KBrn");
  if (target && !document.getElementById("czp-memo-btn")) {
    insertMemoButton();
  }
});
observer.observe(document.body, { childList: true, subtree: true });



let currentChannel = location.pathname.split("/").pop() || "";

function checkChannelChange() {
  const newChannel = location.pathname.split("/").pop() || "";
  if (newChannel !== currentChannel) {
    currentChannel = newChannel;
    // 메모 iframe 제거
    const memoFrame = document.getElementById("czp-note-frame");
    if (memoFrame) {
      memoFrame.remove();
    }
  }
}

// 1초마다 채널 변경 체크 (필요에 따라 조절 가능)
setInterval(checkChannelChange, 1000);
