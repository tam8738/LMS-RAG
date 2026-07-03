import { useState } from 'react';
import { MOCK_COURSES, STUDENT_ENROLLED_IDS } from '../data/mockData';

export default function useCourses({ navigate } = {}) {
  const [courses, setCourses] = useState(MOCK_COURSES);
  const [enrolledIds, setEnrolledIds] = useState(STUDENT_ENROLLED_IDS);

  const handleCreateCourse = (course) => {
    setCourses(prev => [...prev, course]);
    if (navigate) {
      navigate('teacher-course-detail', { selectedCourseId: course.id });
    }
  };

  const handleJoinCourse = (courseId) => {
    setEnrolledIds(prev => {
      if (prev.includes(courseId)) return prev;
      return [...prev, courseId];
    });
  };

  return {
    courses,
    enrolledIds,
    handleCreateCourse,
    handleJoinCourse,
  };
}
