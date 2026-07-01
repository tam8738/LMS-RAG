import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { ArrowLeft, FileText, MessageSquare, HelpCircle, Users, BookOpen } from 'lucide-react';
const PRIMARY = '#6C4DF6';
const COURSE_META = {
  c1: {
    gradient: 'linear-gradient(135deg,#6C4DF6,#9C7AF8)',
    letter: 'R',
    instructor: 'Nguyễn Văn Khoa',
    description: 'Khóa học giúp bạn xây dựng ứng dụng web hiện đại bằng React từ cơ bản đến nâng cao.'
  },
  c2: {
    gradient: 'linear-gradient(135deg,#10B981,#34D399)',
    letter: 'C',
    instructor: 'Trần Minh Đức',
    description: 'Nắm vững các cấu trúc dữ liệu và giải thuật nền tảng trong khoa học máy tính.'
  },
  c3: {
    gradient: 'linear-gradient(135deg,#F59E0B,#FCD34D)',
    letter: 'M',
    instructor: 'Lê Thu Hà',
    description: 'Giới thiệu các khái niệm cơ bản về Machine Learning và ứng dụng thực tiễn.'
  }
};
const COURSE_PROGRESS = {
  c1: 72,
  c2: 45,
  c3: 30
};
const LECTURE_PROGRESS = {
  l1: 100,
  l2: 100,
  l3: 60,
  l4: 100,
  l5: 40,
  l6: 0,
  l7: 0
};
function CircularProgress({
  pct,
  size = 100
}) {
  const r = (size - 20) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return /*#__PURE__*/_jsxs("div", {
    className: "relative flex items-center justify-center flex-shrink-0",
    style: {
      width: size,
      height: size
    },
    children: [/*#__PURE__*/_jsxs("svg", {
      width: size,
      height: size,
      style: {
        transform: 'rotate(-90deg)'
      },
      children: [/*#__PURE__*/_jsx("circle", {
        cx: size / 2,
        cy: size / 2,
        r: r,
        fill: "none",
        stroke: "rgba(255,255,255,0.25)",
        strokeWidth: 8
      }), /*#__PURE__*/_jsx("circle", {
        cx: size / 2,
        cy: size / 2,
        r: r,
        fill: "none",
        stroke: "white",
        strokeWidth: 8,
        strokeDasharray: c,
        strokeDashoffset: offset,
        strokeLinecap: "round"
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "absolute inset-0 flex flex-col items-center justify-center",
      children: [/*#__PURE__*/_jsxs("span", {
        className: "text-white",
        style: {
          fontSize: '1.375rem',
          fontWeight: 700,
          lineHeight: 1
        },
        children: [pct, "%"]
      }), /*#__PURE__*/_jsx("span", {
        className: "text-white/70 mt-0.5 body-xs",
        children: "ho\xE0n th\xE0nh"
      })]
    })]
  });
}
export default function StudentCourseDetailPage({
  course,
  lectures,
  summaries,
  quizzes,
  navigate
}) {
  const meta = COURSE_META[course.id] ?? {
    gradient: 'linear-gradient(135deg,#6C4DF6,#9C7AF8)',
    letter: course.name.charAt(0),
    instructor: 'Giảng viên',
    description: course.description ?? ''
  };
  const progress = COURSE_PROGRESS[course.id] ?? 0;
  return /*#__PURE__*/_jsxs("div", {
    className: "p-6 max-w-5xl mx-auto",
    children: [/*#__PURE__*/_jsxs("button", {
      onClick: () => navigate('student-courses'),
      className: "flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors body-md",
      children: [/*#__PURE__*/_jsx(ArrowLeft, {
        className: "w-4 h-4"
      }), "Kh\xF3a h\u1ECDc c\u1EE7a t\xF4i"]
    }), /*#__PURE__*/_jsx("div", {
      className: "rounded-2xl overflow-hidden mb-8 shadow-sm",
      style: {
        background: meta.gradient
      },
      children: /*#__PURE__*/_jsxs("div", {
        className: "p-7 flex flex-col sm:flex-row items-start gap-6",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex-1 min-w-0",
          children: [/*#__PURE__*/_jsx("div", {
            className: "text-white/70 mb-1.5 body-xs",
            children: course.courseCode
          }), /*#__PURE__*/_jsx("h1", {
            className: "text-white mb-3",
            style: {
              lineHeight: 1.25
            },
            children: course.name
          }), /*#__PURE__*/_jsx("p", {
            className: "text-white/80 mb-5 body-lg",
            children: meta.description
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex flex-wrap items-center gap-4 text-white/75",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-1.5",
              children: [/*#__PURE__*/_jsx("div", {
                className: "w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center",
                children: /*#__PURE__*/_jsx(Users, {
                  className: "w-3.5 h-3.5 text-white"
                })
              }), /*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: '0.875rem'
                },
                children: ["GV: ", meta.instructor]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-1.5",
              children: [/*#__PURE__*/_jsx("div", {
                className: "w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center",
                children: /*#__PURE__*/_jsx(BookOpen, {
                  className: "w-3.5 h-3.5 text-white"
                })
              }), /*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: '0.875rem'
                },
                children: [lectures.length, " b\xE0i gi\u1EA3ng"]
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "flex items-center gap-1.5",
              children: [/*#__PURE__*/_jsx("div", {
                className: "w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center",
                children: /*#__PURE__*/_jsx(Users, {
                  className: "w-3.5 h-3.5 text-white"
                })
              }), /*#__PURE__*/_jsxs("span", {
                style: {
                  fontSize: '0.875rem'
                },
                children: [course.studentCount, " h\u1ECDc vi\xEAn"]
              })]
            })]
          })]
        }), /*#__PURE__*/_jsx(CircularProgress, {
          pct: progress,
          size: 104
        })]
      })
    }), /*#__PURE__*/_jsxs("div", {
      className: "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm",
      children: [/*#__PURE__*/_jsx("div", {
        className: "px-6 py-4",
        style: {
          borderBottom: '1px solid #f1f5f9'
        },
        children: /*#__PURE__*/_jsx("h2", {
          className: "text-slate-900",
          style: {
            fontSize: '1rem',
            fontWeight: 600
          },
          children: "Danh s\xE1ch b\xE0i gi\u1EA3ng"
        })
      }), /*#__PURE__*/_jsx("div", {
        className: "overflow-x-auto",
        children: /*#__PURE__*/_jsxs("table", {
          className: "w-full",
          children: [/*#__PURE__*/_jsx("thead", {
            children: /*#__PURE__*/_jsxs("tr", {
              style: {
                background: '#f8fafc',
                borderBottom: '1px solid #f1f5f9'
              },
              children: [/*#__PURE__*/_jsx("th", {
                className: "px-6 py-3 text-left text-slate-400",
                style: {
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  width: 56
                },
                children: "STT"
              }), /*#__PURE__*/_jsx("th", {
                className: "px-4 py-3 text-left text-slate-400",
                style: {
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                },
                children: "B\xE0i gi\u1EA3ng"
              }), /*#__PURE__*/_jsx("th", {
                className: "px-4 py-3 text-center text-slate-400",
                style: {
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  width: 90
                },
                children: "T\xF3m t\u1EAFt"
              }), /*#__PURE__*/_jsx("th", {
                className: "px-4 py-3 text-center text-slate-400",
                style: {
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  width: 100
                },
                children: "\xD4n t\u1EADp AI"
              }), /*#__PURE__*/_jsx("th", {
                className: "px-4 py-3 text-center text-slate-400",
                style: {
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  width: 76
                },
                children: "Quiz"
              }), /*#__PURE__*/_jsx("th", {
                className: "px-4 py-3 text-left text-slate-400",
                style: {
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  width: 150
                },
                children: "Ti\u1EBFn \u0111\u1ED9"
              })]
            })
          }), /*#__PURE__*/_jsx("tbody", {
            children: lectures.map((lecture, idx) => {
              const hasSummary = summaries.some(s => s.lectureId === lecture.id && s.status === 'published');
              const hasQuiz = quizzes.some(q => q.lectureId === lecture.id && q.status === 'published');
              const lProgress = LECTURE_PROGRESS[lecture.id] ?? 0;
              const isLast = idx === lectures.length - 1;
              return /*#__PURE__*/_jsxs("tr", {
                className: "hover:bg-slate-50/70 transition-colors",
                style: {
                  borderBottom: isLast ? 'none' : '1px solid #f8fafc'
                },
                children: [/*#__PURE__*/_jsx("td", {
                  className: "px-6 py-4",
                  children: /*#__PURE__*/_jsx("span", {
                    className: "w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center",
                    style: {
                      fontSize: '0.75rem',
                      fontWeight: 600
                    },
                    children: idx + 1
                  })
                }), /*#__PURE__*/_jsxs("td", {
                  className: "px-4 py-4",
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "text-slate-900",
                    style: {
                      fontSize: '0.9375rem',
                      fontWeight: 500
                    },
                    children: lecture.title
                  }), lecture.description && /*#__PURE__*/_jsx("div", {
                    className: "text-slate-400 mt-0.5",
                    style: {
                      fontSize: '0.75rem'
                    },
                    children: lecture.description
                  })]
                }), /*#__PURE__*/_jsx("td", {
                  className: "px-4 py-4",
                  children: /*#__PURE__*/_jsx("div", {
                    className: "flex justify-center",
                    children: hasSummary ? /*#__PURE__*/_jsx("button", {
                      onClick: () => navigate('student-lecture-view', {
                        selectedCourseId: course.id,
                        selectedLectureId: lecture.id,
                        lectureTab: 'summary'
                      }),
                      title: "Xem t\xF3m t\u1EAFt",
                      className: "w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95",
                      style: {
                        background: 'rgba(108,77,246,0.1)',
                        color: PRIMARY
                      },
                      children: /*#__PURE__*/_jsx(FileText, {
                        className: "w-4 h-4"
                      })
                    }) : /*#__PURE__*/_jsx("span", {
                      className: "w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50",
                      children: /*#__PURE__*/_jsx(FileText, {
                        className: "w-4 h-4 text-slate-300"
                      })
                    })
                  })
                }), /*#__PURE__*/_jsx("td", {
                  className: "px-4 py-4",
                  children: /*#__PURE__*/_jsx("div", {
                    className: "flex justify-center",
                    children: /*#__PURE__*/_jsx("button", {
                      onClick: () => navigate('student-lecture-view', {
                        selectedCourseId: course.id,
                        selectedLectureId: lecture.id,
                        lectureTab: 'chat'
                      }),
                      title: "H\u1ECFi \u0111\xE1p AI",
                      className: "w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95",
                      style: {
                        background: 'rgba(16,185,129,0.1)',
                        color: '#10B981'
                      },
                      children: /*#__PURE__*/_jsx(MessageSquare, {
                        className: "w-4 h-4"
                      })
                    })
                  })
                }), /*#__PURE__*/_jsx("td", {
                  className: "px-4 py-4",
                  children: /*#__PURE__*/_jsx("div", {
                    className: "flex justify-center",
                    children: hasQuiz ? /*#__PURE__*/_jsx("button", {
                      onClick: () => navigate('student-lecture-view', {
                        selectedCourseId: course.id,
                        selectedLectureId: lecture.id,
                        lectureTab: 'quiz'
                      }),
                      title: "L\xE0m quiz",
                      className: "w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95",
                      style: {
                        background: 'rgba(245,158,11,0.1)',
                        color: '#F59E0B'
                      },
                      children: /*#__PURE__*/_jsx(HelpCircle, {
                        className: "w-4 h-4"
                      })
                    }) : /*#__PURE__*/_jsx("span", {
                      className: "w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50",
                      children: /*#__PURE__*/_jsx(HelpCircle, {
                        className: "w-4 h-4 text-slate-300"
                      })
                    })
                  })
                }), /*#__PURE__*/_jsx("td", {
                  className: "px-4 py-4",
                  children: /*#__PURE__*/_jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [/*#__PURE__*/_jsx("div", {
                      className: "flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden",
                      children: /*#__PURE__*/_jsx("div", {
                        className: "h-full rounded-full transition-all",
                        style: {
                          width: `${lProgress}%`,
                          background: lProgress === 100 ? '#10B981' : PRIMARY
                        }
                      })
                    }), /*#__PURE__*/_jsxs("span", {
                      style: {
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: lProgress === 100 ? '#10B981' : PRIMARY,
                        minWidth: 36,
                        textAlign: 'right'
                      },
                      children: [lProgress, "%"]
                    })]
                  })
                })]
              }, lecture.id);
            })
          })]
        })
      })]
    })]
  });
}
