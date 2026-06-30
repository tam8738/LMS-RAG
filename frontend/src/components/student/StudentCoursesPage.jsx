import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import { Search, Plus, BookOpen, Users, Hash, CheckCircle2, ChevronRight } from 'lucide-react';
import { MOCK_COURSES, MOCK_LECTURES, MOCK_USERS } from '../../data/mockData';
const PRIMARY = '#6C4DF6';

const COURSE_VISUALS = {
  c1: {
    gradient: 'linear-gradient(135deg, #6C4DF6, #9C7AF8)',
    from: '#6C4DF6',
    to: '#9C7AF8',
    letter: 'R'
  },
  c2: {
    gradient: 'linear-gradient(135deg, #10B981, #34D399)',
    from: '#10B981',
    to: '#34D399',
    letter: 'C'
  },
  c3: {
    gradient: 'linear-gradient(135deg, #F59E0B, #FCD34D)',
    from: '#F59E0B',
    to: '#FCD34D',
    letter: 'M'
  }
};

const getCourseVisuals = (courseId, courseName) => {
  if (COURSE_VISUALS[courseId]) {
    return COURSE_VISUALS[courseId];
  }
  const colors = [
    { from: '#6C4DF6', to: '#9C7AF8' },
    { from: '#10B981', to: '#34D399' },
    { from: '#F59E0B', to: '#FCD34D' },
    { from: '#EF4444', to: '#F87171' },
    { from: '#0EA5E9', to: '#38BDF8' }
  ];
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return {
    gradient: `linear-gradient(135deg, ${color.from}, ${color.to})`,
    from: color.from,
    to: color.to,
    letter: courseName ? courseName.charAt(0).toUpperCase() : '?'
  };
};

const getInstructorName = (teacherId) => {
  const savedProfile = localStorage.getItem(`user_profile_${teacherId}`);
  if (savedProfile) {
    try {
      const parsed = JSON.parse(savedProfile);
      if (parsed && parsed.name) return parsed.name;
    } catch (e) {
      console.error(e);
    }
  }
  const mockUser = MOCK_USERS.find(u => u.id === teacherId);
  return mockUser ? mockUser.name : 'Nguyễn Văn Khoa';
};
const COURSE_PROGRESS = {
  c1: 72,
  c2: 45,
  c3: 30
};
export default function StudentCoursesPage({
  navigate,
  enrolledIds,
  onJoinCourse
}) {
  const [search, setSearch] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const enrolledCourses = MOCK_COURSES.filter(c => enrolledIds.includes(c.id));
  const filtered = enrolledCourses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.courseCode.toLowerCase().includes(search.toLowerCase()));
  const handleJoin = e => {
    e.preventDefault();
    const found = MOCK_COURSES.find(c => c.courseCode.toLowerCase() === joinCode.trim().toLowerCase());
    if (!found) {
      setJoinError('Không tìm thấy khóa học với mã này');
      return;
    }
    if (enrolledIds.includes(found.id)) {
      setJoinError('Bạn đã tham gia khóa học này rồi');
      return;
    }
    onJoinCourse(found.id);
    setJoinSuccess(`Đã tham gia: ${found.name}`);
    setJoinCode('');
    setJoinError('');
    setTimeout(() => {
      setJoinSuccess('');
      setShowJoin(false);
    }, 2000);
  };
  return /*#__PURE__*/_jsxs("div", {
    className: "p-6 max-w-6xl mx-auto",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "mb-6",
      children: [/*#__PURE__*/_jsx("h1", {
        className: "text-h1",
        children: "Kh\xF3a h\u1ECDc c\u1EE7a t\xF4i"
      }), /*#__PURE__*/_jsxs("p", {
        className: "body-text mt-1",
        children: ["B\u1EA1n \u0111ang theo h\u1ECDc ", enrolledCourses.length, " kh\xF3a h\u1ECDc"]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex flex-col sm:flex-row gap-3 mb-6",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "relative flex-1",
        children: [/*#__PURE__*/_jsx(Search, {
          className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        }), /*#__PURE__*/_jsx("input", {
          value: search,
          onChange: e => setSearch(e.target.value),
          className: "w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 bg-white focus:outline-none focus:ring-2 transition",
          style: {
            fontSize: '0.875rem'
          },
          onFocus: e => e.target.style.boxShadow = `0 0 0 2px ${PRIMARY}33`,
          onBlur: e => e.target.style.boxShadow = 'none',
          placeholder: "T\xECm ki\u1EBFm kh\xF3a h\u1ECDc..."
        })]
      }), /*#__PURE__*/_jsxs("button", {
        onClick: () => setShowJoin(true),
        className: "flex items-center gap-2 text-white rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity flex-shrink-0",
        style: {
          background: PRIMARY,
          fontSize: '0.875rem',
          fontWeight: 500
        },
        children: [/*#__PURE__*/_jsx(Plus, {
          className: "w-4 h-4"
        }), "Tham gia kh\xF3a h\u1ECDc"]
      })]
    }), filtered.length === 0 ? /*#__PURE__*/_jsxs("div", {
      className: "flex flex-col items-center justify-center py-20 text-center",
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4",
        children: /*#__PURE__*/_jsx(BookOpen, {
          className: "w-8 h-8 text-slate-300"
        })
      }), /*#__PURE__*/_jsx("h3", {
        className: "text-slate-700 mb-2",
        children: "Ch\u01B0a c\xF3 kh\xF3a h\u1ECDc n\xE0o"
      }), /*#__PURE__*/_jsx("p", {
        className: "text-slate-400 mb-6",
        style: {
          fontSize: '0.875rem'
        },
        children: "Nh\u1EADp m\xE3 l\u1EDBp do gi\u1EA3ng vi\xEAn cung c\u1EA5p \u0111\u1EC3 tham gia"
      }), /*#__PURE__*/_jsxs("button", {
        onClick: () => setShowJoin(true),
        className: "flex items-center gap-2 text-white rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity",
        style: {
          background: PRIMARY
        },
        children: [/*#__PURE__*/_jsx(Plus, {
          className: "w-4 h-4"
        }), "Tham gia kh\xF3a h\u1ECDc \u0111\u1EA7u ti\xEAn"]
      })]
    }) : /*#__PURE__*/_jsx("div", {
      className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-5",
      children: filtered.map((course, idx) => {
        const visuals = getCourseVisuals(course.id, course.name);
        const instructor = getInstructorName(course.teacherId);
        const lectures = MOCK_LECTURES.filter(l => l.courseId === course.id);
        const progress = COURSE_PROGRESS[course.id] ?? 0;
        const completedCount = Math.round(lectures.length * progress / 100);
        return /*#__PURE__*/_jsxs("div", {
          className: "bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer group",
          onClick: () => navigate('student-course-detail', {
            selectedCourseId: course.id
          }),
          children: [/*#__PURE__*/_jsxs("div", {
            className: "h-32 relative flex items-center justify-center",
            style: {
              background: visuals.gradient
            },
            children: [/*#__PURE__*/_jsx("div", {
              className: "text-white",
              style: {
                fontSize: '3.5rem',
                fontWeight: 800,
                opacity: 0.9
              },
              children: visuals.letter
            }), /*#__PURE__*/_jsx("div", {
              className: "absolute top-3 right-3 bg-white/20 rounded-lg px-2.5 py-1",
              children: /*#__PURE__*/_jsx("span", {
                className: "text-white",
                style: {
                  fontSize: '0.6875rem',
                  fontWeight: 700
                },
                children: course.courseCode
              })
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "p-5",
            children: [/*#__PURE__*/_jsx("h3", {
              className: "text-slate-900 mb-1 group-hover:text-[#6C4DF6] transition-colors",
              style: {
                fontSize: '0.9375rem',
                fontWeight: 600,
                lineHeight: 1.35
              },
              children: course.name
            }), /*#__PURE__*/_jsxs("p", {
              className: "text-slate-500 mb-1",
              style: {
                fontSize: '0.8125rem'
              },
              children: ["GV: ", instructor]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-3 mb-4 text-slate-400",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-1.5",
                children: [/*#__PURE__*/_jsx(BookOpen, {
                  className: "w-3.5 h-3.5"
                }), /*#__PURE__*/_jsxs("span", {
                  style: {
                    fontSize: '0.75rem'
                  },
                  children: [lectures.length, " b\xE0i gi\u1EA3ng"]
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "flex items-center gap-1.5",
                children: [/*#__PURE__*/_jsx(Users, {
                  className: "w-3.5 h-3.5"
                }), /*#__PURE__*/_jsxs("span", {
                  style: {
                    fontSize: '0.75rem'
                  },
                  children: [course.studentCount, " h\u1ECDc vi\xEAn"]
                })]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "mb-4",
              children: [/*#__PURE__*/_jsxs("div", {
                className: "flex justify-between mb-1.5",
                children: [/*#__PURE__*/_jsxs("span", {
                  className: "text-slate-500",
                  style: {
                    fontSize: '0.75rem'
                  },
                  children: [completedCount, "/", lectures.length, " b\xE0i ho\xE0n th\xE0nh"]
                }), /*#__PURE__*/_jsxs("span", {
                  style: {
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: PRIMARY
                  },
                  children: [progress, "%"]
                })]
              }), /*#__PURE__*/_jsx("div", {
                className: "h-1.5 bg-slate-100 rounded-full overflow-hidden",
                children: /*#__PURE__*/_jsx("div", {
                  className: "h-full rounded-full transition-all",
                  style: {
                    width: `${progress}%`,
                    background: PRIMARY
                  }
                })
              })]
            }), /*#__PURE__*/_jsxs("button", {
              onClick: e => {
                e.stopPropagation();
                navigate('student-course-detail', {
                  selectedCourseId: course.id
                });
              },
              className: "w-full flex items-center justify-center gap-1.5 text-white rounded-xl py-2.5 hover:opacity-90 transition-opacity",
              style: {
                background: PRIMARY,
                fontSize: '0.875rem',
                fontWeight: 500
              },
              children: ["Xem chi ti\u1EBFt", /*#__PURE__*/_jsx(ChevronRight, {
                className: "w-4 h-4"
              })]
            })]
          })]
        }, course.id);
      })
    }), showJoin && /*#__PURE__*/_jsx("div", {
      className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
      children: /*#__PURE__*/_jsxs("div", {
        className: "bg-white rounded-2xl shadow-2xl w-full max-w-md",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "px-6 py-5 border-b border-slate-100",
          children: [/*#__PURE__*/_jsx("h2", {
            className: "text-slate-900",
            children: "Tham gia kh\xF3a h\u1ECDc"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-slate-500 mt-1",
            style: {
              fontSize: '0.875rem'
            },
            children: "Nh\u1EADp m\xE3 l\u1EDBp do gi\u1EA3ng vi\xEAn cung c\u1EA5p"
          })]
        }), /*#__PURE__*/_jsxs("form", {
          onSubmit: handleJoin,
          className: "p-6",
          children: [/*#__PURE__*/_jsx("label", {
            className: "block text-slate-700 mb-2",
            style: {
              fontSize: '0.875rem',
              fontWeight: 500
            },
            children: "M\xE3 l\u1EDBp"
          }), /*#__PURE__*/_jsxs("div", {
            className: "relative mb-3",
            children: [/*#__PURE__*/_jsx(Hash, {
              className: "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            }), /*#__PURE__*/_jsx("input", {
              value: joinCode,
              onChange: e => {
                setJoinCode(e.target.value);
                setJoinError('');
              },
              className: "w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none uppercase",
              style: {
                fontSize: '0.9375rem',
                letterSpacing: '0.1em',
                fontFamily: 'monospace'
              },
              placeholder: "VD: ML2024C",
              autoFocus: true
            })]
          }), joinError && /*#__PURE__*/_jsx("p", {
            className: "text-red-500 mb-3",
            style: {
              fontSize: '0.8125rem'
            },
            children: joinError
          }), joinSuccess && /*#__PURE__*/_jsxs("p", {
            className: "mb-3 flex items-center gap-1.5 text-emerald-600",
            style: {
              fontSize: '0.8125rem'
            },
            children: [/*#__PURE__*/_jsx(CheckCircle2, {
              className: "w-4 h-4"
            }), " ", joinSuccess]
          }), /*#__PURE__*/_jsx("div", {
            className: "bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4",
            children: /*#__PURE__*/_jsxs("p", {
              className: "text-blue-700",
              style: {
                fontSize: '0.8125rem'
              },
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Demo:"
              }), " Th\u1EED m\xE3 ", /*#__PURE__*/_jsx("code", {
                className: "bg-blue-100 px-1.5 py-0.5 rounded font-mono",
                children: "ML2024C"
              }), " \u0111\u1EC3 tham gia kh\xF3a Machine Learning"]
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex gap-3",
            children: [/*#__PURE__*/_jsx("button", {
              type: "button",
              onClick: () => {
                setShowJoin(false);
                setJoinError('');
                setJoinCode('');
              },
              className: "flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 hover:bg-slate-50 transition-colors",
              style: {
                fontSize: '0.875rem'
              },
              children: "H\u1EE7y"
            }), /*#__PURE__*/_jsx("button", {
              type: "submit",
              className: "flex-1 text-white rounded-xl py-2.5 hover:opacity-90 transition-opacity",
              style: {
                background: PRIMARY,
                fontSize: '0.875rem',
                fontWeight: 500
              },
              children: "Tham gia"
            })]
          })]
        })]
      })
    })]
  });
}
