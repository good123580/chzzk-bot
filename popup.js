document.addEventListener('DOMContentLoaded', () => {
  const statusContainer = document.getElementById('statusContainer');
  const idInput = document.getElementById('channelIdInput');
  const nameInput = document.getElementById('channelNameInput');
  const addBtn = document.getElementById('addBtn');
  const toggleCheckbox = document.getElementById("toggleNotification");
  const searchInput = document.getElementById('searchInput'); // 검색 input 추가

  if (!statusContainer || !idInput || !nameInput || !addBtn || !toggleCheckbox || !searchInput) {
    console.error("❌ 필수 DOM 요소를 찾을 수 없습니다.");
    return;
  }

  chrome.storage.sync.get("notificationsEnabled", ({ notificationsEnabled }) => {
    toggleCheckbox.checked = notificationsEnabled !== false;
  });

  toggleCheckbox.addEventListener("change", () => {
    chrome.storage.sync.set({ notificationsEnabled: toggleCheckbox.checked });
  });

  function getStatusText(status) {
    switch (status) {
      case "OPEN":
      case "LIVE":
      case "STARTING":
      case "ON_AIR":
      case "LIVE_RESERVE":
        return "🔴ON";
      case "CLOSE":
        return "⚫OFF";  
      case "SKIPPED":
        return "❓스킵됨";
      case "ERROR":
        return "❗오류";
      default:
        return `❔ ${status || "알 수 없음"}`;
    }
  }

  function renderChannels() {
    chrome.runtime.sendMessage({ action: 'getLiveStatuses' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusContainer.textContent = "⚠️ 방송 상태 불러오기 실패";
        return;
      }

      const {
        liveStatuses = {},
        followerCounts = {},
        channelImages = {},
      } = response;

      chrome.storage.sync.get("watchedChannels", ({ watchedChannels }) => {
        let channels = watchedChannels || [];

        // 검색어 필터링
        const searchKeyword = searchInput.value.trim().toLowerCase();
        if (searchKeyword) {
          channels = channels.filter(ch => ch.name.toLowerCase().includes(searchKeyword));
        }

        const liveList = ["OPEN", "LIVE", "STARTING", "ON_AIR", "LIVE_RESERVE"];
        channels.sort((a, b) => {
          const aLive = liveList.includes(liveStatuses[a.id]);
          const bLive = liveList.includes(liveStatuses[b.id]);
          return aLive === bLive ? 0 : aLive ? -1 : 1;
        });

        statusContainer.innerHTML = "";

        if (channels.length === 0) {
          statusContainer.textContent = "검색된 채널이 없습니다.";
          return;
        }

        for (const channel of channels) {
          const status = liveStatuses[channel.id] || "로딩 중";
          const followerCount = followerCounts[channel.id];
          const imageUrl = channelImages[channel.id] || "https://via.placeholder.com/24";

          const item = document.createElement("div");
          item.classList.add("channel-item");

          const profileImg = document.createElement("img");
          profileImg.src = imageUrl;
          profileImg.alt = "프로필";
          profileImg.classList.add("profile-img");

          const statusIcon = document.createElement("span");
          statusIcon.innerHTML = getStatusText(status);
          statusIcon.classList.add("status-icon");

          const nameSpan = document.createElement("span");
          nameSpan.textContent = channel.name;
          nameSpan.classList.add("channel-name-main");

          const followerSpan = document.createElement("span");
          followerSpan.textContent = `팔로우 ${typeof followerCount === "number" ? followerCount.toLocaleString() : "로딩..."}`;
          followerSpan.classList.add("channel-info-secondary");

          const notifyCheckbox = document.createElement("input");
          notifyCheckbox.type = "checkbox";
          notifyCheckbox.checked = channel.notify !== false;
          notifyCheckbox.classList.add("notify-checkbox");
          notifyCheckbox.addEventListener("change", () => {
            channel.notify = notifyCheckbox.checked;
            chrome.storage.sync.set({ watchedChannels: channels });
          });

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "삭제";
          deleteBtn.classList.add("delete-btn");
          deleteBtn.addEventListener("click", () => {
            if (!confirm(`'${channel.name}' 채널을 삭제할까요?`)) return;
            const filtered = channels.filter(c => c.id !== channel.id);
            chrome.storage.sync.set({ watchedChannels: filtered }, () => {
              chrome.runtime.sendMessage({ action: 'removeChannelCache', channelId: channel.id });
              renderChannels();
            });
          });

          item.append(profileImg, statusIcon, nameSpan, followerSpan, notifyCheckbox, deleteBtn);
          statusContainer.appendChild(item);
        }
      });
    });
  }

  addBtn.addEventListener("click", () => {
    const id = idInput.value.trim().toLowerCase();
    const name = nameInput.value.trim();
    if (!id || !name) return alert("채널 ID와 이름을 입력하세요.");

    chrome.storage.sync.get("watchedChannels", ({ watchedChannels }) => {
      const channels = watchedChannels || [];
      if (channels.some(c => c.id === id)) return alert("이미 등록된 채널입니다.");

      chrome.runtime.sendMessage({ action: 'removeChannelCache', channelId: id });

      channels.push({ id, name, notify: true });
      chrome.storage.sync.set({ watchedChannels: channels }, () => {
        idInput.value = "";
        nameInput.value = "";
        renderChannels();
      });
    });
  });

  // 드래그 스크롤 구현 (마우스)
  let isDragging = false;
  let startX;
  let scrollLeft;

  statusContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    statusContainer.classList.add('dragging');
    startX = e.pageX - statusContainer.offsetLeft;
    scrollLeft = statusContainer.scrollLeft;
  });

  statusContainer.addEventListener('mouseleave', () => {
    isDragging = false;
    statusContainer.classList.remove('dragging');
  });

  statusContainer.addEventListener('mouseup', () => {
    isDragging = false;
    statusContainer.classList.remove('dragging');
  });

  statusContainer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - statusContainer.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도 조절 가능
    statusContainer.scrollLeft = scrollLeft - walk;
  });

  // 터치 이벤트도 추가 (모바일 지원)
  statusContainer.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].pageX - statusContainer.offsetLeft;
    scrollLeft = statusContainer.scrollLeft;
  });

  statusContainer.addEventListener('touchend', () => {
    isDragging = false;
  });

  statusContainer.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - statusContainer.offsetLeft;
    const walk = (x - startX) * 2;
    statusContainer.scrollLeft = scrollLeft - walk;
  });

  // 검색 input 이벤트 등록
  searchInput.addEventListener('input', () => {
    renderChannels();
  });

  renderChannels();
  setInterval(renderChannels, 5000); // 5초마다 갱신
});

document.getElementById('toggleSectionBtn').addEventListener('click', () => {
  const content = document.getElementById('channelContent');
  const isCollapsed = content.classList.toggle('collapsed');

  // 접근성용 aria-expanded 속성 업데이트
  document.getElementById('toggleSectionBtn').setAttribute('aria-expanded', !isCollapsed);
});



