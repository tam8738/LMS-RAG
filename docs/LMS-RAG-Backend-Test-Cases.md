# LMS-RAG Backend API - Test Case Document

**Generated:** 2026-07-03  
**Version:** 1.0  
**Scope:** Authentication, Course CRUD, Lecture CRUD, Permission

---

## Table of Contents

1. [Authentication API](#1-authentication-api)
2. [Course API](#2-course-api)
3. [Lecture API](#3-lecture-api)
4. [Test Execution Checklist](#4-test-execution-checklist)

---

## Prerequisites

### Create Test Users (SQL)

Run this SQL in PostgreSQL before testing:

```sql
-- Teacher (password = "password123")
INSERT INTO users (email, password, name, role, status)
VALUES ('teacher@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mqr9tm7Y1R2X7Z5V1F8Q3N.q5U1mK6G', 'Teacher A', 'TEACHER', 'ACTIVE');

-- Student (password = "password123")
INSERT INTO users (email, password, name, role, status)
VALUES ('student@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mqr9tm7Y1R2X7Z5V1F8Q3N.q5U1mK6G', 'Student A', 'STUDENT', 'ACTIVE');
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TEACHER_TOKEN` | JWT token from Teacher login |
| `STUDENT_TOKEN` | JWT token from Student login |
| `COURSE_ID` | ID of created course |
| `COURSE_CODE` | Auto-generated join code |
| `LECTURE_ID` | ID of created lecture |

---

## 1. Authentication API

### 1.1 Teacher Login

**Purpose:** Teacher dang nhap de lay JWT token.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `http://localhost:8080/api/v1/auth/login` |
| **Headers** | `Content-Type: application/json` |

**Request Body:**
```json
{
  "email": "teacher@test.com",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Dang nhap thanh cong"
}
```

**Note:** Save `token` to `TEACHER_TOKEN` environment variable.

---

### 1.2 Student Login

**Purpose:** Student dang nhap de lay JWT token.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `http://localhost:8080/api/v1/auth/login` |
| **Headers** | `Content-Type: application/json` |

**Request Body:**
```json
{
  "email": "student@test.com",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Dang nhap thanh cong"
}
```

**Note:** Save `token` to `STUDENT_TOKEN` environment variable.

---

## 2. Course API

### 2.1 Create Course (Teacher)

**Purpose:** Teacher tao course moi. He thong tu dong sinh courseCode duy nhat.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `http://localhost:8080/api/v1/courses` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |
| | `Content-Type: application/json` |

**Request Body:**
```json
{
  "name": "Lap trinh Java nang cao",
  "description": "Khoa hoc Spring Boot, JPA, Security",
  "status": "PRIVATE"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Lap trinh Java nang cao",
    "description": "Khoa hoc Spring Boot, JPA, Security",
    "courseCode": "A1B2C3D4",
    "status": "PRIVATE",
    "createdById": 1,
    "createdByName": "Teacher A",
    "createdAt": "2026-07-03T12:00:00Z",
    "updatedAt": "2026-07-03T12:00:00Z"
  },
  "message": "Tao khoa hoc thanh cong"
}
```

**Note:** Save `id` to `COURSE_ID` and `courseCode` to `COURSE_CODE`.

---

### 2.2 Get My Courses (Teacher)

**Purpose:** Teacher xem danh sach course do minh tao.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/courses` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Lap trinh Java nang cao",
      "courseCode": "A1B2C3D4",
      "status": "PRIVATE",
      "createdById": 1,
      "createdByName": "Teacher A"
    }
  ]
}
```

---

### 2.3 Get Course By ID (Teacher - Owner)

**Purpose:** Teacher xem chi tiet course do minh tao.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/courses/1` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Lap trinh Java nang cao",
    "courseCode": "A1B2C3D4",
    "status": "PRIVATE",
    "createdById": 1,
    "createdByName": "Teacher A",
    "createdAt": "2026-07-03T12:00:00Z",
    "updatedAt": "2026-07-03T12:00:00Z"
  }
}
```

---

### 2.4 Get Course By ID (Student - Not Joined → 403)

**Purpose:** Student chua join course → bi tu choi truy cap.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/courses/1` |
| **Headers** | `Authorization: Bearer {STUDENT_TOKEN}` |

**Expected Response (403):**
```json
{
  "success": false,
  "error": {
    "code": "COURSE_ACCESS_DENIED",
    "message": "You do not have permission to access this course"
  }
}
```

---

### 2.5 Student Join Course

**Purpose:** Student tham gia course bang ma lop.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `http://localhost:8080/api/v1/courses/join/A1B2C3D4` |
| **Headers** | `Authorization: Bearer {STUDENT_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Lap trinh Java nang cao",
    "courseCode": "A1B2C3D4",
    "status": "PRIVATE"
  },
  "message": "Tham gia khoa hoc thanh cong"
}
```

---

### 2.6 Get My Courses (Student - After Join)

**Purpose:** Student xem danh sach course da tham gia.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/courses` |
| **Headers** | `Authorization: Bearer {STUDENT_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Lap trinh Java nang cao",
      "courseCode": "A1B2C3D4",
      "status": "PRIVATE"
    }
  ]
}
```

---

### 2.7 Get Course By ID (Student - Joined)

**Purpose:** Student da join → duoc xem chi tiet course.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/courses/1` |
| **Headers** | `Authorization: Bearer {STUDENT_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Lap trinh Java nang cao",
    "courseCode": "A1B2C3D4",
    "status": "PRIVATE"
  }
}
```

---

### 2.8 Student Join Again (Duplicate → 400)

**Purpose:** Student join lai course da tham gia → loi.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `http://localhost:8080/api/v1/courses/join/A1B2C3D4` |
| **Headers** | `Authorization: Bearer {STUDENT_TOKEN}` |

**Expected Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "COURSE_MEMBER_ALREADY_JOINED",
    "message": "You have already joined this course"
  }
}
```

---

### 2.9 Update Course (Teacher)

**Purpose:** Teacher cap nhat course do minh tao.

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **URL** | `http://localhost:8080/api/v1/courses/1` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |
| | `Content-Type: application/json` |

**Request Body:**
```json
{
  "name": "Lap trinh Java nang cao - Da cap nhat",
  "description": "Them bai hoc ve Docker",
  "status": "PUBLISH"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Lap trinh Java nang cao - Da cap nhat",
    "description": "Them bai hoc ve Docker",
    "status": "PUBLISH",
    "courseCode": "A1B2C3D4"
  },
  "message": "Cap nhat khoa hoc thanh cong"
}
```

---

### 2.10 Delete Course (Teacher)

**Purpose:** Teacher xoa course do minh tao.

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **URL** | `http://localhost:8080/api/v1/courses/1` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Xoa khoa hoc thanh cong"
}
```

**Note:** Course da bi xoa. Can tao lai course truoc khi test Lecture API.

---

### 2.11 Create Course (Student → 403)

**Purpose:** Student khong co quyen tao course.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `http://localhost:8080/api/v1/courses` |
| **Headers** | `Authorization: Bearer {STUDENT_TOKEN}` |
| | `Content-Type: application/json` |

**Request Body:**
```json
{
  "name": "Hack course",
  "description": "Test"
}
```

**Expected Response (403):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access denied"
  }
}
```

---

## 3. Lecture API

**Note:** Tao lai course truoc khi test Lecture (vi course da bi xoa o test 2.10).

### 3.1 Create Lecture (Teacher)

**Purpose:** Teacher tao lecture trong course cua minh.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `http://localhost:8080/api/v1/lectures` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |
| | `Content-Type: application/json` |

**Request Body:**
```json
{
  "title": "Bai 1: Gioi thieu Spring Boot",
  "content": "Noi dung bai giang chi tiet ve Spring Boot...",
  "orderIndex": 1,
  "courseId": 1
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Bai 1: Gioi thieu Spring Boot",
    "content": "Noi dung bai giang chi tiet ve Spring Boot...",
    "orderIndex": 1,
    "courseId": 1,
    "courseName": "Lap trinh Java nang cao"
  },
  "message": "Tao bai giang thanh cong"
}
```

**Note:** Save `id` to `LECTURE_ID`.

---

### 3.2 Get Lectures By Course (Teacher)

**Purpose:** Teacher xem danh sach lecture trong course.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/lectures/course/1` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Bai 1: Gioi thieu Spring Boot",
      "orderIndex": 1,
      "courseId": 1,
      "courseName": "Lap trinh Java nang cao"
    }
  ]
}
```

---

### 3.3 Get Lectures By Course (Student - Joined)

**Purpose:** Student xem lecture trong course da tham gia.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/lectures/course/1` |
| **Headers** | `Authorization: Bearer {STUDENT_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Bai 1: Gioi thieu Spring Boot",
      "orderIndex": 1,
      "courseId": 1,
      "courseName": "Lap trinh Java nang cao"
    }
  ]
}
```

---

### 3.4 Get Lectures By Course (Student - Not Joined → 403)

**Purpose:** Student chua join course → bi tu choi.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/lectures/course/2` |
| **Headers** | `Authorization: Bearer {STUDENT_TOKEN}` |

**Expected Response (403):**
```json
{
  "success": false,
  "error": {
    "code": "COURSE_ACCESS_DENIED",
    "message": "You do not have permission to access this course"
  }
}
```

---

### 3.5 Get Lecture By ID

**Purpose:** Xem chi tiet mot lecture.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/v1/lectures/1` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Bai 1: Gioi thieu Spring Boot",
    "content": "Noi dung bai giang chi tiet ve Spring Boot...",
    "orderIndex": 1,
    "courseId": 1,
    "courseName": "Lap trinh Java nang cao"
  }
}
```

---

### 3.6 Update Lecture (Teacher)

**Purpose:** Teacher cap nhat lecture.

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **URL** | `http://localhost:8080/api/v1/lectures/1` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |
| | `Content-Type: application/json` |

**Request Body:**
```json
{
  "title": "Bai 1: Gioi thieu Spring Boot (Da cap nhat)",
  "content": "Noi dung moi...",
  "orderIndex": 1,
  "courseId": 1
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Bai 1: Gioi thieu Spring Boot (Da cap nhat)",
    "content": "Noi dung moi...",
    "orderIndex": 1,
    "courseId": 1,
    "courseName": "Lap trinh Java nang cao"
  },
  "message": "Cap nhat bai giang thanh cong"
}
```

---

### 3.7 Delete Lecture (Teacher)

**Purpose:** Teacher xoa lecture.

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **URL** | `http://localhost:8080/api/v1/lectures/1` |
| **Headers** | `Authorization: Bearer {TEACHER_TOKEN}` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Xoa bai giang thanh cong"
}
```

---

## 4. Test Execution Checklist

| # | Test Case | Role | Expected | Status |
|---|-----------|------|----------|--------|
| 1.1 | Teacher Login | Teacher | 200 + token | [ ] |
| 1.2 | Student Login | Student | 200 + token | [ ] |
| 2.1 | Create Course | Teacher | 200 + courseCode | [ ] |
| 2.2 | Get My Courses | Teacher | 200 + list | [ ] |
| 2.3 | Get Course By ID | Teacher | 200 | [ ] |
| 2.4 | Get Course By ID (not joined) | Student | 403 | [ ] |
| 2.5 | Join Course | Student | 200 | [ ] |
| 2.6 | Get My Courses (after join) | Student | 200 + has course | [ ] |
| 2.7 | Get Course By ID (joined) | Student | 200 | [ ] |
| 2.8 | Join Again | Student | 400 | [ ] |
| 2.9 | Update Course | Teacher | 200 | [ ] |
| 2.10 | Delete Course | Teacher | 200 | [ ] |
| 2.11 | Create Course | Student | 403 | [ ] |
| 3.1 | Create Lecture | Teacher | 200 | [ ] |
| 3.2 | Get Lectures By Course | Teacher | 200 | [ ] |
| 3.3 | Get Lectures By Course | Student | 200 | [ ] |
| 3.4 | Get Lectures (not joined) | Student | 403 | [ ] |
| 3.5 | Get Lecture By ID | Teacher | 200 | [ ] |
| 3.6 | Update Lecture | Teacher | 200 | [ ] |
| 3.7 | Delete Lecture | Teacher | 200 | [ ] |

---

## Notes

- **Chay test theo thu tu** tu tren xuong. Cac request sau dung bien tu request truoc.
- **Neu test 2.10 (Delete Course) chay truoc**, can tao lai course truoc khi test Lecture API.
- **Loi 500:** Kiem tra log Spring Boot de xem chi tiet.
- **N+1 Query:** Da fix bang `@EntityGraph`, chi con 1-2 query cho moi request.

---

## Architecture Notes

### Security Flow
```
Request → JwtAuthenticationFilter → @PreAuthorize → Service Layer (assertCourseAccess)
```

### N+1 Prevention
```
@EntityGraph(attributePaths = "course")     // LectureRepository
@EntityGraph(attributePaths = "createdBy")  // CourseRepository
```

### Mapper Pattern
```
Service → Mapper.toResponse(entity) → DTO → Controller → ApiResponse<T>
```
