import { useState } from 'react';

export default function useAuth({ onLogin, onLogout } = {}) {
  const [user, setUser] = useState(null);

  const handleLogin = (u) => {
    const savedUser = localStorage.getItem(`user_profile_${u.id}`);
    let loggedInUser;
    if (savedUser) {
      loggedInUser = JSON.parse(savedUser);
    } else {
      const savedAvatar = localStorage.getItem(`user_avatar_${u.id}`);
      // Generate randomized IDs for new accounts to prevent collisions
      const randomNum = Math.floor(100 + Math.random() * 900);
      const defaults = {
        ...u,
        phone: u.role === 'teacher' ? '0912345678' : '0987654321',
        studentId: u.role === 'teacher' ? `GV-10${randomNum}` : `B21DCCN${randomNum}`,
        department: u.role === 'teacher' ? 'Khoa Khoa học Máy tính' : 'Công nghệ Thông tin',
        address: '97 Man Thiện, Quận 9, TP. Hồ Chí Minh',
        avatar: savedAvatar || null,
      };
      loggedInUser = defaults;
      localStorage.setItem(`user_profile_${u.id}`, JSON.stringify(defaults));
    }
    setUser(loggedInUser);
    if (onLogin) {
      onLogin(loggedInUser);
    }
  };

  const handleLogout = () => {
    setUser(null);
    if (onLogout) {
      onLogout();
    }
  };

  const handleUpdateProfile = (updatedUser) => {
    if (!user) return;
    setUser(updatedUser);
    localStorage.setItem(`user_profile_${updatedUser.id}`, JSON.stringify(updatedUser));
  };

  return {
    user,
    handleLogin,
    handleLogout,
    handleUpdateProfile,
  };
}
