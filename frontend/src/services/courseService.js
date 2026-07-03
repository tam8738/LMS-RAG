import { MOCK_COURSES, STUDENT_ENROLLED_IDS } from '../data/mockData';

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getCourses() {
  await delay();
  return [...MOCK_COURSES];
}

export async function createCourse(course) {
  await delay();
  return course;
}

export async function getEnrolledCourses() {
  await delay();
  return [...STUDENT_ENROLLED_IDS];
}

export async function joinCourse(courseId) {
  await delay();
  return courseId;
}
