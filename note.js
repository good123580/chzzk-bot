const urlParams = new URLSearchParams(window.location.search);
const channel = urlParams.get("channel") || "default";
const storageKey = `czpMemos_${channel}`;

const noteInput = document.getElementById("note");
const saveBtn = document.getElementById("saveBtn");
const memoList = document.getElementById("memoList");
const toast = document.getElementById("toast");

// 대체 복사 함수 (구형 브라우저 대응)
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";  // 화면에 보이지 않도록
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showToast("복사되었습니다!");
    } else {
      alert("복사에 실패했습니다.");
    }
  } catch (err) {
    alert("복사에 실패했습니다.");
  }

  document.body.removeChild(textArea);
}

// 복사 시도 함수
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast("복사되었습니다!"))
      .catch(() => fallbackCopyTextToClipboard(text));
  } else {
    fallbackCopyTextToClipboard(text);
  }
}

// 저장된 메모 불러오기 및 렌더링
function loadMemos() {
  const memos = JSON.parse(localStorage.getItem(storageKey) || "[]");
  memoList.innerHTML = "";

  memos.forEach((text, index) => {
    const div = document.createElement("div");
    div.className = "memo-item";

    const span = document.createElement("div");
    span.className = "memo-text";
    span.textContent = text;

    // 클릭 시 복사
    span.onclick = () => copyText(text);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "X"; 
    delBtn.title = "삭제"; 
    delBtn.onclick = () => deleteMemo(index);

    div.appendChild(span);
    div.appendChild(delBtn);
    memoList.appendChild(div);
  });
}

// 메모 저장
saveBtn.onclick = () => {
  const text = noteInput.value.trim();
  if (!text) return;

  const memos = JSON.parse(localStorage.getItem(storageKey) || "[]");
  memos.unshift(text); // 최신 메모가 위에 오도록
  localStorage.setItem(storageKey, JSON.stringify(memos));
  noteInput.value = "";
  loadMemos();
};

// 메모 삭제
function deleteMemo(index) {
  const memos = JSON.parse(localStorage.getItem(storageKey) || "[]");
  memos.splice(index, 1);
  localStorage.setItem(storageKey, JSON.stringify(memos));
  loadMemos();
}

// 토스트 메시지 표시
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 1500);
}

// 초기 로드 시 메모 불러오기
loadMemos();
