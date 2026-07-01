import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from 'react/jsx-runtime';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronLeft, FileText, MessageSquare, HelpCircle, Brain, Sparkles, Send, CheckCircle2, XCircle, Clock, BookOpen } from 'lucide-react';
const PRIMARY = '#6C4DF6';
function RichText({
  content
}) {
  const parts = content.split(/\*\*(.+?)\*\*/g);
  return /*#__PURE__*/_jsx(_Fragment, {
    children: parts.map((part, i) => i % 2 === 1 ? /*#__PURE__*/_jsx("strong", {
      style: {
        fontWeight: 600
      },
      children: part
    }, i) : /*#__PURE__*/_jsx("span", {
      children: part
    }, i))
  });
}
function TypingDots() {
  return /*#__PURE__*/_jsx("div", {
    className: "flex items-center gap-1 px-1 py-0.5",
    children: [0, 1, 2].map(i => /*#__PURE__*/_jsx("span", {
      className: "w-2 h-2 bg-slate-400 rounded-full animate-bounce",
      style: {
        animationDelay: `${i * 150}ms`,
        animationDuration: '0.9s'
      }
    }, i))
  });
}
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function ChatSection({
  lecture,
  messages,
  onSend
}) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const [streamedLen, setStreamedLen] = useState(0);
  const prevLen = useRef(messages.length);
  const endRef = useRef(null);
  useEffect(() => {
    if (messages.length <= prevLen.current) return;
    prevLen.current = messages.length;
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant') {
      setIsTyping(false);
      setStreamingMsgId(last.id);
      setStreamedLen(0);
    }
  }, [messages]);
  useEffect(() => {
    if (!streamingMsgId) return;
    const msg = messages.find(m => m.id === streamingMsgId);
    if (!msg || streamedLen >= msg.content.length) {
      setStreamingMsgId(null);
      return;
    }
    const t = setTimeout(() => setStreamedLen(l => Math.min(l + 10, msg.content.length)), 16);
    return () => clearTimeout(t);
  }, [streamingMsgId, streamedLen, messages]);
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, isTyping, streamedLen]);
  const handleSend = text => {
    if (!text.trim()) return;
    onSend(text.trim());
    setInput('');
    setIsTyping(true);
  };
  const SUGGESTED = ['Sự khác nhau giữa component và element trong React là gì?', 'Virtual DOM hoạt động như thế nào?', 'Hooks dùng để làm gì?'];
  return /*#__PURE__*/_jsxs("div", {
    className: "flex flex-col h-full",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "px-6 py-3 border-b border-slate-100 flex items-center gap-3 flex-shrink-0",
      style: {
        background: 'linear-gradient(to right, #f5f3ff, #ede9fe)'
      },
      children: [/*#__PURE__*/_jsx("div", {
        className: "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0",
        style: {
          background: 'linear-gradient(135deg,#6C4DF6,#9C7AF8)'
        },
        children: /*#__PURE__*/_jsx(Brain, {
          className: "w-4 h-4 text-white"
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex-1",
        children: [/*#__PURE__*/_jsx("div", {
          className: "text-slate-800",
          style: {
            fontWeight: 600,
            fontSize: '0.9375rem'
          },
          children: "EduRAG Assistant"
        }), /*#__PURE__*/_jsxs("div", {
          className: "flex items-center gap-1.5 text-slate-500",
          style: {
            fontSize: '0.6875rem'
          },
          children: [/*#__PURE__*/_jsx("span", {
            className: "w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"
          }), "Tr\u1EA3 l\u1EDDi d\u1EF1a tr\xEAn t\xE0i li\u1EC7u b\xE0i gi\u1EA3ng \xB7 c\xF3 tr\xEDch d\u1EABn ngu\u1ED3n"]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-1 bg-white border border-violet-200 rounded-full px-2 py-0.5 shadow-sm",
        children: [/*#__PURE__*/_jsx(Sparkles, {
          className: "w-2.5 h-2.5 text-violet-500"
        }), /*#__PURE__*/_jsx("span", {
          className: "text-violet-600",
          style: {
            fontSize: '0.625rem',
            fontWeight: 700
          },
          children: "RAG"
        })]
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "flex-1 overflow-y-auto p-5 space-y-3",
      style: {
        background: '#f8fafc'
      },
      children: [messages.length === 0 && !isTyping && /*#__PURE__*/_jsxs("div", {
        className: "flex flex-col items-center justify-center h-full text-center py-6",
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-14 h-14 rounded-2xl flex items-center justify-center mb-3",
          style: {
            background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)'
          },
          children: /*#__PURE__*/_jsx(Brain, {
            className: "w-7 h-7",
            style: {
              color: PRIMARY
            }
          })
        }), /*#__PURE__*/_jsx("p", {
          className: "text-slate-700 mb-1",
          style: {
            fontWeight: 600,
            fontSize: '1rem'
          },
          children: "H\u1ECFi AI v\u1EC1 b\xE0i gi\u1EA3ng"
        }), /*#__PURE__*/_jsx("p", {
          className: "text-slate-400 mb-5",
          style: {
            fontSize: '0.875rem',
            maxWidth: 280,
            lineHeight: 1.5
          },
          children: "AI tr\u1EA3 l\u1EDDi d\u1EF1a tr\xEAn n\u1ED9i dung t\xE0i li\u1EC7u v\u1EDBi tr\xEDch d\u1EABn ngu\u1ED3n c\u1EE5 th\u1EC3."
        }), /*#__PURE__*/_jsx("div", {
          className: "flex flex-col gap-2 w-full max-w-sm",
          children: SUGGESTED.map(q => /*#__PURE__*/_jsxs("button", {
            onClick: () => handleSend(q),
            className: "flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all text-left group",
            children: [/*#__PURE__*/_jsx(Sparkles, {
              className: "w-3.5 h-3.5 text-violet-400 flex-shrink-0 group-hover:text-violet-600"
            }), /*#__PURE__*/_jsx("span", {
              className: "text-slate-600 group-hover:text-violet-700 transition-colors",
              style: {
                fontSize: '0.8125rem',
                lineHeight: 1.4
              },
              children: q
            })]
          }, q))
        })]
      }), messages.map(msg => {
        const isStreaming = msg.id === streamingMsgId;
        const displayContent = isStreaming ? msg.content.slice(0, streamedLen) : msg.content;
        return /*#__PURE__*/_jsxs("div", {
          className: `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2.5`,
          children: [msg.role === 'assistant' && /*#__PURE__*/_jsx("div", {
            className: "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm",
            style: {
              background: 'linear-gradient(135deg,#6C4DF6,#9C7AF8)'
            },
            children: /*#__PURE__*/_jsx(Brain, {
              className: "w-3.5 h-3.5 text-white"
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: `max-w-[78%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`,
            children: [/*#__PURE__*/_jsx("div", {
              className: `rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`,
              style: msg.role === 'user' ? {
                background: PRIMARY
              } : {},
              children: msg.role === 'assistant' ? /*#__PURE__*/_jsxs("div", {
                style: {
                  fontSize: '0.9375rem',
                  lineHeight: 1.7
                },
                children: [/*#__PURE__*/_jsx(RichText, {
                  content: displayContent
                }), isStreaming && /*#__PURE__*/_jsx("span", {
                  className: "animate-pulse",
                  style: {
                    color: PRIMARY
                  },
                  children: "\u258B"
                })]
              }) : /*#__PURE__*/_jsx("p", {
                style: {
                  fontSize: '0.9375rem',
                  lineHeight: 1.6
                },
                children: msg.content
              })
            }), msg.citations && msg.citations.length > 0 && !isStreaming && /*#__PURE__*/_jsx("div", {
              className: "flex flex-wrap gap-1.5 mt-0.5",
              children: msg.citations.map(cit => /*#__PURE__*/_jsxs("span", {
                className: "inline-flex items-center gap-1 rounded-full px-2.5 py-1 border",
                style: {
                  fontSize: '0.6875rem',
                  background: '#f5f3ff',
                  borderColor: '#ddd6fe',
                  color: '#5b21b6'
                },
                children: [/*#__PURE__*/_jsx(FileText, {
                  className: "w-2.5 h-2.5 flex-shrink-0"
                }), cit.documentName, cit.page ? ` · tr.${cit.page}` : '']
              }, cit.id))
            })]
          }), msg.role === 'user' && /*#__PURE__*/_jsx("div", {
            className: "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
            style: {
              background: 'rgba(108,77,246,0.12)'
            },
            children: /*#__PURE__*/_jsx("span", {
              style: {
                color: PRIMARY,
                fontSize: '0.5625rem',
                fontWeight: 700
              },
              children: "B"
            })
          })]
        }, msg.id);
      }), isTyping && /*#__PURE__*/_jsxs("div", {
        className: "flex items-start gap-2.5",
        children: [/*#__PURE__*/_jsx("div", {
          className: "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
          style: {
            background: 'linear-gradient(135deg,#6C4DF6,#9C7AF8)'
          },
          children: /*#__PURE__*/_jsx(Brain, {
            className: "w-3.5 h-3.5 text-white"
          })
        }), /*#__PURE__*/_jsxs("div", {
          className: "bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm",
          children: [/*#__PURE__*/_jsx("div", {
            style: {
              fontSize: '0.625rem',
              fontWeight: 600,
              color: PRIMARY,
              marginBottom: 4
            },
            children: "\u0110ang ph\xE2n t\xEDch t\xE0i li\u1EC7u"
          }), /*#__PURE__*/_jsx(TypingDots, {})]
        })]
      }), /*#__PURE__*/_jsx("div", {
        ref: endRef
      })]
    }), messages.length > 0 && !isTyping && !streamingMsgId && /*#__PURE__*/_jsx("div", {
      className: "px-4 pt-2 flex gap-1.5 overflow-x-auto pb-1 flex-shrink-0 bg-white border-t border-slate-100",
      children: SUGGESTED.slice(0, 2).map(q => /*#__PURE__*/_jsxs("button", {
        onClick: () => handleSend(q),
        className: "flex-shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 border transition-colors",
        style: {
          fontSize: '0.6875rem',
          background: '#f5f3ff',
          borderColor: '#ddd6fe',
          color: PRIMARY
        },
        children: [/*#__PURE__*/_jsx(Sparkles, {
          className: "w-2.5 h-2.5"
        }), q.length > 30 ? q.slice(0, 30) + '…' : q]
      }, q))
    }), /*#__PURE__*/_jsxs("form", {
      onSubmit: e => {
        e.preventDefault();
        handleSend(input);
      },
      className: "p-4 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-white",
      children: [/*#__PURE__*/_jsx("input", {
        value: input,
        onChange: e => setInput(e.target.value),
        className: "flex-1 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none transition bg-slate-50",
        style: {
          fontSize: '0.9375rem'
        },
        onFocus: e => e.target.style.borderColor = PRIMARY,
        onBlur: e => e.target.style.borderColor = '#e2e8f0',
        placeholder: "H\u1ECFi b\u1EA5t k\u1EF3 \u0111i\u1EC1u g\xEC v\u1EC1 n\u1ED9i dung b\xE0i gi\u1EA3ng..."
      }), /*#__PURE__*/_jsx("button", {
        type: "submit",
        disabled: !input.trim() || isTyping || !!streamingMsgId,
        className: "w-10 h-10 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40",
        style: {
          background: PRIMARY
        },
        children: /*#__PURE__*/_jsx(Send, {
          className: "w-4 h-4"
        })
      })]
    })]
  });
}
function QuizSection({
  quiz
}) {
  const total = quiz.questions.length;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted]);
  const handleSubmit = () => {
    const mc = quiz.questions.filter(q => q.type === 'multiple_choice');
    const correct = mc.filter(q => answers[q.id] === q.correctAnswer).length;
    setScore(correct);
    setSubmitted(true);
  };
  const answered = Object.keys(answers).length;
  const currentQ = quiz.questions[currentIdx];
  const progressPct = total > 0 ? Math.round(answered / total * 100) : 0;
  if (submitted) {
    const mc = quiz.questions.filter(q => q.type === 'multiple_choice');
    const scorePct = mc.length > 0 ? Math.round(score / mc.length * 100) : 0;
    return /*#__PURE__*/_jsx("div", {
      className: "flex flex-col h-full overflow-y-auto",
      children: /*#__PURE__*/_jsxs("div", {
        className: "p-6 max-w-2xl mx-auto w-full space-y-5",
        children: [/*#__PURE__*/_jsxs("div", {
          className: `rounded-2xl p-6 text-center border ${scorePct >= 70 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`,
          children: [/*#__PURE__*/_jsxs("div", {
            className: scorePct >= 70 ? 'text-emerald-600' : 'text-amber-600',
            style: {
              fontSize: '3rem',
              fontWeight: 700,
              lineHeight: 1
            },
            children: [scorePct, "%"]
          }), /*#__PURE__*/_jsx("div", {
            className: `mt-2 ${scorePct >= 70 ? 'text-emerald-700' : 'text-amber-700'}`,
            style: {
              fontWeight: 600,
              fontSize: '1.125rem'
            },
            children: scorePct >= 70 ? 'Xuất sắc!' : 'Hãy ôn lại thêm!'
          }), /*#__PURE__*/_jsxs("div", {
            className: `mt-1 ${scorePct >= 70 ? 'text-emerald-600' : 'text-amber-600'}`,
            style: {
              fontSize: '0.875rem'
            },
            children: [score, "/", mc.length, " c\xE2u \u0111\xFAng"]
          })]
        }), quiz.questions.map((q, idx) => {
          const isCorrect = q.type === 'multiple_choice' && answers[q.id] === q.correctAnswer;
          const isWrong = q.type === 'multiple_choice' && !!answers[q.id] && !isCorrect;
          return /*#__PURE__*/_jsxs("div", {
            className: `bg-white rounded-xl border p-4 ${isWrong ? 'border-red-200' : isCorrect ? 'border-emerald-200' : 'border-slate-200'}`,
            children: [/*#__PURE__*/_jsxs("div", {
              className: "flex items-start gap-3 mb-3",
              children: [/*#__PURE__*/_jsx("span", {
                className: "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white",
                style: {
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isWrong ? '#ef4444' : isCorrect ? '#10B981' : '#94a3b8'
                },
                children: idx + 1
              }), /*#__PURE__*/_jsx("div", {
                className: "flex-1",
                children: /*#__PURE__*/_jsxs("div", {
                  className: "flex items-center gap-2 mb-1",
                  children: [q.type === 'multiple_choice' && (isCorrect ? /*#__PURE__*/_jsx(CheckCircle2, {
                    className: "w-4 h-4 text-emerald-600"
                  }) : /*#__PURE__*/_jsx(XCircle, {
                    className: "w-4 h-4 text-red-500"
                  })), /*#__PURE__*/_jsx("p", {
                    className: "text-slate-900",
                    style: {
                      fontSize: '0.9375rem',
                      fontWeight: 500
                    },
                    children: q.question
                  })]
                })
              })]
            }), q.options && /*#__PURE__*/_jsx("div", {
              className: "grid gap-1.5 ml-10 mb-3",
              children: q.options.map((opt, i) => {
                const sel = answers[q.id] === opt;
                const ans = opt === q.correctAnswer;
                return /*#__PURE__*/_jsxs("div", {
                  className: `flex items-center gap-2 p-2 rounded-lg border ${ans ? 'bg-emerald-50 border-emerald-200' : sel ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-transparent'}`,
                  children: [/*#__PURE__*/_jsx("span", {
                    className: `w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white ${ans ? 'bg-emerald-500' : sel ? 'bg-red-400' : 'bg-slate-300'}`,
                    style: {
                      fontSize: '0.5625rem',
                      fontWeight: 700
                    },
                    children: ['A', 'B', 'C', 'D'][i]
                  }), /*#__PURE__*/_jsx("span", {
                    className: ans ? 'text-emerald-800' : sel ? 'text-red-700' : 'text-slate-600',
                    style: {
                      fontSize: '0.875rem'
                    },
                    children: opt
                  })]
                }, i);
              })
            }), /*#__PURE__*/_jsx("div", {
              className: "ml-10 p-2.5 rounded-lg",
              style: {
                background: '#fefce8',
                border: '1px solid #fef08a'
              },
              children: /*#__PURE__*/_jsxs("p", {
                className: "text-amber-800",
                style: {
                  fontSize: '0.8125rem'
                },
                children: [/*#__PURE__*/_jsx("span", {
                  style: {
                    fontWeight: 600
                  },
                  children: "Gi\u1EA3i th\xEDch:"
                }), " ", q.explanation]
              })
            })]
          }, q.id);
        }), /*#__PURE__*/_jsx("button", {
          onClick: () => {
            setSubmitted(false);
            setAnswers({});
            setScore(0);
            setCurrentIdx(0);
            setTimeLeft(30 * 60);
          },
          className: "w-full border border-slate-200 text-slate-600 rounded-xl py-3 hover:bg-slate-50 transition-colors",
          style: {
            fontSize: '0.9375rem'
          },
          children: "L\xE0m l\u1EA1i"
        })]
      })
    });
  }
  return /*#__PURE__*/_jsxs("div", {
    className: "flex h-full overflow-hidden",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex-1 flex flex-col overflow-hidden",
      children: [/*#__PURE__*/_jsx("div", {
        className: "flex-1 overflow-y-auto p-6",
        children: currentQ && /*#__PURE__*/_jsxs("div", {
          className: "max-w-2xl mx-auto",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "flex items-center gap-2 mb-5",
            children: [/*#__PURE__*/_jsxs("span", {
              className: "rounded-full px-3 py-1 text-white",
              style: {
                fontSize: '0.75rem',
                fontWeight: 600,
                background: PRIMARY
              },
              children: ["C\xE2u ", currentIdx + 1, "/", quiz.questions.length]
            }), /*#__PURE__*/_jsx("span", {
              className: "text-slate-400",
              style: {
                fontSize: '0.8125rem'
              },
              children: currentQ.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'
            })]
          }), /*#__PURE__*/_jsx("div", {
            className: "bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-5",
            children: /*#__PURE__*/_jsx("p", {
              className: "text-slate-900",
              style: {
                fontSize: '1.0625rem',
                fontWeight: 500,
                lineHeight: 1.65
              },
              children: currentQ.question
            })
          }), currentQ.type === 'multiple_choice' && currentQ.options ? /*#__PURE__*/_jsx("div", {
            className: "space-y-2.5",
            children: currentQ.options.map((opt, i) => {
              const selected = answers[currentQ.id] === opt;
              return /*#__PURE__*/_jsxs("button", {
                onClick: () => setAnswers(a => ({
                  ...a,
                  [currentQ.id]: opt
                })),
                className: "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                style: {
                  borderColor: selected ? PRIMARY : '#e2e8f0',
                  background: selected ? 'rgba(108,77,246,0.06)' : 'white'
                },
                children: [/*#__PURE__*/_jsx("span", {
                  className: "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white",
                  style: {
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: selected ? PRIMARY : '#cbd5e1'
                  },
                  children: ['A', 'B', 'C', 'D'][i]
                }), /*#__PURE__*/_jsx("span", {
                  style: {
                    fontSize: '0.9375rem',
                    color: selected ? '#4c1d95' : '#475569'
                  },
                  children: opt
                })]
              }, i);
            })
          }) : /*#__PURE__*/_jsx("textarea", {
            value: answers[currentQ.id] ?? '',
            onChange: e => setAnswers(a => ({
              ...a,
              [currentQ.id]: e.target.value
            })),
            rows: 4,
            className: "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none transition",
            style: {
              fontSize: '0.9375rem'
            },
            onFocus: e => e.target.style.borderColor = PRIMARY,
            onBlur: e => e.target.style.borderColor = '#e2e8f0',
            placeholder: "Nh\u1EADp c\xE2u tr\u1EA3 l\u1EDDi c\u1EE7a b\u1EA1n..."
          })]
        })
      }), /*#__PURE__*/_jsx("div", {
        className: "border-t border-slate-100 bg-white px-6 py-4 flex-shrink-0",
        children: /*#__PURE__*/_jsxs("div", {
          className: "max-w-2xl mx-auto flex items-center gap-4",
          children: [/*#__PURE__*/_jsxs("button", {
            onClick: () => setCurrentIdx(i => Math.max(0, i - 1)),
            disabled: currentIdx === 0,
            className: "flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors flex-shrink-0",
            style: {
              fontSize: '0.875rem'
            },
            children: [/*#__PURE__*/_jsx(ChevronLeft, {
              className: "w-4 h-4"
            }), "Tr\u01B0\u1EDBc"]
          }), /*#__PURE__*/_jsx("div", {
            className: "flex-1 flex items-center justify-center gap-2 overflow-x-auto",
            children: quiz.questions.map((q, i) => {
              const isActive = i === currentIdx;
              const isAnswered = !!answers[q.id];
              return /*#__PURE__*/_jsx("button", {
                onClick: () => setCurrentIdx(i),
                className: "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                style: {
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  background: isActive ? PRIMARY : isAnswered ? 'rgba(108,77,246,0.15)' : '#f1f5f9',
                  color: isActive ? 'white' : isAnswered ? PRIMARY : '#94a3b8',
                  boxShadow: isActive ? `0 0 0 3px rgba(108,77,246,0.2)` : 'none'
                },
                children: i + 1
              }, q.id);
            })
          }), currentIdx < quiz.questions.length - 1 ? /*#__PURE__*/_jsxs("button", {
            onClick: () => setCurrentIdx(i => Math.min(quiz.questions.length - 1, i + 1)),
            className: "flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0",
            style: {
              fontSize: '0.875rem'
            },
            children: ["Ti\u1EBFp", /*#__PURE__*/_jsx(ChevronRight, {
              className: "w-4 h-4"
            })]
          }) : /*#__PURE__*/_jsx("button", {
            onClick: handleSubmit,
            disabled: answered === 0,
            className: "flex items-center gap-1.5 px-5 py-2 rounded-xl text-white disabled:opacity-50 transition-opacity flex-shrink-0",
            style: {
              background: PRIMARY,
              fontSize: '0.875rem',
              fontWeight: 600
            },
            children: "N\u1ED9p b\xE0i"
          })]
        })
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "w-56 flex-shrink-0 border-l border-slate-100 bg-white flex flex-col p-4 gap-4",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "rounded-xl p-4 text-center",
        style: {
          background: timeLeft < 300 ? '#fef2f2' : '#f5f3ff',
          border: `1px solid ${timeLeft < 300 ? '#fecaca' : '#ddd6fe'}`
        },
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center justify-center gap-1.5 mb-1.5",
          children: [/*#__PURE__*/_jsx(Clock, {
            className: "w-3.5 h-3.5",
            style: {
              color: timeLeft < 300 ? '#ef4444' : PRIMARY
            }
          }), /*#__PURE__*/_jsx("span", {
            style: {
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: timeLeft < 300 ? '#ef4444' : PRIMARY,
              letterSpacing: '0.05em'
            },
            children: "TH\u1EDCI GIAN"
          })]
        }), /*#__PURE__*/_jsx("div", {
          style: {
            fontSize: '1.75rem',
            fontWeight: 700,
            color: timeLeft < 300 ? '#ef4444' : '#1e293b',
            fontFamily: 'monospace',
            lineHeight: 1
          },
          children: formatTime(timeLeft)
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "rounded-xl border border-slate-100 p-3.5 text-center",
        style: {
          background: '#f8fafc'
        },
        children: [/*#__PURE__*/_jsx("div", {
          className: "text-slate-400 mb-1.5",
          style: {
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.05em'
          },
          children: "C\xC2U HI\u1EC6N T\u1EA0I"
        }), /*#__PURE__*/_jsxs("div", {
          className: "text-slate-900",
          style: {
            fontSize: '1.5rem',
            fontWeight: 700,
            lineHeight: 1
          },
          children: [currentIdx + 1, /*#__PURE__*/_jsxs("span", {
            className: "text-slate-400",
            style: {
              fontSize: '0.9375rem',
              fontWeight: 400
            },
            children: [" / ", quiz.questions.length]
          })]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "rounded-xl border border-slate-100 p-3.5 text-center",
        style: {
          background: '#f8fafc'
        },
        children: [/*#__PURE__*/_jsx("div", {
          className: "text-slate-400 mb-1.5",
          style: {
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.05em'
          },
          children: "\u0110I\u1EC2M S\u1ED0"
        }), /*#__PURE__*/_jsxs("div", {
          className: "text-slate-900",
          style: {
            fontSize: '1.5rem',
            fontWeight: 700,
            lineHeight: 1
          },
          children: ["0", /*#__PURE__*/_jsxs("span", {
            className: "text-slate-400",
            style: {
              fontSize: '0.9375rem',
              fontWeight: 400
            },
            children: [" / ", quiz.questions.length]
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "text-slate-400 mt-0.5",
          style: {
            fontSize: '0.6875rem'
          },
          children: "\u0111i\u1EC3m"
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "rounded-xl border border-slate-100 p-3.5",
        style: {
          background: '#f8fafc'
        },
        children: [/*#__PURE__*/_jsxs("div", {
          className: "flex items-center justify-between mb-2",
          children: [/*#__PURE__*/_jsx("span", {
            className: "text-slate-400",
            style: {
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.05em'
            },
            children: "TI\u1EBEN \u0110\u1ED8"
          }), /*#__PURE__*/_jsxs("span", {
            style: {
              fontSize: '0.75rem',
              fontWeight: 700,
              color: PRIMARY
            },
            children: [progressPct, "%"]
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "h-2 bg-slate-200 rounded-full overflow-hidden",
          children: /*#__PURE__*/_jsx("div", {
            className: "h-full rounded-full transition-all",
            style: {
              width: `${progressPct}%`,
              background: PRIMARY
            }
          })
        }), /*#__PURE__*/_jsxs("div", {
          className: "text-slate-400 mt-1.5",
          style: {
            fontSize: '0.6875rem'
          },
          children: [answered, "/", total, " c\xE2u \u0111\xE3 tr\u1EA3 l\u1EDDi"]
        })]
      }), /*#__PURE__*/_jsxs("button", {
        onClick: handleSubmit,
        disabled: answered === 0,
        className: "w-full py-2.5 rounded-xl text-white disabled:opacity-50 transition-opacity mt-auto",
        style: {
          background: PRIMARY,
          fontSize: '0.875rem',
          fontWeight: 600
        },
        children: ["N\u1ED9p b\xE0i (", answered, "/", total, ")"]
      })]
    })]
  });
}
export default function LectureViewPage({
  lecture,
  nextLecture,
  course,
  summary,
  quiz,
  chatMessages,
  navigate,
  onSendMessage,
  initialTab
}) {
  const getInitialTabs = () => {
    if (initialTab === 'chat') return {
      main: 'review',
      review: 'chat'
    };
    if (initialTab === 'quiz') return {
      main: 'review',
      review: 'quiz'
    };
    return {
      main: 'summary',
      review: 'chat'
    };
  };
  const init = getInitialTabs();
  const [mainTab, setMainTab] = useState(init.main);
  const [reviewTab, setReviewTab] = useState(init.review);
  const hasSummary = !!summary && summary.status === 'published';
  const hasQuiz = !!quiz && quiz.status === 'published';
  return /*#__PURE__*/_jsxs("div", {
    className: "flex flex-col h-full overflow-hidden bg-slate-50",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex items-center gap-2 mb-3",
        children: [/*#__PURE__*/_jsxs("button", {
          onClick: () => navigate('student-course-detail', {
            selectedCourseId: course.id
          }),
          className: "flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0",
          style: {
            fontSize: '0.875rem'
          },
          children: [/*#__PURE__*/_jsx(ArrowLeft, {
            className: "w-4 h-4"
          }), course.name]
        }), /*#__PURE__*/_jsx(ChevronRight, {
          className: "w-4 h-4 text-slate-300 flex-shrink-0"
        }), /*#__PURE__*/_jsxs("span", {
          className: "text-slate-700 truncate",
          style: {
            fontSize: '0.875rem',
            fontWeight: 500
          },
          children: ["B\xE0i ", lecture.order, ": ", lecture.title]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex gap-1 bg-slate-100 rounded-xl p-1 w-fit",
        children: [/*#__PURE__*/_jsxs("button", {
          onClick: () => setMainTab('summary'),
          className: "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
          style: {
            fontSize: '0.875rem',
            fontWeight: mainTab === 'summary' ? 600 : 400,
            background: mainTab === 'summary' ? 'white' : 'transparent',
            color: mainTab === 'summary' ? '#1e293b' : '#64748b',
            boxShadow: mainTab === 'summary' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
          },
          children: [/*#__PURE__*/_jsx(FileText, {
            className: "w-3.5 h-3.5"
          }), "T\xF3m t\u1EAFt"]
        }), /*#__PURE__*/_jsxs("button", {
          onClick: () => setMainTab('review'),
          className: "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
          style: {
            fontSize: '0.875rem',
            fontWeight: mainTab === 'review' ? 600 : 400,
            background: mainTab === 'review' ? 'white' : 'transparent',
            color: mainTab === 'review' ? '#1e293b' : '#64748b',
            boxShadow: mainTab === 'review' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
          },
          children: [/*#__PURE__*/_jsx(Brain, {
            className: "w-3.5 h-3.5"
          }), "\xD4n t\u1EADp"]
        })]
      })]
    }), mainTab === 'summary' && /*#__PURE__*/_jsx("div", {
      className: "flex-1 overflow-y-auto",
      children: /*#__PURE__*/_jsx("div", {
        className: "p-6 max-w-3xl mx-auto",
        children: hasSummary ? /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsxs("div", {
            className: "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-6",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "px-6 py-4 flex items-center gap-3",
              style: {
                borderBottom: '1px solid #f1f5f9'
              },
              children: [/*#__PURE__*/_jsx("div", {
                className: "w-9 h-9 rounded-xl flex items-center justify-center",
                style: {
                  background: 'rgba(16,185,129,0.1)'
                },
                children: /*#__PURE__*/_jsx(BookOpen, {
                  className: "w-4 h-4 text-emerald-600"
                })
              }), /*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx("div", {
                  className: "text-slate-800",
                  style: {
                    fontWeight: 600,
                    fontSize: '0.9375rem'
                  },
                  children: "T\xF3m t\u1EAFt b\xE0i gi\u1EA3ng"
                }), /*#__PURE__*/_jsxs("div", {
                  className: "text-slate-400",
                  style: {
                    fontSize: '0.75rem'
                  },
                  children: ["AI t\u1EA1o \xB7 ", summary?.generatedAt]
                })]
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "p-7",
              children: /*#__PURE__*/_jsx("pre", {
                className: "whitespace-pre-wrap text-slate-700",
                style: {
                  fontSize: '0.9375rem',
                  lineHeight: 1.85,
                  fontFamily: 'inherit'
                },
                children: summary?.content
              })
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "flex items-center justify-between pt-2",
            children: [/*#__PURE__*/_jsxs("button", {
              onClick: () => navigate('student-course-detail', {
                selectedCourseId: course.id
              }),
              className: "flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors",
              style: {
                fontSize: '0.875rem'
              },
              children: [/*#__PURE__*/_jsx(ArrowLeft, {
                className: "w-4 h-4"
              }), "Quay l\u1EA1i danh s\xE1ch"]
            }), nextLecture && /*#__PURE__*/_jsxs("button", {
              onClick: () => navigate('student-lecture-view', {
                selectedCourseId: course.id,
                selectedLectureId: nextLecture.id,
                lectureTab: 'summary'
              }),
              className: "flex items-center gap-2 px-4 py-2.5 text-white rounded-xl transition-opacity hover:opacity-90",
              style: {
                background: PRIMARY,
                fontSize: '0.875rem',
                fontWeight: 500
              },
              children: ["B\xE0i gi\u1EA3ng ti\u1EBFp theo", /*#__PURE__*/_jsx(ChevronRight, {
                className: "w-4 h-4"
              })]
            })]
          })]
        }) : /*#__PURE__*/_jsxs("div", {
          className: "flex flex-col items-center justify-center py-20 text-center",
          children: [/*#__PURE__*/_jsx("div", {
            className: "w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4",
            children: /*#__PURE__*/_jsx(FileText, {
              className: "w-8 h-8 text-slate-300"
            })
          }), /*#__PURE__*/_jsx("h3", {
            className: "text-slate-700 mb-2",
            children: "Ch\u01B0a c\xF3 t\xF3m t\u1EAFt"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-slate-400 mb-6",
            style: {
              fontSize: '0.875rem'
            },
            children: "Gi\u1EA3ng vi\xEAn ch\u01B0a publish t\xF3m t\u1EAFt cho b\xE0i gi\u1EA3ng n\xE0y"
          }), /*#__PURE__*/_jsxs("button", {
            onClick: () => {
              setMainTab('review');
              setReviewTab('chat');
            },
            className: "flex items-center gap-2 px-5 py-2.5 text-white rounded-xl hover:opacity-90 transition-opacity",
            style: {
              background: PRIMARY,
              fontSize: '0.875rem'
            },
            children: [/*#__PURE__*/_jsx(MessageSquare, {
              className: "w-4 h-4"
            }), "H\u1ECFi AI thay th\u1EBF"]
          })]
        })
      })
    }), mainTab === 'review' && /*#__PURE__*/_jsxs("div", {
      className: "flex-1 flex flex-col overflow-hidden",
      children: [/*#__PURE__*/_jsx("div", {
        className: "bg-white border-b border-slate-100 flex-shrink-0",
        children: /*#__PURE__*/_jsx("div", {
          className: "flex px-6 gap-0",
          children: [{
            key: 'chat',
            label: 'Hỏi đáp AI',
            icon: MessageSquare
          }, {
            key: 'quiz',
            label: 'Quiz',
            icon: HelpCircle,
            disabled: !hasQuiz
          }].map(({
            key,
            label,
            icon: Icon,
            disabled
          }) => /*#__PURE__*/_jsxs("button", {
            onClick: () => !disabled && setReviewTab(key),
            disabled: disabled,
            className: "flex items-center gap-2 px-5 py-3.5 border-b-2 transition-all",
            style: {
              fontSize: '0.875rem',
              fontWeight: reviewTab === key ? 600 : 400,
              borderBottomColor: reviewTab === key ? PRIMARY : 'transparent',
              color: disabled ? '#cbd5e1' : reviewTab === key ? PRIMARY : '#64748b',
              cursor: disabled ? 'not-allowed' : 'pointer'
            },
            children: [/*#__PURE__*/_jsx(Icon, {
              className: "w-4 h-4"
            }), label, disabled && key === 'quiz' && /*#__PURE__*/_jsx("span", {
              className: "text-slate-300 ml-1",
              style: {
                fontSize: '0.6875rem'
              },
              children: "(ch\u01B0a c\xF3)"
            })]
          }, key))
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "flex-1 overflow-hidden",
        children: [reviewTab === 'chat' && /*#__PURE__*/_jsx(ChatSection, {
          lecture: lecture,
          messages: chatMessages,
          onSend: content => onSendMessage(lecture.id, content)
        }), reviewTab === 'quiz' && hasQuiz && quiz && /*#__PURE__*/_jsx(QuizSection, {
          quiz: quiz
        }), reviewTab === 'quiz' && !hasQuiz && /*#__PURE__*/_jsxs("div", {
          className: "flex flex-col items-center justify-center h-full text-center p-8",
          children: [/*#__PURE__*/_jsx("div", {
            className: "w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4",
            children: /*#__PURE__*/_jsx(HelpCircle, {
              className: "w-8 h-8 text-slate-300"
            })
          }), /*#__PURE__*/_jsx("h3", {
            className: "text-slate-700 mb-2",
            children: "Ch\u01B0a c\xF3 Quiz"
          }), /*#__PURE__*/_jsx("p", {
            className: "text-slate-400",
            style: {
              fontSize: '0.875rem'
            },
            children: "Gi\u1EA3ng vi\xEAn ch\u01B0a publish quiz cho b\xE0i gi\u1EA3ng n\xE0y"
          })]
        })]
      })]
    })]
  });
}
