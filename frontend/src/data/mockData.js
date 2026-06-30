// Mock data converted from TypeScript to plain JavaScript

// ─── Users ────────────────────────────────────────────────────────────────────
export const MOCK_USERS = [
  { id: 'u1', name: 'Nguyễn Văn Khoa', email: 'teacher@edu.vn', role: 'teacher' },
  { id: 'u2', name: 'Trần Thị Lan', email: 'student@edu.vn', role: 'student' },
];

// ─── Courses ──────────────────────────────────────────────────────────────────
export const MOCK_COURSES = [
  {
    id: 'c1',
    name: 'Lập trình Web với React',
    description: 'Khóa học lập trình web hiện đại sử dụng React, Hooks, và các thư viện phổ biến.',
    courseCode: 'WEB2024A',
    teacherId: 'u1',
    studentCount: 28,
    createdAt: '2024-09-01',
  },
  {
    id: 'c2',
    name: 'Cấu trúc dữ liệu và Giải thuật',
    description: 'Nắm vững các cấu trúc dữ liệu cơ bản và giải thuật quan trọng trong lập trình.',
    courseCode: 'DSA2024B',
    teacherId: 'u1',
    studentCount: 32,
    createdAt: '2024-09-01',
  },
  {
    id: 'c3',
    name: 'Machine Learning Cơ bản',
    description: 'Giới thiệu các khái niệm và thuật toán cơ bản trong Machine Learning.',
    courseCode: 'ML2024C',
    teacherId: 'u1',
    studentCount: 20,
    createdAt: '2024-09-15',
  },
];

// ─── Lectures ─────────────────────────────────────────────────────────────────
export const MOCK_LECTURES = [
  { id: 'l1', courseId: 'c1', title: 'Giới thiệu React và JSX', description: 'Tổng quan về React, Virtual DOM và cú pháp JSX cơ bản', order: 1 },
  { id: 'l2', courseId: 'c1', title: 'State và Props trong React', description: 'Quản lý trạng thái và truyền dữ liệu giữa các components', order: 2 },
  { id: 'l3', courseId: 'c1', title: 'Hooks: useState, useEffect', description: 'Sử dụng React Hooks để quản lý state và side effects', order: 3 },
  { id: 'l4', courseId: 'c2', title: 'Mảng và Danh sách liên kết', description: 'Cấu trúc dữ liệu mảng và linked list, so sánh và ứng dụng', order: 1 },
  { id: 'l5', courseId: 'c2', title: 'Stack và Queue', description: 'Cấu trúc ngăn xếp và hàng đợi, các thuật toán liên quan', order: 2 },
  { id: 'l6', courseId: 'c3', title: 'Giới thiệu Machine Learning', description: 'Tổng quan về ML, supervised và unsupervised learning', order: 1 },
  { id: 'l7', courseId: 'c3', title: 'Linear Regression', description: 'Thuật toán hồi quy tuyến tính, gradient descent', order: 2 },
];

// ─── Documents ────────────────────────────────────────────────────────────────
export const MOCK_DOCUMENTS = [
  { id: 'd1', lectureId: 'l1', filename: 'react-intro.pdf', fileType: 'pdf', fileSize: '2.4 MB', status: 'processed', uploadedAt: '2024-09-05' },
  { id: 'd2', lectureId: 'l1', filename: 'jsx-cheatsheet.pdf', fileType: 'pdf', fileSize: '0.8 MB', status: 'processed', uploadedAt: '2024-09-05' },
  { id: 'd3', lectureId: 'l2', filename: 'state-props.pdf', fileType: 'pdf', fileSize: '1.5 MB', status: 'processing', uploadedAt: '2024-09-10' },
  { id: 'd4', lectureId: 'l3', filename: 'hooks-guide.pdf', fileType: 'pdf', fileSize: '3.2 MB', status: 'uploaded', uploadedAt: '2024-09-12' },
  { id: 'd5', lectureId: 'l4', filename: 'arrays-linkedlist.pdf', fileType: 'pdf', fileSize: '4.1 MB', status: 'processed', uploadedAt: '2024-09-06' },
  { id: 'd6', lectureId: 'l5', filename: 'stack-queue.pdf', fileType: 'pdf', fileSize: '2.9 MB', status: 'processed', uploadedAt: '2024-09-13' },
  { id: 'd7', lectureId: 'l6', filename: 'ml-overview.pdf', fileType: 'pdf', fileSize: '5.6 MB', status: 'failed', uploadedAt: '2024-09-16' },
  { id: 'd8', lectureId: 'l7', filename: 'linear-regression.pdf', fileType: 'pdf', fileSize: '3.8 MB', status: 'processed', uploadedAt: '2024-09-18' },
];

// ─── Summaries ────────────────────────────────────────────────────────────────
export const MOCK_SUMMARIES = [
  {
    id: 's1',
    lectureId: 'l1',
    content: `## Tóm tắt: Giới thiệu React và JSX

### 1. React là gì?
React là thư viện JavaScript mã nguồn mở do Facebook phát triển, dùng để xây dựng giao diện người dùng theo mô hình **component-based**. Điểm mạnh của React nằm ở khả năng cập nhật UI hiệu quả nhờ Virtual DOM.

### 2. Virtual DOM
Khi state thay đổi, React tạo Virtual DOM mới và so sánh với Virtual DOM cũ (quá trình gọi là **reconciliation**). Chỉ những phần DOM thực sự thay đổi mới được cập nhật, giúp tối ưu hiệu năng đáng kể.

### 3. JSX — JavaScript XML
JSX là cú pháp mở rộng cho phép viết HTML-like code trong JavaScript. Babel sẽ transpile JSX thành \`React.createElement()\` calls.

\`\`\`jsx
// JSX
const element = <h1 className="title">Hello, World!</h1>;

// Được biên dịch thành:
const element = React.createElement("h1", { className: "title" }, "Hello, World!");
\`\`\`

### 4. Khái niệm cốt lõi
| Khái niệm | Ý nghĩa |
|-----------|---------|
| **Component** | Đơn vị xây dựng UI, có thể tái sử dụng |
| **Props** | Dữ liệu từ component cha → con (read-only) |
| **State** | Dữ liệu nội bộ, trigger re-render khi thay đổi |
| **Rendering** | Quá trình React hiển thị UI lên màn hình |

### Điểm ôn tập quan trọng
- Dùng \`className\` thay vì \`class\` trong JSX
- Mỗi component phải trả về một root element duy nhất (hoặc Fragment)
- React khác jQuery: React quản lý state → UI; jQuery thao tác DOM trực tiếp`,
    status: 'published',
    generatedAt: '2024-09-06',
  },
  {
    id: 's2',
    lectureId: 'l4',
    content: `## Tóm tắt: Mảng và Danh sách liên kết

### 1. Mảng (Array)
Mảng lưu trữ các phần tử cùng kiểu liên tiếp trong bộ nhớ.

**Ưu điểm:** Truy cập ngẫu nhiên O(1), cache-friendly
**Nhược điểm:** Chèn/xóa O(n), kích thước cố định (static array)

### 2. Danh sách liên kết (Linked List)
Chuỗi các nodes, mỗi node chứa data và pointer đến node kế tiếp.

**Ưu điểm:** Chèn/xóa đầu O(1), kích thước động
**Nhược điểm:** Truy cập ngẫu nhiên O(n), overhead bộ nhớ cho pointer

### 3. Bảng so sánh
| Thao tác | Array | Linked List |
|----------|-------|-------------|
| Access by index | O(1) | O(n) |
| Insert đầu | O(n) | O(1) |
| Insert cuối | O(1)* | O(n) |
| Delete | O(n) | O(1)** |
| Memory | Compact | Extra pointer |

*Nếu có tail pointer; **Nếu biết node trước

### Khi nào dùng cái nào?
- **Array**: Truy cập nhiều, ít thêm/xóa, kích thước ổn định
- **Linked List**: Thêm/xóa nhiều ở đầu, kích thước động`,
    status: 'draft',
    generatedAt: '2024-09-07',
  },
  {
    id: 's3',
    lectureId: 'l7',
    content: `## Tóm tắt: Linear Regression

### 1. Định nghĩa
Linear Regression là thuật toán học có giám sát (supervised learning) dự đoán giá trị liên tục (continuous) từ một hoặc nhiều biến đầu vào.

### 2. Mô hình
**Simple Linear Regression:** y = wx + b

Trong đó: w = weight (hệ số góc), b = bias (hệ số chặn)

### 3. Cost Function
Mean Squared Error (MSE): J(w,b) = (1/2m) Σ(ŷᵢ - yᵢ)²

### 4. Gradient Descent
Thuật toán tối ưu hóa để tìm w và b tối thiểu hóa J:
- w := w - α * ∂J/∂w
- b := b - α * ∂J/∂b

Với α là learning rate.`,
    status: 'published',
    generatedAt: '2024-09-19',
  },
];

// ─── Quizzes ──────────────────────────────────────────────────────────────────
export const MOCK_QUIZZES = [
  {
    id: 'q1',
    lectureId: 'l1',
    title: 'Quiz: Giới thiệu React và JSX',
    status: 'published',
    generatedAt: '2024-09-07',
    questions: [
      {
        id: 'qq1',
        type: 'multiple_choice',
        question: 'Virtual DOM trong React có tác dụng chính là gì?',
        options: [
          'Thay thế hoàn toàn DOM thực của trình duyệt',
          'Tối ưu hiệu năng bằng cách chỉ cập nhật phần DOM thực sự thay đổi',
          'Lưu trữ toàn bộ trạng thái của ứng dụng',
          'Xử lý các sự kiện click và keyboard',
        ],
        correctAnswer: 'Tối ưu hiệu năng bằng cách chỉ cập nhật phần DOM thực sự thay đổi',
        explanation: 'Virtual DOM là bản sao nhẹ của DOM thực. React so sánh (diffing) Virtual DOM cũ và mới, sau đó chỉ cập nhật những nodes thực sự thay đổi, giảm thiểu DOM manipulation tốn kém.',
      },
      {
        id: 'qq2',
        type: 'multiple_choice',
        question: 'Trong JSX, để áp dụng CSS class cho một element, ta sử dụng attribute nào?',
        options: ['class', 'className', 'cssClass', 'styleClass'],
        correctAnswer: 'className',
        explanation: '"class" là từ khóa reserved trong JavaScript nên JSX sử dụng "className" để tránh xung đột. Khi compiled, "className" sẽ được map thành attribute "class" trong HTML.',
      },
      {
        id: 'qq3',
        type: 'multiple_choice',
        question: 'JSX được biên dịch thành gì trong quá trình build?',
        options: ['HTML thuần túy', 'React.createElement() calls', 'CSS styles', 'TypeScript interfaces'],
        correctAnswer: 'React.createElement() calls',
        explanation: 'Babel transpile JSX thành React.createElement() calls. Ví dụ: <h1>Hello</h1> → React.createElement("h1", null, "Hello").',
      },
      {
        id: 'qq4',
        type: 'short_answer',
        question: 'Giải thích sự khác biệt giữa Props và State trong React?',
        correctAnswer: 'Props là dữ liệu truyền từ component cha xuống con (read-only từ góc nhìn component con). State là dữ liệu nội bộ của component, có thể thay đổi và khi thay đổi sẽ trigger re-render.',
        explanation: 'Props = external/immutable từ component nhận; State = internal/mutable, component tự quản lý. Đây là kiến trúc một chiều (one-way data flow) của React.',
      },
    ],
  },
  {
    id: 'q2',
    lectureId: 'l4',
    title: 'Quiz: Mảng và Danh sách liên kết',
    status: 'draft',
    generatedAt: '2024-09-08',
    questions: [
      {
        id: 'qq5',
        type: 'multiple_choice',
        question: 'Độ phức tạp thời gian của truy cập phần tử theo index trong mảng là?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        correctAnswer: 'O(1)',
        explanation: 'Mảng lưu liên tiếp trong bộ nhớ. Địa chỉ phần tử = base + index × size → tính trực tiếp trong O(1).',
      },
      {
        id: 'qq6',
        type: 'multiple_choice',
        question: 'Khi nào nên ưu tiên dùng Linked List hơn Array?',
        options: [
          'Khi cần truy cập ngẫu nhiên thường xuyên',
          'Khi cần chèn/xóa nhiều ở đầu danh sách',
          'Khi cần cache-friendly performance',
          'Khi kích thước dữ liệu cố định',
        ],
        correctAnswer: 'Khi cần chèn/xóa nhiều ở đầu danh sách',
        explanation: 'Linked List có O(1) insert/delete ở đầu (chỉ thay đổi pointer). Array cần dịch toàn bộ phần tử → O(n).',
      },
    ],
  },
  {
    id: 'q3',
    lectureId: 'l7',
    title: 'Quiz: Linear Regression',
    status: 'published',
    generatedAt: '2024-09-20',
    questions: [
      {
        id: 'qq7',
        type: 'multiple_choice',
        question: 'Trong Linear Regression, Cost Function MSE được sử dụng để làm gì?',
        options: [
          'Đo độ chính xác của model trên tập test',
          'Đo mức độ sai lệch giữa giá trị dự đoán và thực tế để tối ưu',
          'Chuẩn hóa dữ liệu đầu vào',
          'Tính learning rate tối ưu',
        ],
        correctAnswer: 'Đo mức độ sai lệch giữa giá trị dự đoán và thực tế để tối ưu',
        explanation: 'MSE = (1/2m)Σ(ŷ-y)². Gradient Descent tìm w,b để minimize MSE, từ đó model fit dữ liệu tốt nhất.',
      },
      {
        id: 'qq8',
        type: 'multiple_choice',
        question: 'Learning rate (α) trong Gradient Descent quá lớn sẽ gây ra hiện tượng gì?',
        options: [
          'Model học nhanh hơn và chính xác hơn',
          'Thuật toán hội tụ chậm',
          'Thuật toán có thể không hội tụ (oscillate hoặc diverge)',
          'Overfitting',
        ],
        correctAnswer: 'Thuật toán có thể không hội tụ (oscillate hoặc diverge)',
        explanation: 'Learning rate lớn → bước nhảy lớn → có thể vượt qua minimum → oscillate hoặc diverge. Cần tune α phù hợp.',
      },
    ],
  },
];

// ─── Chat history ─────────────────────────────────────────────────────────────
export const MOCK_CHAT = {
  l1: [
    {
      id: 'ch1',
      role: 'user',
      content: 'React Component là gì và tại sao nó quan trọng?',
      timestamp: '2024-09-10T09:30:00',
    },
    {
      id: 'ch2',
      role: 'assistant',
      content: `React Component là khối xây dựng cơ bản của mọi ứng dụng React. Một component là hàm hoặc class JavaScript trả về React elements mô tả UI sẽ hiển thị.

**Component quan trọng vì:**
1. **Tái sử dụng** — Viết một lần, dùng nhiều nơi
2. **Encapsulation** — Mỗi component tự chứa logic và UI
3. **Dễ test** — Test từng component độc lập
4. **Teamwork** — Các developer làm việc song song trên các component khác nhau`,
      citations: [
        {
          id: 'cit1',
          text: 'Components let you split the UI into independent, reusable pieces, and think about each piece in isolation...',
          page: 3,
          documentName: 'react-intro.pdf',
        },
        {
          id: 'cit2',
          text: 'Component-based architecture giúp code dễ maintain và scale khi ứng dụng phát triển theo thời gian...',
          page: 5,
          documentName: 'react-intro.pdf',
        },
      ],
      timestamp: '2024-09-10T09:30:15',
    },
  ],
  l7: [
    {
      id: 'ch3',
      role: 'user',
      content: 'Gradient Descent hoạt động như thế nào?',
      timestamp: '2024-09-20T14:00:00',
    },
    {
      id: 'ch4',
      role: 'assistant',
      content: `Gradient Descent là thuật toán tối ưu hóa lặp để tìm minimum của một hàm số.

**Cơ chế:**
1. Bắt đầu với w, b ngẫu nhiên
2. Tính gradient (đạo hàm) của Cost Function
3. Cập nhật: w := w - α × ∂J/∂w
4. Lặp lại đến khi hội tụ

**Learning rate α quan trọng:**
- Quá nhỏ → hội tụ chậm
- Quá lớn → có thể không hội tụ`,
      citations: [
        {
          id: 'cit3',
          text: 'Gradient descent is an optimization algorithm used to minimize the cost function by iteratively moving in the direction of steepest descent...',
          page: 12,
          documentName: 'linear-regression.pdf',
        },
      ],
      timestamp: '2024-09-20T14:00:20',
    },
  ],
};

// Student's enrolled course IDs
export const STUDENT_ENROLLED_IDS = ['c1', 'c2'];
