import { useState, useEffect } from 'react';

const DEFAULT_TEACHER_NOTIFICATIONS = [
  {
    id: 1,
    icon: 'BookOpenCheck',
    color: '#6C4DF6',
    title: 'Tài liệu đã xử lý xong',
    desc: 'Bài giảng "Hooks nâng cao" đã sẵn sàng',
    time: '5 phút trước',
    read: false
  },
  {
    id: 2,
    icon: 'MessageSquare',
    color: '#0EA5E9',
    title: 'Sinh viên đặt câu hỏi mới',
    desc: 'Nguyễn Thị A hỏi về useEffect trong Web2024A',
    time: '20 phút trước',
    read: false
  },
  {
    id: 3,
    icon: 'Award',
    color: '#F59E0B',
    title: 'Quiz được hoàn thành',
    desc: '15/28 sinh viên đã nộp Quiz #2',
    time: '1 giờ trước',
    read: true
  },
  {
    id: 4,
    icon: 'BookMarked',
    color: '#10B981',
    title: 'Sinh viên mới tham gia',
    desc: '3 sinh viên đăng ký khóa DSA2024B',
    time: '2 giờ trước',
    read: true
  }
];

const DEFAULT_STUDENT_NOTIFICATIONS = [
  {
    id: 1,
    icon: 'BookOpenCheck',
    color: '#6C4DF6',
    title: 'Tóm tắt mới được đăng',
    desc: 'GV vừa publish tóm tắt bài "Hooks nâng cao"',
    time: '10 phút trước',
    read: false
  },
  {
    id: 2,
    icon: 'Award',
    color: '#F59E0B',
    title: 'Quiz mới đã mở',
    desc: 'Quiz #3 môn Lập trình Web đang chờ bạn',
    time: '30 phút trước',
    read: false
  },
  {
    id: 3,
    icon: 'MessageSquare',
    color: '#0EA5E9',
    title: 'AI đã trả lời',
    desc: 'Câu hỏi của bạn về useCallback đã có phản hồi',
    time: '1 giờ trước',
    read: true
  }
];

export default function useNotifications(user) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      const savedNotifs = localStorage.getItem(`user_notifications_${user.id}`);
      if (savedNotifs) {
        try {
          setNotifications(JSON.parse(savedNotifs));
        } catch (e) {
          console.error('Failed to parse notifications', e);
          const defaults = user.role === 'teacher' ? DEFAULT_TEACHER_NOTIFICATIONS : DEFAULT_STUDENT_NOTIFICATIONS;
          setNotifications(defaults);
        }
      } else {
        const defaults = user.role === 'teacher' ? DEFAULT_TEACHER_NOTIFICATIONS : DEFAULT_STUDENT_NOTIFICATIONS;
        setNotifications(defaults);
        localStorage.setItem(`user_notifications_${user.id}`, JSON.stringify(defaults));
      }
    } else {
      setNotifications([]);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`user_notifications_${user.id}`, JSON.stringify(notifications));
    }
  }, [notifications, user?.id]);

  const addNotification = (title, desc, icon, color) => {
    if (!user) return;
    const newNotif = {
      id: Date.now(),
      icon,
      color,
      title,
      desc,
      time: 'Vừa xong',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  return {
    notifications,
    setNotifications,
    addNotification
  };
}
