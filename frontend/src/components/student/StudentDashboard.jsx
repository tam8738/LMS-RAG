import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { BookMarked, HelpCircle, TrendingUp, Clock, CheckCircle2, MessageSquare, ChevronRight, Play, FileText } from 'lucide-react';
import { MOCK_COURSES, MOCK_LECTURES, MOCK_QUIZZES } from '../../data/mockData';
const PRIMARY = '#6C4DF6';
const COURSE_PROGRESS = {
  c1: 72,
  c2: 45,
  c3: 30
};
const COURSE_COLORS = [{
  bg: 'linear-gradient(135deg,#6C4DF6,#9C7AF8)',
  letter: 'R'
}, {
  bg: 'linear-gradient(135deg,#10B981,#34D399)',
  letter: 'C'
}, {
  bg: 'linear-gradient(135deg,#F59E0B,#FCD34D)',
  letter: 'M'
}];
const RECENT_ACTIVITIES = [{
  icon: FileText,
  text: 'Đã đọc tóm tắt: State và Props trong React',
  course: 'Lập trình Web với React',
  time: '2 giờ trước',
  color: '#6C4DF6'
}, {
  icon: CheckCircle2,
  text: 'Hoàn thành Quiz: Giới thiệu React và JSX',
  course: 'Lập trình Web với React',
  time: '5 giờ trước',
  color: '#10B981'
}, {
  icon: MessageSquare,
  text: 'Hỏi đáp AI: Phân biệt State và Props',
  course: 'Lập trình Web với React',
  time: '1 ngày trước',
  color: '#F59E0B'
}, {
  icon: FileText,
  text: 'Đã đọc tóm tắt: Giới thiệu Machine Learning',
  course: 'Machine Learning Cơ bản',
  time: '2 ngày trước',
  color: '#6C4DF6'
}];
export default function StudentDashboard({
  user,
  navigate,
  enrolledIds
}) {
  const enrolledCourses = MOCK_COURSES.filter(c => enrolledIds.includes(c.id));
  const myLectures = MOCK_LECTURES.filter(l => enrolledIds.includes(l.courseId));
  const publishedQuizzes = MOCK_QUIZZES.filter(q => q.status === 'published' && myLectures.some(l => l.id === q.lectureId));
  const quizDoneCount = 12;
  const progressPct = 68;
  const continueCourse = MOCK_COURSES.find(c => c.id === 'c1');
  const continueColors = COURSE_COLORS[0];
  return /*#__PURE__*/_jsxs("div", {
    className: "p-6 max-w-6xl mx-auto",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "mb-6",
      children: [/*#__PURE__*/_jsxs("h1", {
        className: "text-h1",
        children: ["Xin ch\xE0o, ", user.name, " \uD83D\uDC4B"]
      }), /*#__PURE__*/_jsx("p", {
        className: "body-text mt-1",
        children: "Ch\xE0o m\u1EEBng tr\u1EDF l\u1EA1i! Ti\u1EBFp t\u1EE5c h\xE0nh tr\xECnh h\u1ECDc t\u1EADp c\u1EE7a b\u1EA1n h\xF4m nay."
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6",
      children: [{
        label: 'Khóa học của tôi',
        value: enrolledCourses.length,
        icon: BookMarked,
        bg: 'rgba(108,77,246,0.1)',
        iconColor: PRIMARY
      }, {
        label: 'Bài giảng đang học',
        value: myLectures.length,
        icon: TrendingUp,
        bg: 'rgba(16,185,129,0.1)',
        iconColor: '#10B981'
      }, {
        label: 'Quiz đã làm',
        value: quizDoneCount,
        icon: HelpCircle,
        bg: 'rgba(245,158,11,0.1)',
        iconColor: '#F59E0B'
      }, {
        label: 'Tiến độ học tập',
        value: `${progressPct}%`,
        icon: CheckCircle2,
        bg: 'rgba(239,68,68,0.1)',
        iconColor: '#EF4444'
      }].map(({
        label,
        value,
        icon: Icon,
        bg,
        iconColor
      }) => /*#__PURE__*/_jsxs("div", {
        className: "bg-white rounded-2xl border border-slate-200 p-5 shadow-sm",
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
          style: {
            background: bg
          },
          children: /*#__PURE__*/_jsx(Icon, {
            className: "w-5 h-5",
            style: {
              color: iconColor
            }
          })
        }), /*#__PURE__*/_jsx("div", {
          className: "stat-value",
          children: value
        }), /*#__PURE__*/_jsx("div", {
          className: "stat-label",
          children: label
        })]
      }, label))
    }), /*#__PURE__*/_jsxs("div", {
      className: "grid lg:grid-cols-3 gap-5",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden",
        children: [/*#__PURE__*/_jsx("div", {
          className: "flex items-center justify-between px-6 py-4",
          style: {
            borderBottom: '1px solid #f1f5f9'
          },
          children: /*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-2",
            children: [/*#__PURE__*/_jsx(Clock, {
              className: "w-4 h-4 text-slate-400"
            }), /*#__PURE__*/_jsx("h3", {
              className: "text-h4",
              children: "Ho\u1EA1t \u0111\u1ED9ng g\u1EA7n \u0111\xE2y"
            })]
          })
        }), /*#__PURE__*/_jsx("div", {
          className: "divide-y divide-slate-100",
          children: RECENT_ACTIVITIES.map((item, i) => /*#__PURE__*/_jsxs("div", {
            className: "flex items-start gap-4 px-6 py-4",
            children: [/*#__PURE__*/_jsx("div", {
              className: "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
              style: {
                background: `${item.color}18`
              },
              children: /*#__PURE__*/_jsx(item.icon, {
                className: "w-4 h-4",
                style: {
                  color: item.color
                }
              })
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex-1 min-w-0",
              children: [/*#__PURE__*/_jsx("p", {
                className: "text-slate-800",
                style: {
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  lineHeight: 1.4
                },
                children: item.text
              }), /*#__PURE__*/_jsx("p", {
                className: "text-slate-400 mt-0.5",
                style: {
                  fontSize: '0.75rem'
                },
                children: item.course
              })]
            }), /*#__PURE__*/_jsx("span", {
              className: "text-slate-400 flex-shrink-0",
              style: {
                fontSize: '0.6875rem'
              },
              children: item.time
            })]
          }, i))
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "space-y-4",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden",
          children: [/*#__PURE__*/_jsx("div", {
            className: "px-5 py-4",
            style: {
              borderBottom: '1px solid #f1f5f9'
            },
            children: /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-2",
              children: [/*#__PURE__*/_jsx(Play, {
                className: "w-4 h-4 text-slate-400"
              }), /*#__PURE__*/_jsx("h3", {
                className: "text-slate-800",
                children: "Ti\u1EBFp t\u1EE5c h\u1ECDc"
              })]
            })
          }), continueCourse && /*#__PURE__*/_jsxs("div", {
            className: "p-5",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "h-28 rounded-xl flex items-center justify-center mb-4 relative overflow-hidden",
              style: {
                background: continueColors.bg
              },
              children: [/*#__PURE__*/_jsx("div", {
                className: "text-white",
                style: {
                  fontSize: '3rem',
                  fontWeight: 800,
                  opacity: 0.9
                },
                children: continueColors.letter
              }), /*#__PURE__*/_jsxs("div", {
                className: "absolute bottom-2 left-3 right-3",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "h-1 bg-white/20 rounded-full overflow-hidden",
                  children: /*#__PURE__*/_jsx("div", {
                    className: "h-full bg-white rounded-full",
                    style: {
                      width: `${COURSE_PROGRESS[continueCourse.id]}%`
                    }
                  })
                }), /*#__PURE__*/_jsxs("div", {
                  className: "text-white/80 mt-1",
                  style: {
                    fontSize: '0.6875rem'
                  },
                  children: [COURSE_PROGRESS[continueCourse.id], "% ho\xE0n th\xE0nh"]
                })]
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "text-slate-900 mb-1",
              style: {
                fontSize: '0.9375rem',
                fontWeight: 600,
                lineHeight: 1.3
              },
              children: continueCourse.name
            }), /*#__PURE__*/_jsx("div", {
              className: "text-slate-500 mb-4",
              style: {
                fontSize: '0.8125rem'
              },
              children: "B\xE0i ti\u1EBFp theo: State v\xE0 Props trong React"
            }), /*#__PURE__*/_jsxs("button", {
              onClick: () => navigate('student-course-detail', {
                selectedCourseId: continueCourse.id
              }),
              className: "w-full flex items-center justify-center gap-2 text-white rounded-xl py-2.5 hover:opacity-90 transition-opacity",
              style: {
                background: PRIMARY,
                fontSize: '0.875rem',
                fontWeight: 600
              },
              children: [/*#__PURE__*/_jsx(Play, {
                className: "w-3.5 h-3.5"
              }), "Ti\u1EBFp t\u1EE5c h\u1ECDc"]
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex items-center justify-between px-5 py-3.5",
            style: {
              borderBottom: '1px solid #f1f5f9'
            },
            children: [/*#__PURE__*/_jsx("h3", {
              className: "text-slate-800",
              children: "Kh\xF3a h\u1ECDc"
            }), /*#__PURE__*/_jsxs("button", {
              onClick: () => navigate('student-courses'),
              className: "flex items-center gap-1 transition-colors",
              style: {
                fontSize: '0.8125rem',
                color: PRIMARY
              },
              children: ["Xem t\u1EA5t c\u1EA3 ", /*#__PURE__*/_jsx(ChevronRight, {
                className: "w-3.5 h-3.5"
              })]
            })]
          }), /*#__PURE__*/_jsx("div", {
            className: "divide-y divide-slate-100",
            children: enrolledCourses.map((course, idx) => {
              const clr = COURSE_COLORS[idx % COURSE_COLORS.length];
              const progress = COURSE_PROGRESS[course.id] ?? 0;
              return /*#__PURE__*/_jsxs("button", {
                onClick: () => navigate('student-course-detail', {
                  selectedCourseId: course.id
                }),
                className: "w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left",
                children: [/*#__PURE__*/_jsx("div", {
                  className: "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white",
                  style: {
                    background: clr.bg,
                    fontSize: '0.875rem',
                    fontWeight: 700
                  },
                  children: clr.letter
                }), /*#__PURE__*/_jsxs("div", {
                  className: "flex-1 min-w-0",
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-slate-800 truncate",
                    style: {
                      fontSize: '0.8125rem',
                      fontWeight: 500
                    },
                    children: course.name
                  }), /*#__PURE__*/_jsx("div", {
                    className: "h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden",
                    children: /*#__PURE__*/_jsx("div", {
                      className: "h-full rounded-full",
                      style: {
                        width: `${progress}%`,
                        background: PRIMARY
                      }
                    })
                  })]
                }), /*#__PURE__*/_jsxs("span", {
                  style: {
                    fontSize: '0.75rem',
                    color: PRIMARY,
                    fontWeight: 600
                  },
                  children: [progress, "%"]
                })]
              }, course.id);
            })
          })]
        })]
      })]
    })]
  });
}
