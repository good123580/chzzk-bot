const liveStatusList = ["OPEN", "LIVE", "STARTING", "ON_AIR", "LIVE_RESERVE"];
const previousStatusMap = {};
const liveFlagMap = {};
const lastNotificationMap = {};
const errorCountMap = {};
const skipUntilMap = {};
const followerCountMap = {};         // 팔로워 수 저장용
const channelImageUrlMap = {};       // 프로필 이미지 URL 저장용
const DEFAULT_CHANNEL_IMAGE = "default_icon.png"; // ✅ 기본 프로필 이미지

// 상태 체크
async function checkStatus(channelId) {
  try {
    const now = Date.now();

    if (skipUntilMap[channelId] && now < skipUntilMap[channelId]) {
      return "SKIPPED";
    }

    const res = await fetch(`https://api.chzzk.naver.com/service/v1/channels/${channelId}`);
    const data = await res.json();

    console.log(`[${channelId}] API 응답:`, data);

    let status = "CLOSE";
    const openLive = data?.content?.openLive;
    const followerCount = data?.content?.followerCount;
    const channelImageUrl = data?.content?.channelImageUrl;

    if (typeof openLive === "boolean") {
      status = openLive ? "OPEN" : "CLOSE";
    } else if (typeof openLive === "object" && openLive.status) {
      status = openLive.status;
    }

    if (typeof followerCount === "number") {
      followerCountMap[channelId] = followerCount;
    }

    if (typeof channelImageUrl === "string" && channelImageUrl.trim() !== "") {
      channelImageUrlMap[channelId] = channelImageUrl;
    } else {
      channelImageUrlMap[channelId] = DEFAULT_CHANNEL_IMAGE; // ✅ 대체 이미지 적용
    }

    errorCountMap[channelId] = 0;
    return status;

  } catch (e) {
    console.error(`[${channelId}] 상태 확인 실패`, e);

    errorCountMap[channelId] = (errorCountMap[channelId] || 0) + 1;
    if (errorCountMap[channelId] >= 5) {
      skipUntilMap[channelId] = Date.now() + 3 * 60 * 1000;
      console.warn(`[${channelId}] 연속 오류로 3분간 상태 확인 중단`);
    }

    return "ERROR";
  }
}

// 상태 감시 및 알림
async function pollChannels() {
  const { watchedChannels = [], notificationsEnabled = true } = await new Promise((resolve) =>
    chrome.storage.sync.get(["watchedChannels", "notificationsEnabled"], resolve)
  );

  const masterNotiEnabled = Boolean(notificationsEnabled);

  for (const channel of watchedChannels) {
    const status = await checkStatus(channel.id);
    if (status === "SKIPPED" || status === "ERROR") continue;

    const wasLive = liveFlagMap[channel.id] === true;
    const isLive = liveStatusList.includes(status);

    previousStatusMap[channel.id] = status;
    liveFlagMap[channel.id] = isLive;

    const perChannelNotify = channel.notify !== false;
    if (!masterNotiEnabled || !perChannelNotify) continue;

    if (!wasLive && isLive) {
      const now = Date.now();
      const lastNotified = lastNotificationMap[channel.id] || 0;

      if (now - lastNotified >= 60000) {
        chrome.notifications.create(`live_${channel.id}_${now}`, {
          type: "basic",
          iconUrl: "icon.png",
          title: `📢 ${channel.name} 방송 시작!`,
          message: "방송이 시작되었습니다. 지금 보러 가세요!",
          priority: 2
        });

        lastNotificationMap[channel.id] = now;
        console.log(`[${channel.id}] 방송 시작 알림 전송됨`);
      }
    }
  }
}

// 알림 클릭 시 방송 페이지 열기
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("live_")) {
    const parts = notificationId.split('_');
    const channelId = parts[1];
    const url = `https://chzzk.naver.com/live/${channelId}`;
    chrome.tabs.create({ url });
    chrome.notifications.clear(notificationId);
  }
});

// 상태 주기적 체크 시작
setInterval(pollChannels, 10000);
pollChannels();

// 메시지 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getLiveStatuses") {
    const resultChannelImages = {};

    for (const id in previousStatusMap) {
      const imgUrl = channelImageUrlMap[id];
      resultChannelImages[id] = (typeof imgUrl === "string" && imgUrl.trim() !== "")
        ? imgUrl
        : DEFAULT_CHANNEL_IMAGE; // ✅ 대체 이미지 처리
    }

    sendResponse({
      liveStatuses: previousStatusMap,
      followerCounts: followerCountMap,
      channelImages: resultChannelImages
    });
    return true;
  }

  if (message.action === "removeChannelCache" && message.channelId) {
    const id = message.channelId;
    delete previousStatusMap[id];
    delete liveFlagMap[id];
    delete lastNotificationMap[id];
    delete errorCountMap[id];
    delete skipUntilMap[id];
    delete followerCountMap[id];
    delete channelImageUrlMap[id];
    console.log(`[${id}] 채널 캐시 초기화 완료`);
    return true;
  }

  if (message.type === "SHOW_NOTIFICATION") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: message.title,
      message: message.message,
      priority: 1
    });
  }
});
