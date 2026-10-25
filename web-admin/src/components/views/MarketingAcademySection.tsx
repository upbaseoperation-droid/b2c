'use client';

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  FileQuestion,
  ListChecks,
  Plus,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Clock,
  Building2,
  Users,
  Search,
  Check,
  X,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  Panel,
  Button,
  SearchInput,
  Chips,
  Modal,
  Field,
  Input,
  Select,
  Segmented,
  EmptyState,
} from '../ui';
import {
  TrainingCourse,
  ExamQuiz,
  ExamQuestion,
  UserExamAttempt,
  loadStoredCourses,
  saveStoredCourses,
  loadStoredQuizzes,
  saveStoredQuizzes,
  loadStoredAttempts,
  saveUserExamAttempt,
  generateTrainingCourseAndQuizInternal,
} from '../../lib/marketingLearningEngine';
import { BrandDetail, StorePortfolioItem, UserProfile } from '../../lib/types';
import { REAL_B2C_42_BRANDS } from '../../lib/realB2cBrandsData';

interface MarketingAcademySectionProps {
  currentUser: UserProfile;
  brands?: BrandDetail[];
  stores?: StorePortfolioItem[];
  onNavigateToLibraryArticle?: (articleCode: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type AcademySubTab = 'courses' | 'quizzes' | 'attempts';

export const MarketingAcademySection: React.FC<MarketingAcademySectionProps> = ({
  currentUser,
  brands = [],
  onNavigateToLibraryArticle,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<AcademySubTab>('courses');
  const [courses, setCourses] = useState<TrainingCourse[]>(() => loadStoredCourses());
  const [quizzes, setQuizzes] = useState<ExamQuiz[]>(() => loadStoredQuizzes());
  const [attempts, setAttempts] = useState<UserExamAttempt[]>(() => loadStoredAttempts());

  // Bộ lọc
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Trạng thái Modal Làm bài thi
  const [activeQuiz, setActiveQuiz] = useState<ExamQuiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<{
    score: number;
    total: number;
    pct: number;
    passed: boolean;
  } | null>(null);

  // Trạng thái Modal Đọc giáo trình khóa học
  const [readingCourse, setReadingCourse] = useState<TrainingCourse | null>(null);

  // Trạng thái Modal Khởi tạo khóa học & bộ đề mới
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [genBrandName, setGenBrandName] = useState<string>('');
  const [genTopic, setGenTopic] = useState<string>('Quy trình Lập Kế hoạch & Quản trị Hạn mức');
  const [genRole, setGenRole] = useState<string>('Chuyên viên Booking');
  const [genDifficulty, setGenDifficulty] = useState<'CƠ_BẢN' | 'NÂNG_CAO' | 'CHUYÊN_SÂU'>('NÂNG_CAO');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Danh sách nhãn hàng thực tế
  const availableBrands = useMemo(() => {
    if (brands && brands.length > 0) return brands;
    return REAL_B2C_42_BRANDS;
  }, [brands]);

  // Lọc khóa học
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (roleFilter !== 'ALL' && !c.targetRole.includes(roleFilter)) return false;
      if (brandFilter !== 'ALL') {
        if (brandFilter === 'GENERAL' && c.brandName) return false;
        if (brandFilter !== 'GENERAL' && c.brandName !== brandFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchSummary = c.summary.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchCode) return false;
      }
      return true;
    });
  }, [courses, roleFilter, brandFilter, searchQuery]);

  // Lọc bộ đề
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (roleFilter !== 'ALL' && !q.targetRole.includes(roleFilter)) return false;
      if (brandFilter !== 'ALL') {
        if (brandFilter === 'GENERAL' && q.brandName) return false;
        if (brandFilter !== 'GENERAL' && q.brandName !== brandFilter) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = q.title.toLowerCase().includes(query);
        const matchCode = q.code.toLowerCase().includes(query);
        if (!matchTitle && !matchCode) return false;
      }
      return true;
    });
  }, [quizzes, roleFilter, brandFilter, searchQuery]);

  // Bắt đầu làm bài thi
  const handleStartQuiz = (quiz: ExamQuiz) => {
    setActiveQuiz(quiz);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setExamSubmitted(false);
    setExamResult(null);
  };

  // Chọn đáp án
  const handleSelectAnswer = (questionId: string, optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (examSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  // Nộp bài thi
  const handleSubmitExam = () => {
    if (!activeQuiz) return;
    let score = 0;
    activeQuiz.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctKey) {
        score += 1;
      }
    });

    const total = activeQuiz.questions.length;
    const pct = Math.round((score / total) * 100);
    const passed = pct >= activeQuiz.passScorePct;

    const result = { score, total, pct, passed };
    setExamResult(result);
    setExamSubmitted(true);

    // Lưu kết quả làm bài
    const attempt: UserExamAttempt = {
      id: `att-${Date.now()}`,
      quizId: activeQuiz.id,
      userId: currentUser.id || 'usr-current',
      userName: currentUser.name || 'Chuyên viên B2C',
      startedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      userAnswers,
      score,
      totalQuestions: total,
      percentage: pct,
      passed,
    };

    saveUserExamAttempt(attempt);
    setAttempts(loadStoredAttempts());

    if (onNotify) {
      if (passed) {
        onNotify(`Chúc mừng! Bạn đã đạt ${score}/${total} câu (${pct}%) — Đạt chuẩn sát hạch.`, 'success');
      } else {
        onNotify(`Bạn đạt ${score}/${total} câu (${pct}%). Cần tối thiểu ${activeQuiz.passScorePct}% để đạt chuẩn.`, 'warning');
      }
    }
  };

  // Khởi tạo khóa học & bộ đề mới qua API
  const handleGenerateCourseAndQuiz = async () => {
    if (!genTopic.trim()) {
      if (onNotify) onNotify('Vui lòng nhập chủ đề đào tạo.', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedBrandObj = availableBrands.find((b: BrandDetail) => b.name === genBrandName);

      const promptInput = [
        `YÊU CẦU TẠO KHÓA ĐÀO TẠO & BỘ ĐỀ SÁT HẠCH THỰC CHIẾN B2C:`,
        `- Chủ đề: ${genTopic.trim()}`,
        `- Nhãn hàng: ${genBrandName ? genBrandName : 'Quy trình Chung Phòng B2C'}`,
        `- Vai trò học viên: ${genRole}`,
        `- Cấp độ khó: ${genDifficulty}`,
        `- Số lượng câu hỏi sát hạch: 5 câu tình huống thực tế kèm số liệu`,
        selectedBrandObj
          ? `- Dữ liệu Nhãn hàng: Guideline="${selectedBrandObj.brandGuideline}", Từ cấm="${selectedBrandObj.forbiddenNotes}", Tiêu chuẩn KOC="${selectedBrandObj.kocCriteria}"`
          : '',
      ].join('\n');

      let newCourse: TrainingCourse | null = null;
      let newQuiz: ExamQuiz | null = null;

      try {
        const res = await fetch('/api/integrations/llm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'EXECUTE_PURPOSE',
            purposeId: 'TRAINING_EXAM_GENERATION',
            inputText: promptInput,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.text) {
            try {
              const parsed = JSON.parse(data.text);
              if (parsed.course && parsed.quiz) {
                newCourse = parsed.course;
                newQuiz = parsed.quiz;
              }
            } catch {
              // Nếu trả text không phải JSON, dùng bộ sinh nội bộ
            }
          }
        }
      } catch {
        // Fallback nội bộ
      }

      // Nếu chưa có từ API ngoài, dùng engine nội bộ
      if (!newCourse || !newQuiz) {
        const localGenerated = generateTrainingCourseAndQuizInternal(
          {
            topic: genTopic.trim(),
            brandName: genBrandName || undefined,
            targetRole: genRole,
            difficulty: genDifficulty,
          },
          selectedBrandObj
        );
        newCourse = localGenerated.course;
        newQuiz = localGenerated.quiz;
      }

      // Lưu vào state và storage
      const updatedCourses = [newCourse, ...courses];
      const updatedQuizzes = [newQuiz, ...quizzes];
      setCourses(updatedCourses);
      setQuizzes(updatedQuizzes);
      saveStoredCourses(updatedCourses);
      saveStoredQuizzes(updatedQuizzes);

      setIsGeneratorOpen(false);
      if (onNotify) {
        onNotify(`Đã khởi tạo thành công khóa học "${newCourse.code}" và bộ đề "${newQuiz.code}".`, 'success');
      }
    } catch {
      if (onNotify) onNotify('Không thể khởi tạo khóa học. Vui lòng thử lại.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* THANH ĐIỀU HƯỚNG PHÂN KHU HỌC TẬP & NÚT TẠO MỚI */}
      <Panel>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <Segmented<AcademySubTab>
            value={subTab}
            onChange={setSubTab}
            items={[
              { key: 'courses', label: `Khóa đào tạo (${courses.length})` },
              { key: 'quizzes', label: `Ngân hàng đề thi (${quizzes.length})` },
              { key: 'attempts', label: `Sổ kết quả làm bài (${attempts.length})` },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm theo mã, tiêu đề, nhãn hàng..."
              className="w-full sm:w-64"
            />

            <Button
              variant="primary"
              onClick={() => setIsGeneratorOpen(true)}
              className="gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Khởi tạo khóa học & Bộ đề mới
            </Button>
          </div>
        </div>

        {/* BỘ LỌC THEO VAI TRÒ VÀ NHÃN HÀNG */}
        <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center gap-2">
          <span className="text-2xs font-semibold text-ink-3 uppercase tracking-wider mr-1">Lọc vai trò:</span>
          {[
            { id: 'ALL', label: 'Tất cả vai trò' },
            { id: 'Chuyên viên Booking', label: 'Booking' },
            { id: 'Sáng tạo Nội dung', label: 'Nội dung & QC' },
            { id: 'Pháp chế', label: 'Pháp chế & Kế toán' },
            { id: 'Quản lý', label: 'Trưởng nhóm / Quản lý' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                roleFilter === r.id
                  ? 'bg-ink text-surface border-ink font-semibold'
                  : 'bg-surface text-ink-2 border-line hover:border-line-strong'
              }`}
            >
              {r.label}
            </button>
          ))}

          <span className="text-2xs font-semibold text-ink-3 uppercase tracking-wider ml-2 mr-1">Nhãn hàng:</span>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="text-xs px-2.5 py-1 rounded-lg border border-line bg-surface text-ink font-medium focus:outline-none focus:border-accent"
          >
            <option value="ALL">Tất cả nhãn hàng</option>
            <option value="GENERAL">Quy trình chung B2C</option>
            {availableBrands.slice(0, 15).map((b: BrandDetail) => (
              <option key={b.id || b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          {(roleFilter !== 'ALL' || brandFilter !== 'ALL' || searchQuery.trim()) && (
            <button
              onClick={() => {
                setRoleFilter('ALL');
                setBrandFilter('ALL');
                setSearchQuery('');
              }}
              className="text-2xs text-accent hover:underline flex items-center gap-1 ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </Panel>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: KHÓA ĐÀO TẠO & LỘ TRÌNH HỌC TẬP                               */}
      {/* ========================================================================= */}
      {subTab === 'courses' && (
        <div className="space-y-4">
          {filteredCourses.length === 0 ? (
            <Panel>
              <EmptyState
                title="Không tìm thấy khóa đào tạo phù hợp"
                description="Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc nhãn hàng/vai trò khác."
                action={
                  <Button variant="secondary" onClick={() => setIsGeneratorOpen(true)}>
                    Khởi tạo khóa học mới
                  </Button>
                }
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((c) => {
                const linkedQuiz = quizzes.find((q) => q.id === c.quizId);
                return (
                  <Panel key={c.id} className="flex flex-col justify-between hover:border-accent/40 transition-all">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sunken text-ink">
                          {c.code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {c.brandName && (
                            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                              {c.brandName}
                            </span>
                          )}
                          <span
                            className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                              c.difficulty === 'CƠ_BẢN'
                                ? 'bg-positive/10 text-positive'
                                : c.difficulty === 'NÂNG_CAO'
                                ? 'bg-warning/15 text-warning-hover'
                                : 'bg-critical/10 text-critical'
                            }`}
                          >
                            {c.difficulty === 'CƠ_BẢN'
                              ? 'Cơ bản'
                              : c.difficulty === 'NÂNG_CAO'
                              ? 'Nâng cao'
                              : 'Chuyên sâu'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-ink line-clamp-2">{c.title}</h3>

                      <p className="text-xs text-ink-2 line-clamp-3 leading-relaxed">{c.summary}</p>

                      <div className="pt-2 border-t border-line flex items-center justify-between text-2xs text-ink-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {c.durationMinutes} phút ({c.modules.length} bài)
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {c.completedCount || 0} nhân sự hoàn thành
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => setReadingCourse(c)}
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1" />
                        Xem giáo trình
                      </Button>

                      {linkedQuiz && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 justify-center gap-1"
                          onClick={() => handleStartQuiz(linkedQuiz)}
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Sát hạch
                        </Button>
                      )}
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: NGÂN HÀNG ĐỀ THI SÁT HẠCH                                     */}
      {/* ========================================================================= */}
      {subTab === 'quizzes' && (
        <div className="space-y-4">
          {filteredQuizzes.length === 0 ? (
            <Panel>
              <EmptyState
                title="Không có bộ đề sát hạch nào phù hợp"
                description="Thử đổi bộ lọc hoặc bấm tạo bộ đề sát hạch mới từ dữ liệu nhãn hàng."
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((q) => {
                const quizAttempts = attempts.filter((a) => a.quizId === q.id);
                const bestAttempt = quizAttempts.sort((a, b) => b.score - a.score)[0];

                return (
                  <Panel key={q.id} className="flex flex-col justify-between hover:border-accent/40 transition-all">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sunken text-ink">
                          {q.code}
                        </span>
                        {q.brandName && (
                          <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                            {q.brandName}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-ink line-clamp-2">{q.title}</h3>

                      <div className="space-y-1 text-xs text-ink-2">
                        <div className="flex justify-between">
                          <span className="text-ink-3">Đối tượng:</span>
                          <span className="font-medium text-ink">{q.targetRole}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-3">Quy mô:</span>
                          <span className="font-medium text-ink">{q.questions.length} câu tình huống</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-3">Chuẩn đạt:</span>
                          <span className="font-medium text-positive">Đạt từ {q.passScorePct}% điểm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-3">Thời gian:</span>
                          <span className="font-medium text-ink">{q.timeLimitMinutes} phút</span>
                        </div>
                      </div>

                      {bestAttempt && (
                        <div className="mt-2 p-2 rounded bg-canvas border border-line text-2xs flex items-center justify-between">
                          <span className="text-ink-3">Kết quả tốt nhất của bạn:</span>
                          <span
                            className={`font-semibold font-mono ${
                              bestAttempt.passed ? 'text-positive' : 'text-warning'
                            }`}
                          >
                            {bestAttempt.score}/{bestAttempt.totalQuestions} ({bestAttempt.percentage}%)
                            {bestAttempt.passed ? ' — ĐẠT' : ' — CHƯA ĐẠT'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                      <span className="text-2xs text-ink-3">
                        {q.isCustomGenerated ? 'Khởi tạo theo yêu cầu' : 'Bộ đề chuẩn hóa'}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStartQuiz(q)}
                        className="gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Bắt đầu làm bài
                      </Button>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: SỔ KẾT QUẢ SÁT HẠCH                                            */}
      {/* ========================================================================= */}
      {subTab === 'attempts' && (
        <Panel title={`Lịch sử làm bài sát hạch của nhân sự (${attempts.length} lượt)`} flush>
          {attempts.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Chưa có dữ liệu làm bài sát hạch"
                description="Chọn một bộ đề trong Ngân hàng đề thi và hoàn thành bài kiểm tra để lưu điểm số vào sổ kết quả."
                action={
                  <Button variant="primary" onClick={() => setSubTab('quizzes')}>
                    Xem ngân hàng đề thi
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-sunken text-ink-3 border-b border-line text-left">
                    <th className="py-2.5 px-4 font-semibold">Thời điểm</th>
                    <th className="py-2.5 px-4 font-semibold">Nhân sự</th>
                    <th className="py-2.5 px-4 font-semibold">Bộ đề thi</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Điểm số</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Tỷ lệ</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Xếp loại</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {attempts.map((att) => {
                    const matchedQuiz = quizzes.find((q) => q.id === att.quizId);
                    return (
                      <tr key={att.id} className="hover:bg-canvas transition-colors">
                        <td className="py-2.5 px-4 text-ink-3 whitespace-nowrap">
                          {new Date(att.startedAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-ink whitespace-nowrap">
                          {att.userName}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-ink">
                          {matchedQuiz ? matchedQuiz.title : att.quizId}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-ink text-center">
                          {att.score} / {att.totalQuestions}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-center">
                          {att.percentage}%
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-semibold text-2xs ${
                              att.passed
                                ? 'bg-positive/10 text-positive'
                                : 'bg-critical/10 text-critical'
                            }`}
                          >
                            {att.passed ? 'ĐẠT CHUẨN' : 'CHƯA ĐẠT'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {matchedQuiz && (
                            <button
                              onClick={() => handleStartQuiz(matchedQuiz)}
                              className="text-accent hover:underline font-semibold"
                            >
                              Làm lại
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ĐỌC GIÁO TRÌNH BÀI HỌC                                             */}
      {/* ========================================================================= */}
      {readingCourse && (
        <Modal
          open={!!readingCourse}
          onClose={() => setReadingCourse(null)}
          title={`Giáo trình: ${readingCourse.code} — ${readingCourse.title}`}
          size="2xl"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-3 bg-canvas rounded-lg border border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">Đối tượng: {readingCourse.targetRole}</span>
                {readingCourse.brandName && (
                  <span className="px-2 py-0.5 rounded bg-accent-soft text-accent font-semibold text-2xs">
                    {readingCourse.brandName}
                  </span>
                )}
              </div>
              <span className="text-ink-3">Thời lượng ước tính: {readingCourse.durationMinutes} phút</span>
            </div>

            <div className="space-y-4">
              {readingCourse.modules.map((mod, idx) => (
                <div key={mod.id} className="p-4 rounded-xl border border-line bg-surface space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h4 className="text-sm font-semibold text-ink">{mod.title}</h4>
                    {mod.linkedSopCode && (
                      <span className="font-mono text-2xs font-semibold px-2 py-0.5 rounded bg-sunken text-ink">
                        {mod.linkedSopCode}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-ink-2 leading-relaxed whitespace-pre-line space-y-2">
                    {mod.content}
                  </div>

                  {mod.linkedSopCode && onNavigateToLibraryArticle && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setReadingCourse(null);
                          onNavigateToLibraryArticle(mod.linkedSopCode || '');
                        }}
                        className="text-2xs font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Xem chi tiết quy trình chuẩn trong Kho tài liệu
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <Button variant="secondary" onClick={() => setReadingCourse(null)}>
                Đóng
              </Button>

              {quizzes.find((q) => q.id === readingCourse.quizId) && (
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onClick={() => {
                    const targetQuiz = quizzes.find((q) => q.id === readingCourse.quizId);
                    setReadingCourse(null);
                    if (targetQuiz) handleStartQuiz(targetQuiz);
                  }}
                >
                  <PlayCircle className="w-4 h-4" />
                  Bắt đầu làm bài thi sát hạch ngay
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LÀM BÀI THI SÁT HẠCH NGHIỆP VỤ                                     */}
      {/* ========================================================================= */}
      {activeQuiz && (
        <Modal
          open={!!activeQuiz}
          onClose={() => setActiveQuiz(null)}
          title={`Bài thi sát hạch: ${activeQuiz.code} — ${activeQuiz.title}`}
          size="xl"
        >
          <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            {/* THANH TIẾN ĐỘ VÀ KẾT QUẢ NẾU ĐÃ NỘP */}
            {!examSubmitted ? (
              <div className="p-3 bg-canvas rounded-lg border border-line flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">
                  Câu hỏi {currentQuestionIndex + 1} / {activeQuiz.questions.length}
                </span>
                <span className="text-ink-3">
                  Thời lượng: {activeQuiz.timeLimitMinutes} phút · Đạt từ {activeQuiz.passScorePct}%
                </span>
              </div>
            ) : (
              examResult && (
                <div
                  className={`p-4 rounded-xl border ${
                    examResult.passed
                      ? 'bg-positive/10 border-positive/30 text-positive'
                      : 'bg-critical/10 border-critical/30 text-critical'
                  } space-y-1.5`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {examResult.passed ? 'KẾT QUẢ: ĐẠT CHUẨN SÁT HẠCH' : 'KẾT QUẢ: CHƯA ĐẠT CHUẨN'}
                    </span>
                    <span className="text-lg font-bold font-mono">
                      {examResult.score} / {examResult.total} ({examResult.pct}%)
                    </span>
                  </div>
                  <p className="text-xs">
                    {examResult.passed
                      ? 'Bạn đã hoàn thành xuất sắc bài sát hạch nghiệp vụ và đủ điều kiện vận hành theo quy trình chuẩn.'
                      : `Điểm số của bạn chưa đạt ngưỡng tối thiểu ${activeQuiz.passScorePct}%. Vui lòng xem kỹ giải thích và quy trình SOP bên dưới để ôn tập.`}
                  </p>
                </div>
              )
            )}

            {/* DANH SÁCH CÂU HỎI */}
            {!examSubmitted ? (
              // Chế độ đang làm bài: hiển thị câu hỏi hiện tại
              activeQuiz.questions[currentQuestionIndex] && (
                <div className="p-4 rounded-xl border border-line bg-surface space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-2xs font-bold text-accent uppercase tracking-wider">
                        {activeQuiz.questions[currentQuestionIndex].type === 'SCENARIO_CASE'
                          ? 'Tình huống thực tế'
                          : 'Câu hỏi trắc nghiệm'}
                      </span>
                      <h4 className="text-sm font-semibold text-ink leading-relaxed">
                        {activeQuiz.questions[currentQuestionIndex].prompt}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {activeQuiz.questions[currentQuestionIndex].options.map((opt) => {
                      const qId = activeQuiz.questions[currentQuestionIndex].id;
                      const isSelected = userAnswers[qId] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectAnswer(qId, opt.key)}
                          className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-accent-soft border-accent text-ink font-medium shadow-sm'
                              : 'bg-surface hover:bg-canvas border-line text-ink-2'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected
                                ? 'bg-accent text-white'
                                : 'bg-sunken text-ink-3'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-xs leading-relaxed pt-0.5">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ĐIỀU HƯỚNG CÂU HỎI */}
                  <div className="pt-3 border-t border-line flex items-center justify-between">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    >
                      Câu trước
                    </Button>

                    <div className="flex gap-1.5 overflow-x-auto">
                      {activeQuiz.questions.map((q, idx) => {
                        const hasAns = !!userAnswers[q.id];
                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={`w-7 h-7 rounded text-xs font-semibold font-mono transition-all ${
                              idx === currentQuestionIndex
                                ? 'bg-ink text-surface'
                                : hasAns
                                ? 'bg-positive/20 text-positive border border-positive/30'
                                : 'bg-sunken text-ink-3 hover:text-ink'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setCurrentQuestionIndex((prev) => Math.min(activeQuiz.questions.length - 1, prev + 1))
                        }
                      >
                        Câu tiếp theo
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={handleSubmitExam}>
                        Nộp bài & Chấm điểm
                      </Button>
                    )}
                  </div>
                </div>
              )
            ) : (
              // Chế độ sau khi nộp bài: hiển thị đáp án và giải thích chi tiết toàn bộ các câu
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
                  Chi tiết bài làm & Giải thích đáp án:
                </h4>

                {activeQuiz.questions.map((q, qIdx) => {
                  const userChoice = userAnswers[q.id];
                  const isCorrect = userChoice === q.correctKey;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border ${
                        isCorrect ? 'border-positive/30 bg-surface' : 'border-critical/30 bg-surface'
                      } space-y-3`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-ink">
                          Câu {qIdx + 1}: {q.prompt}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-2xs font-semibold shrink-0 ${
                            isCorrect ? 'bg-positive/10 text-positive' : 'bg-critical/10 text-critical'
                          }`}
                        >
                          {isCorrect ? 'ĐÚNG' : 'SAI'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {q.options.map((opt) => {
                          const isOptionCorrect = opt.key === q.correctKey;
                          const isOptionUser = opt.key === userChoice;

                          let badgeClass = 'bg-sunken text-ink-3 border-transparent';
                          if (isOptionCorrect) {
                            badgeClass = 'bg-positive/15 text-positive border-positive/30 font-semibold';
                          } else if (isOptionUser && !isOptionCorrect) {
                            badgeClass = 'bg-critical/15 text-critical border-critical/30 line-through';
                          }

                          return (
                            <div
                              key={opt.key}
                              className={`p-2 rounded border flex items-start gap-2.5 ${badgeClass}`}
                            >
                              <span className="font-bold font-mono">{opt.key}.</span>
                              <span className="leading-relaxed">{opt.label}</span>
                              {isOptionCorrect && (
                                <span className="ml-auto text-2xs font-semibold text-positive flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Đáp án chuẩn
                                </span>
                              )}
                              {isOptionUser && !isOptionCorrect && (
                                <span className="ml-auto text-2xs font-semibold text-critical">
                                  Lựa chọn của bạn
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-canvas rounded-lg border border-line text-xs space-y-1.5">
                        <div className="font-semibold text-ink flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                          Giải thích căn cứ nghiệp vụ:
                        </div>
                        <p className="text-ink-2 leading-relaxed">{q.explanation}</p>
                        <div className="pt-1 flex items-center justify-between text-2xs">
                          <span className="text-ink-3">Căn cứ quy trình:</span>
                          <span className="font-mono font-semibold text-accent">{q.citedSopCode}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* HÀNH ĐỘNG DƯỚI CÙNG */}
            <div className="pt-3 border-t border-line flex items-center justify-between">
              <Button variant="secondary" onClick={() => setActiveQuiz(null)}>
                Đóng
              </Button>

              {examSubmitted && (
                <Button
                  variant="primary"
                  className="gap-1.5"
                  onClick={() => {
                    setUserAnswers({});
                    setCurrentQuestionIndex(0);
                    setExamSubmitted(false);
                    setExamResult(null);
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Làm lại đề thi này
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KHỞI TẠO KHÓA HỌC & BỘ ĐỀ MỚI                                     */}
      {/* ========================================================================= */}
      {isGeneratorOpen && (
        <Modal
          open={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          title="Khởi tạo khóa học & bộ đề sát hạch mới"
          size="lg"
        >
          <div className="space-y-4">
            <Field label="Nhãn hàng mục tiêu">
              <Select
                value={genBrandName}
                onChange={(e) => setGenBrandName(e.target.value)}
              >
                <option value="">Quy trình chung toàn phòng Marketing B2C</option>
                {availableBrands.map((b: BrandDetail) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name} ({b.category || 'Mỹ phẩm & Chăm sóc'})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Chủ đề đào tạo & khảo thí">
              <Input
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="VD: Kiểm duyệt kịch bản & từ cấm, Đàm phán thù lao Net/Gross..."
              />
            </Field>

            <div className="flex flex-wrap gap-1.5">
              {[
                'Quy trình Lập Kế hoạch & Quản trị Hạn mức',
                'Kiểm duyệt Kịch bản & 110 Từ khóa cấm sàn',
                'Pháp chế Hợp đồng, Thuế TNCN & Đối soát Nghiệm thu',
                'Kỹ năng Đàm phán Thù lao & Quyền lợi Mã Ads',
                'Brand Guideline & Chiến thuật Booking Nhãn hàng',
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setGenTopic(sug)}
                  className="text-2xs px-2.5 py-1 rounded bg-sunken hover:bg-line text-ink-2 transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Đối tượng học viên">
                <Select
                  value={genRole}
                  onChange={(e) => setGenRole(e.target.value)}
                >
                  <option value="Chuyên viên Booking">Chuyên viên Booking</option>
                  <option value="Sáng tạo Nội dung">Sáng tạo Nội dung & QC</option>
                  <option value="Pháp chế & Kế toán">Pháp chế & Kế toán</option>
                  <option value="Trưởng nhóm & Quản lý">Trưởng nhóm & Quản lý</option>
                  <option value="Toàn bộ phòng B2C">Toàn bộ phòng B2C</option>
                </Select>
              </Field>

              <Field label="Cấp độ khó">
                <Select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value as any)}
                >
                  <option value="CƠ_BẢN">Cơ bản</option>
                  <option value="NÂNG_CAO">Nâng cao</option>
                  <option value="CHUYÊN_SÂU">Chuyên sâu</option>
                </Select>
              </Field>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <Button
                variant="secondary"
                disabled={isGenerating}
                onClick={() => setIsGeneratorOpen(false)}
              >
                Hủy bỏ
              </Button>

              <Button
                variant="primary"
                disabled={isGenerating || !genTopic.trim()}
                onClick={handleGenerateCourseAndQuiz}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang tổng hợp dữ liệu...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Tạo khóa học & Bộ đề
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
