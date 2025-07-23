function observeLogDeliveryButton() {
  const observer = new MutationObserver(() => {
    const btn = document.querySelector('.live_chatting_power_button__Ov3eJ');

    if (btn && btn.textContent.includes('통나무') && !btn.dataset.clicked) {
      console.log('[자동수령] 통나무 포인트 버튼 발견, 클릭!');
      btn.click();
      btn.dataset.clicked = "true";

      // 알림 요청
      chrome.runtime.sendMessage({
        type: "SHOW_NOTIFICATION",
        title: "통나무 포인트 자동 수령",
        message: "✅ 1시간 시청 보상 통나무 포인트를 수령했습니다!"
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log("[자동수령] 통나무 감시 시작");
}

observeLogDeliveryButton();
