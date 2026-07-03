import { MOCK_USERS } from '../data/mockData';

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(email, password) {
  await delay();
  let usersList = MOCK_USERS;
  const saved = localStorage.getItem('edurag_users');
  if (saved) {
    try {
      usersList = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing edurag_users in authService', e);
    }
  } else {
    // Sync default mock users list with password
    usersList = MOCK_USERS.map((u) => ({
      ...u,
      password: '123456',
    }));
    localStorage.setItem('edurag_users', JSON.stringify(usersList));
  }

  const found = usersList.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!found) {
    throw new Error('Tài khoản không tồn tại. Vui lòng liên hệ Quản trị viên để được cung cấp.');
  }

  if (found.password !== password) {
    throw new Error('Mật khẩu không chính xác. Vui lòng thử lại.');
  }
  return found;
}

export async function updateProfile(updatedUser) {
  await delay();
  return updatedUser;
}
