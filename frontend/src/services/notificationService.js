const delay = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getNotifications(userId, defaults = []) {
  await delay();
  const saved = localStorage.getItem(`user_notifications_${userId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse notifications', e);
    }
  }
  localStorage.setItem(`user_notifications_${userId}`, JSON.stringify(defaults));
  return defaults;
}

export async function saveNotifications(userId, notifications) {
  await delay();
  localStorage.setItem(`user_notifications_${userId}`, JSON.stringify(notifications));
}
