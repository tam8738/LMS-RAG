import { MOCK_USERS } from '../data/mockData';

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(email, password) {
  await delay();
  const found = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!found) {
    throw new Error('Tài khoản không tồn tại.');
  }
  // Standard mock password
  if (password !== '123456') {
    throw new Error('Mật khẩu không chính xác.');
  }
  return found;
}

export async function updateProfile(updatedUser) {
  await delay();
  return updatedUser;
}
