import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/constants';
import { useTranslation } from '../utils/useTranslation';
import { shuffle } from '../utils/helpers';
import AppText from './AppText';

const TrueFalseQuestion = ({ question, onAnswer, answered, selected }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.qBody}>
      <View style={styles.tfRow}>
        {[true, false].map((val) => {
          const isSelected = selected === val;
          const isCorrect = answered && val === question.correctAnswer;
          const isWrong = answered && isSelected && val !== question.correctAnswer;
          return (
            <TouchableOpacity
              key={String(val)}
              style={[
                styles.tfBtn,
                isSelected && !answered && styles.tfBtnSelected,
                isCorrect && styles.tfBtnCorrect,
                isWrong && styles.tfBtnWrong,
              ]}
              onPress={() => !answered && onAnswer(val)}
              activeOpacity={0.8}
            >
              <AppText style={styles.tfBtnText}>{val ? t('trueText') : t('falseText')}</AppText>
              {answered && (isCorrect ? (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              ) : isWrong ? (
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
              ) : null)}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MultipleChoiceQuestion = ({ question, onAnswer, answered, selected }) => (
  <View style={styles.qBody}>
    {question.options.map((opt, idx) => {
      const isSelected = selected === idx;
      const isCorrect = answered && idx === question.correctAnswer;
      const isWrong = answered && isSelected && idx !== question.correctAnswer;
      return (
        <TouchableOpacity
          key={idx}
          style={[
            styles.mcOption,
            isSelected && !answered && styles.mcOptionSelected,
            isCorrect && styles.mcOptionCorrect,
            isWrong && styles.mcOptionWrong,
          ]}
          onPress={() => !answered && onAnswer(idx)}
          activeOpacity={0.8}
        >
          <View style={styles.mcLetter}>
            <AppText style={styles.mcLetterText}>
              {String.fromCharCode(65 + idx)}
            </AppText>
          </View>
          <AppText style={styles.mcText}>{opt}</AppText>
          {answered && isCorrect && (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.mcIcon} />
          )}
          {answered && isWrong && (
            <Ionicons name="close-circle" size={20} color={COLORS.error} style={styles.mcIcon} />
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

const SortZoneQuestion = ({ question, onComplete }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null); // 'left' | 'right'
  const [submitted, setSubmitted] = useState(false);

  const handleZoneTap = (zone) => {
    if (submitted) return;
    setSelected(zone);
  };

  const handleSubmit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    onComplete(selected === question.correctZone, selected);
  };

  return (
    <View style={styles.szContainer}>
      <View style={styles.szImageWrapper}>
        <Image source={{ uri: question.imageUri }} style={styles.szImage} resizeMode="cover" />
      </View>

      <AppText style={styles.szHint}>{t('sortZoneHint')}</AppText>

      <View style={styles.szZonesRow}>
        {[
          { zone: 'left', label: question.leftLabel },
          { zone: 'right', label: question.rightLabel },
        ].map(({ zone, label }) => {
          const isSelected = selected === zone;
          const isCorrect = submitted && zone === question.correctZone;
          const isWrong = submitted && isSelected && zone !== question.correctZone;

          return (
            <TouchableOpacity
              key={zone}
              style={[
                styles.szZone,
                isSelected && !submitted && styles.szZoneSelected,
                isCorrect && styles.szZoneCorrect,
                isWrong && styles.szZoneWrong,
              ]}
              onPress={() => handleZoneTap(zone)}
              activeOpacity={0.8}
              disabled={submitted}
            >
              {isSelected && !submitted && (
                <Image source={{ uri: question.imageUri }} style={styles.szMiniImg} resizeMode="cover" />
              )}
              {submitted && (isCorrect || isWrong) && (
                <Ionicons
                  name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={28}
                  color={isCorrect ? COLORS.success : COLORS.error}
                />
              )}
              <AppText
                style={[
                  styles.szZoneLabel,
                  isSelected && !submitted && { color: COLORS.primary },
                  isCorrect && { color: COLORS.success },
                  isWrong && { color: COLORS.error },
                ]}
                numberOfLines={3}
              >
                {label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {!submitted && selected && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleSubmit}>
          <AppText style={styles.nextBtnText}>{t('confirmZone')}</AppText>
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const ImageMatchingQuestion = ({ question, answered, onComplete }) => {
  const { t } = useTranslation();
  const shuffledLabels = useMemo(() => shuffle(question.pairs.map((p) => p.label)), [question.id]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selections, setSelections] = useState({});
  const [checked, setChecked] = useState(false);

  const isComplete = question.pairs.every((p) => selections[p.id] != null);

  const handleImageTap = (pairId) => {
    if (checked) return;
    setSelectedImage((prev) => (prev === pairId ? null : pairId));
  };

  const handleLabelTap = (label) => {
    if (checked || !selectedImage) return;
    setSelections((prev) => {
      const next = { ...prev };
      // Un-assign any pair that already has this label
      Object.keys(next).forEach((k) => { if (next[k] === label) delete next[k]; });
      next[selectedImage] = label;
      return next;
    });
    setSelectedImage(null);
  };

  const handleCheck = () => {
    setChecked(true);
    const allCorrect = question.pairs.every((p) => selections[p.id] === p.label);
    // Backend grading format: { [imageUrl]: label } — imageUri carries the
    // original backend image URL (see mapLesson pair normalization)
    const matches = {};
    question.pairs.forEach((p) => { matches[p.imageUri] = selections[p.id]; });
    onComplete(allCorrect, matches);
  };

  const usedLabels = new Set(Object.values(selections));

  return (
    <View style={styles.matchContainer}>
      <AppText style={styles.matchHint}>{t('selectImageFirst')}</AppText>
      <View style={styles.matchRow}>
        {/* Images column */}
        <View style={styles.matchCol}>
          {question.pairs.map((p) => {
            const isSel = selectedImage === p.id;
            const isCorrect = checked && selections[p.id] === p.label;
            const isWrong = checked && selections[p.id] !== p.label;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.matchImageCard,
                  isSel && styles.matchImageSelected,
                  checked && isCorrect && styles.matchCorrect,
                  checked && isWrong && styles.matchWrong,
                ]}
                onPress={() => handleImageTap(p.id)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: p.imageUri }} style={styles.matchImage} />
                {checked && (
                  <View style={styles.matchCheck}>
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={isCorrect ? COLORS.success : COLORS.error}
                    />
                  </View>
                )}
                {selections[p.id] && (
                  <AppText style={styles.matchAssigned} numberOfLines={1}>{selections[p.id]}</AppText>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Labels column */}
        <View style={styles.matchCol}>
          {shuffledLabels.map((label) => {
            const isUsed = usedLabels.has(label);
            return (
              <TouchableOpacity
                key={label}
                style={[styles.matchLabel, isUsed && styles.matchLabelUsed, checked && styles.matchLabelDone]}
                onPress={() => handleLabelTap(label)}
                disabled={checked}
                activeOpacity={0.8}
              >
                <AppText style={[styles.matchLabelText, isUsed && styles.matchLabelUsedText]} numberOfLines={2}>{label}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!checked && isComplete && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleCheck}>
          <AppText style={styles.nextBtnText}>{t('checkMatches')}</AppText>
          <Ionicons name="checkmark-done" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const QuizModal = ({ visible, quiz, onPass, onClose }) => {
  const { width: W } = useWindowDimensions();
  const { t } = useTranslation();
  const isWide = W >= 600;
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [passed, setPassed] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalPct, setFinalPct] = useState(0);
  // Raw per-question answers in the backend's grading format, indexed by question
  const answersRef = useRef([]);

  const question = quiz?.questions?.[currentQ];
  const total = quiz?.questions?.length || 0;

  const reset = useCallback(() => {
    answersRef.current = [];
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
    setPassed(false);
    setFinalScore(0);
    setFinalPct(0);
  }, []);

  // Reset state each time the modal opens so stale results don't show
  useEffect(() => {
    if (visible) reset();
  }, [visible]);

  const handleAnswer = useCallback(
    (val) => {
      setSelected(val);
      setAnswered(true);
      // Backend grades multipleChoice against the option label, not the index
      answersRef.current[currentQ] = question.type === 'multiplechoice'
        ? question.options?.[val]
        : val;
      if (val === question.correctAnswer) {
        setScore((s) => s + 1);
      }
    },
    [question, currentQ]
  );

  const handleMatchComplete = useCallback(
    (isAllCorrect, rawAnswer) => {
      setSelected(isAllCorrect);
      setAnswered(true);
      answersRef.current[currentQ] = rawAnswer;
      if (isAllCorrect) setScore((s) => s + 1);
    },
    [currentQ]
  );

  const handleNext = useCallback(() => {
    if (currentQ + 1 >= total) {
      // score state is already updated by handleAnswer before Next is pressed
      const pct = Math.round((score / total) * 100);
      // All questions must be answered correctly to pass (matches backend
      // PASS_THRESHOLD = 1.0)
      const didPass = score === total;
      setFinalScore(score);
      setFinalPct(pct);
      setFinished(true);
      setPassed(didPass);
      // onPass deferred — called when user presses "Continue"
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setAnswered(false);
    }
  }, [currentQ, total, score]);

  // Called by the "Continue" button on the pass results screen
  const handleContinue = useCallback(() => {
    onPass?.(quiz.id, finalScore, finalPct, answersRef.current);
  }, [quiz, finalScore, finalPct, onPass]);

  if (!quiz || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, isWide && { maxWidth: 560, width: '100%', alignSelf: 'center', borderRadius: 24 }]}>
          {/* Header */}
          <LinearGradient colors={[COLORS.primary + '33', 'transparent']} style={styles.headerGrad} />
          <View style={styles.header}>
            <View style={styles.quizBadge}>
              <Ionicons name="help-circle" size={16} color={COLORS.primary} />
              <AppText style={styles.quizBadgeText}>{t('quizTime')}</AppText>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {finished ? (
            // Results screen
            <View style={styles.results}>
              <View style={[styles.resultIcon, { backgroundColor: passed ? COLORS.success + '22' : COLORS.error + '22' }]}>
                <Ionicons
                  name={passed ? 'trophy' : 'refresh-circle'}
                  size={60}
                  color={passed ? COLORS.success : COLORS.error}
                />
              </View>
              <AppText style={styles.resultTitle}>
                {passed ? `🎉 ${t('excellent')}` : t('notQuite')}
              </AppText>
              <AppText style={styles.resultSub}>
                {passed ? t('quizPassedMsg') : t('quizFailedMsg')}
              </AppText>
              <View style={styles.scoreBox}>
                <AppText style={styles.scoreNum}>{score}/{total}</AppText>
                <AppText style={styles.scoreLabel}>{t('correctLabel')}</AppText>
              </View>
              <View style={styles.resultBtns}>
                {!passed && (
                  <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                    <Ionicons name="refresh" size={18} color={COLORS.text} />
                    <AppText style={styles.retryBtnText}>{t('retryQuiz')}</AppText>
                  </TouchableOpacity>
                )}
                {passed && (
                  <TouchableOpacity style={styles.nextBtn} onPress={handleContinue}>
                    <AppText style={styles.nextBtnText}>{t('continue')}</AppText>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {/* Progress */}
              <View style={styles.progress}>
                {quiz.questions.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      i < currentQ && styles.progressDotDone,
                      i === currentQ && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>

              {/* Question */}
              <AppText style={styles.qNum}>
                {t('question')} {currentQ + 1} {t('of')} {total}
              </AppText>
              <AppText style={styles.qText}>{question.text}</AppText>

              {/* Answer options */}
              {question.type === 'truefalse' && (
                <TrueFalseQuestion
                  question={question}
                  onAnswer={handleAnswer}
                  answered={answered}
                  selected={selected}
                />
              )}
              {question.type === 'multiplechoice' && (
                <MultipleChoiceQuestion
                  question={question}
                  onAnswer={handleAnswer}
                  answered={answered}
                  selected={selected}
                />
              )}
              {question.type === 'imagematching' && (
                <ImageMatchingQuestion
                  question={question}
                  answered={answered}
                  onComplete={handleMatchComplete}
                />
              )}
              {question.type === 'sortzone' && (
                <SortZoneQuestion
                  question={question}
                  onComplete={handleMatchComplete}
                />
              )}

              {/* Feedback — skip for imagematching / sortzone (both show inline) */}
              {answered && question.type !== 'imagematching' && question.type !== 'sortzone' && (
                <View style={[
                  styles.feedback,
                  selected === question.correctAnswer ? styles.feedbackCorrect : styles.feedbackWrong,
                ]}>
                  <Ionicons
                    name={selected === question.correctAnswer ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={selected === question.correctAnswer ? COLORS.success : COLORS.error}
                  />
                  <AppText style={[
                    styles.feedbackText,
                    { color: selected === question.correctAnswer ? COLORS.success : COLORS.error },
                  ]}>
                    {selected === question.correctAnswer ? t('correctFeedback') : t('incorrectFeedback')}
                  </AppText>
                </View>
              )}

              {answered && (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                  <AppText style={styles.nextBtnText}>
                    {currentQ + 1 >= total ? t('seeResults') : t('nextQuestion')}
                  </AppText>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  headerGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  quizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.borderRadiusFull,
  },
  quizBadgeText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: SIZES.sm,
  },
  body: {
    padding: 20,
    paddingTop: 8,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  progressDot: {
    height: 4,
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progressDotDone: { backgroundColor: COLORS.success },
  progressDotActive: { backgroundColor: COLORS.primary },
  qNum: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 8,
  },
  qText: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 24,
  },
  qBody: { gap: 12 },
  // True/False
  tfRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tfBtnSelected: { borderColor: COLORS.primary },
  tfBtnCorrect: { borderColor: COLORS.success, backgroundColor: COLORS.success + '22' },
  tfBtnWrong: { borderColor: COLORS.error, backgroundColor: COLORS.error + '22' },
  tfBtnText: { color: COLORS.text, fontWeight: '700', fontSize: SIZES.base },
  // Multiple Choice
  mcOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mcOptionSelected: { borderColor: COLORS.primary },
  mcOptionCorrect: { borderColor: COLORS.success, backgroundColor: COLORS.success + '22' },
  mcOptionWrong: { borderColor: COLORS.error, backgroundColor: COLORS.error + '22' },
  mcLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mcLetterText: { color: COLORS.text, fontWeight: '700', fontSize: SIZES.sm },
  mcText: { flex: 1, color: COLORS.text, fontSize: SIZES.md },
  mcIcon: { marginLeft: 'auto' },
  // Feedback
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  feedbackCorrect: { backgroundColor: COLORS.success + '22' },
  feedbackWrong: { backgroundColor: COLORS.error + '22' },
  feedbackText: { fontWeight: '700', fontSize: SIZES.sm },
  // Buttons
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: SIZES.base },
  // Results
  results: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  resultIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    color: COLORS.text,
    fontSize: SIZES.xxl,
    fontWeight: '800',
  },
  resultSub: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
    textAlign: 'center',
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 16,
    marginTop: 8,
  },
  scoreNum: {
    color: COLORS.text,
    fontSize: SIZES.xxxl,
    fontWeight: '800',
  },
  scoreLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  resultBtns: { width: '100%', marginTop: 8 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 14,
  },
  retryBtnText: { color: COLORS.text, fontWeight: '700', fontSize: SIZES.base },
  // Image Matching
  matchContainer: { paddingTop: 4, gap: 12 },
  matchHint: { color: COLORS.textMuted, fontSize: SIZES.xs, textAlign: 'center', marginBottom: 4 },
  matchRow: { flexDirection: 'row', gap: 12 },
  matchCol: { flex: 1, gap: 10 },
  matchImageCard: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  matchImageSelected: { borderColor: COLORS.secondary },
  matchCorrect: { borderColor: COLORS.success },
  matchWrong: { borderColor: COLORS.error },
  matchImage: { width: '100%', height: 72 },
  matchCheck: { position: 'absolute', top: 4, right: 4 },
  matchAssigned: {
    backgroundColor: COLORS.secondary + 'DD',
    color: '#000',
    fontSize: SIZES.xs,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    textAlign: 'center',
  },
  matchLabel: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 72,
    justifyContent: 'center',
  },
  matchLabelUsed: { backgroundColor: COLORS.secondary + '22', borderColor: COLORS.secondary + '55' },
  matchLabelDone: { opacity: 0.7 },
  matchLabelText: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '600', textAlign: 'center' },
  matchLabelUsedText: { color: COLORS.secondary },
  // Sort Zone
  szContainer: { paddingTop: 4, gap: 14 },
  szImageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  szImage: { width: '100%', height: '100%' },
  szHint: { color: COLORS.textMuted, fontSize: SIZES.xs, textAlign: 'center' },
  szZonesRow: { flexDirection: 'row', gap: 12 },
  szZone: {
    flex: 1,
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  szZoneSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  szZoneCorrect: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '22',
  },
  szZoneWrong: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '22',
  },
  szMiniImg: { width: 52, height: 52, borderRadius: 8 },
  szZoneLabel: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: SIZES.base,
    textAlign: 'center',
  },
});

export default QuizModal;
