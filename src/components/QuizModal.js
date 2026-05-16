import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/constants';

const TrueFalseQuestion = ({ question, onAnswer, answered, selected }) => (
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
            <Text style={styles.tfBtnText}>{val ? 'True' : 'False'}</Text>
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
            <Text style={styles.mcLetterText}>
              {String.fromCharCode(65 + idx)}
            </Text>
          </View>
          <Text style={styles.mcText}>{opt}</Text>
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

const QuizModal = ({ visible, quiz, onPass, onClose }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [passed, setPassed] = useState(false);

  const question = quiz?.questions?.[currentQ];
  const total = quiz?.questions?.length || 0;

  const reset = useCallback(() => {
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
    setPassed(false);
  }, []);

  const handleAnswer = useCallback(
    (val) => {
      setSelected(val);
      setAnswered(true);
      if (val === question.correctAnswer) {
        setScore((s) => s + 1);
      }
    },
    [question]
  );

  const handleNext = useCallback(() => {
    if (currentQ + 1 >= total) {
      const finalScore = score + (selected === question.correctAnswer ? 0 : 0);
      const actualScore = score + (answered && selected === question.correctAnswer ? 1 : 0);
      const pct = Math.round((actualScore / total) * 100);
      const didPass = pct >= 60;
      setFinished(true);
      setPassed(didPass);
      if (didPass) onPass?.(quiz.id, actualScore, pct);
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setAnswered(false);
    }
  }, [currentQ, total, score, selected, question, answered, quiz, onPass]);

  if (!quiz || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <LinearGradient colors={[COLORS.primary + '33', 'transparent']} style={styles.headerGrad} />
          <View style={styles.header}>
            <View style={styles.quizBadge}>
              <Ionicons name="help-circle" size={16} color={COLORS.primary} />
              <Text style={styles.quizBadgeText}>Quiz Time</Text>
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
              <Text style={styles.resultTitle}>
                {passed ? '🎉 Excellent!' : 'Not quite...'}
              </Text>
              <Text style={styles.resultSub}>
                {passed
                  ? 'You passed the quiz!'
                  : 'Review the lesson and try again.'}
              </Text>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNum}>{score}/{total}</Text>
                <Text style={styles.scoreLabel}>Correct</Text>
              </View>
              <View style={styles.resultBtns}>
                {!passed && (
                  <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                    <Ionicons name="refresh" size={18} color={COLORS.text} />
                    <Text style={styles.retryBtnText}>Retry Quiz</Text>
                  </TouchableOpacity>
                )}
                {passed && (
                  <TouchableOpacity style={styles.nextBtn} onPress={onClose}>
                    <Text style={styles.nextBtnText}>Continue</Text>
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
              <Text style={styles.qNum}>
                Question {currentQ + 1} of {total}
              </Text>
              <Text style={styles.qText}>{question.text}</Text>

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

              {/* Feedback */}
              {answered && (
                <View style={[
                  styles.feedback,
                  selected === question.correctAnswer ? styles.feedbackCorrect : styles.feedbackWrong,
                ]}>
                  <Ionicons
                    name={selected === question.correctAnswer ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={selected === question.correctAnswer ? COLORS.success : COLORS.error}
                  />
                  <Text style={[
                    styles.feedbackText,
                    { color: selected === question.correctAnswer ? COLORS.success : COLORS.error },
                  ]}>
                    {selected === question.correctAnswer ? 'Correct!' : 'Incorrect'}
                  </Text>
                </View>
              )}

              {answered && (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                  <Text style={styles.nextBtnText}>
                    {currentQ + 1 >= total ? 'See Results' : 'Next'}
                  </Text>
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
});

export default QuizModal;
