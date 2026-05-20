import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
  StatusBar,
  ActivityIndicator,
  Share,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoPlayer from '../components/VideoPlayer';
import { COLORS, SIZES } from '../utils/constants';
import { formatDuration, shuffle, formatLargeNumber } from '../utils/helpers';
import QuizModal from '../components/QuizModal';
import CommentThread from '../components/CommentThread';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import { scheduleLessonCompleteNotification, scheduleQuizPassNotification, scheduleEnrollmentNotification } from '../services/notificationService';
import { useToast } from '../context/ToastContext';
import StreakCelebration from '../components/StreakCelebration';
import AppText from '../components/AppText';

const SWIPE_THRESHOLD = 50;

// --- Content renderers ---

const TextContent = ({ lesson }) => (
  <ScrollView
    style={styles.textScroll}
    contentContainerStyle={styles.textContent}
    showsVerticalScrollIndicator={false}
  >
    <AppText style={styles.textTitle}>{lesson.title}</AppText>
    <AppText style={styles.textBody}>{lesson.content.body}</AppText>
  </ScrollView>
);

const ImageContent = ({ lesson, slideWidth, slideHeight }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const images = lesson.content.images ?? [
    { uri: lesson.content.imageUri, caption: lesson.content.caption },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => {
          setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / slideWidth));
        }}
      >
        {images.map((item, i) => (
          <View key={i} style={{ width: slideWidth, height: slideHeight }}>
            <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {item.caption ? (
              <View style={styles.captionBox}>
                <AppText style={styles.captionText}>{item.caption}</AppText>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.imgDots} pointerEvents="none">
          {images.map((_, i) => (
            <View key={i} style={[styles.imgDot, i === activeIdx && styles.imgDotActive]} />
          ))}
        </View>
      )}
    </View>
  );
};

const VideoContent = ({ lesson, active, onProgress }) => (
  <VideoPlayer
    videoUri={lesson.content.videoUri}
    active={active}
    onProgress={onProgress}
  />
);

// --- Engagement action button ---

const ActionBtn = ({ icon, activeIcon, isActive, count, color, onPress, label }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60 }),
    ]).start();
    onPress?.();
  };

  return (
    <TouchableOpacity style={styles.actionBtn} onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isActive ? activeIcon : icon}
          size={30}
          color={isActive ? color : '#fff'}
        />
      </Animated.View>
      {count != null && <AppText style={styles.actionCount}>{formatLargeNumber(count)}</AppText>}
      {label && <AppText style={styles.actionLabel}>{label}</AppText>}
    </TouchableOpacity>
  );
};

// --- Main ForYou screen ---

const ForYouScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    visibleCourses: courses, lessons, organizations, isLoading,
    isLiked, isFavorited, isEnrolled, isQuizPassed,
    toggleLike, toggleFavorite, enroll,
    completeLesson, recordQuizPass,
    streakMilestone, clearStreakMilestone,
  } = useCourses();

  const insets = useSafeAreaInsets();
  const { W, H, commentsH } = useResponsive();

  // TikTok-style: on wide screens (desktop/tablet web) center a phone-width column
  const isWide = W >= 500;
  const slideWidth = isWide ? Math.min(W, 430) : W;

  const [slideH, setSlideH] = useState(H);
  // Hide Share when screen is too short to fit it comfortably
  const showShare = slideH >= 700;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pendingNext, setPendingNext] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [videoActive, setVideoActive] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  const translateY = useRef(new Animated.Value(0)).current;

  // Refs: allow panResponder to call latest callbacks without stale closures
  const currentIndexRef = useRef(0);
  const tryGoNextRef = useRef(null);
  const animateToPrevRef = useRef(null);
  const currentLessonTypeRef = useRef(null);

  // Build course-wise feed — one entry per course (first lesson as preview).
  // Swiping navigates between courses, not individual lessons.
  const feed = useMemo(() => {
    if (!courses.length || !lessons.length) return [];
    const prefs = user?.preferences || [];

    const items = courses
      .map((course) => {
        const courseLessons = lessons.filter((l) => l.courseId === course.id);
        if (!courseLessons.length) return null;
        const lesson = courseLessons[0]; // first lesson as the course preview
        const org = organizations.find((o) => o.id === course.organizationId);
        return { lesson, course, org };
      })
      .filter(Boolean);

    if (!prefs.length) return shuffle(items);

    const preferred = shuffle(items.filter(({ course }) => prefs.includes(course.category)));
    const others = shuffle(items.filter(({ course }) => !prefs.includes(course.category)));
    return [...preferred, ...others];
  }, [lessons, courses, organizations, user?.preferences]);

  // PanResponder — created once; reads mutable refs during gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        const type = currentLessonTypeRef.current;
        if (type === 'text') return false;
        if (type === 'image') {
          return Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 2;
        }
        return Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx);
      },
      onPanResponderMove: (_, g) => {
        translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_THRESHOLD) {
          tryGoNextRef.current?.();
        } else if (g.dy > SWIPE_THRESHOLD && currentIndexRef.current > 0) {
          animateToPrevRef.current?.();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const current = feed[currentIndex];
  const lesson = current?.lesson;
  const course = current?.course;

  // Mark lesson complete and reset video progress when lesson changes
  useEffect(() => {
    setVideoProgress(0);
    if (lesson && course) {
      completeLesson(lesson.id, course.id, lesson.duration);
      if (user?.notificationsEnabled !== false) {
        scheduleLessonCompleteNotification(lesson.title);
      }
    }
  }, [currentIndex]);

  const animateToNext = useCallback(() => {
    setVideoActive(false);
    Animated.timing(translateY, {
      toValue: -slideH,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((i) => i + 1);
      translateY.setValue(0);
      setVideoActive(true);
    });
  }, [translateY, slideH]);

  const animateToPrev = useCallback(() => {
    setVideoActive(false);
    Animated.timing(translateY, {
      toValue: slideH,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((i) => i - 1);
      translateY.setValue(0);
      setVideoActive(true);
    });
  }, [translateY, slideH]);

  const tryGoNext = useCallback(() => {
    if (!lesson) return;
    if (lesson.hasQuiz && !isQuizPassed(lesson.quiz?.id)) {
      setPendingNext(true);
      setShowQuiz(true);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    } else if (currentIndex < feed.length - 1) {
      animateToNext();
    } else {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [lesson, isQuizPassed, currentIndex, feed.length, animateToNext, translateY]);

  // Update refs on every render so panResponder always calls latest version
  currentIndexRef.current = currentIndex;
  tryGoNextRef.current = tryGoNext;
  animateToPrevRef.current = animateToPrev;
  currentLessonTypeRef.current = lesson?.type ?? null;

  const handleQuizPass = useCallback(
    async (quizId, score) => {
      await recordQuizPass(quizId, lesson.id, score);
      if (user?.notificationsEnabled !== false) {
        scheduleQuizPassNotification(score);
      }
      setShowQuiz(false);
      if (pendingNext) {
        setPendingNext(false);
        animateToNext();
      }
    },
    [recordQuizPass, lesson, pendingNext, animateToNext, user]
  );

  const handleShare = useCallback(async () => {
    if (!lesson || !course) return;
    try {
      await Share.share({
        message: `📚 Check out "${lesson.title}" from "${course.title}" on EduTok!`,
        title: lesson.title,
      });
    } catch (_) {}
  }, [lesson, course]);

  // --- Loading / empty ---
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.center}>
        <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
        <AppText style={styles.emptyText}>{t('noLessonsAvailable')}</AppText>
      </View>
    );
  }

  const enrolled = isEnrolled(course.id);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Centered slide column — full-width on mobile, phone-width on desktop/tablet */}
      <View
        style={[styles.slideColumn, { width: slideWidth }]}
        onLayout={(e) => setSlideH(e.nativeEvent.layout.height)}
      >
        <Animated.View
          style={[styles.slide, { width: slideWidth, height: slideH, transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Lesson content */}
          {lesson.type === 'video' && (
            <VideoContent key={lesson.id} lesson={lesson} active={videoActive} onProgress={setVideoProgress} />
          )}
          {lesson.type === 'image' && (
            <ImageContent key={lesson.id} lesson={lesson} slideWidth={slideWidth} slideHeight={slideH} />
          )}
          {lesson.type === 'text' && <AppTextContent key={lesson.id} lesson={lesson} />}

          {/* Top gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'transparent']}
            style={styles.topGradient}
            pointerEvents="none"
          />

          {/* Bottom gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.88)']}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          {/* Video watch progress bar */}
          {lesson.type === 'video' && (
            <View style={styles.progressTrack} pointerEvents="none">
              <View style={[styles.progressFill, { width: `${videoProgress * 100}%` }]} />
            </View>
          )}

          {/* Feed position counter (top-right) */}
          <View style={[styles.counter, { top: insets.top + 10 }]}>
            <AppText style={styles.counterText}>{currentIndex + 1} / {feed.length} {t('courses').toLowerCase()}</AppText>
          </View>

          {/* Bottom-left: course title + lesson info */}
          <View style={[styles.bottomLeft, { bottom: insets.bottom + 18 }]}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
              activeOpacity={0.75}
            >
              <AppText style={styles.courseTitle} numberOfLines={1}>📚 {course.title}</AppText>
            </TouchableOpacity>

            <AppText style={styles.lessonTitle} numberOfLines={2}>{lesson.title}</AppText>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons
                  name={
                    lesson.type === 'video' ? 'play-circle' :
                    lesson.type === 'image' ? 'image-outline' :
                    'document-text-outline'
                  }
                  size={11}
                  color={COLORS.secondary}
                />
                <AppText style={styles.badgeText}>{lesson.type}</AppText>
              </View>
              <AppText style={styles.durationText}>{formatDuration(lesson.duration)}</AppText>
              {lesson.hasQuiz && (
                <View style={[styles.badge, styles.badgeQuiz]}>
                  <Ionicons name="help-circle" size={11} color={COLORS.primary} />
                  <AppText style={[styles.badgeText, { color: COLORS.primary }]}>{t('quiz')}</AppText>
                </View>
              )}
            </View>

            {currentIndex < feed.length - 1 && (
              lesson.type === 'text' ? (
                <TouchableOpacity
                  style={styles.swipeHint}
                  onPress={() => tryGoNextRef.current?.()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.7)" />
                  <AppText style={[styles.swipeHintText, { color: 'rgba(255,255,255,0.7)' }]}>{t('tapForNextCourse')}</AppText>
                </TouchableOpacity>
              ) : (
                <View style={styles.swipeHint}>
                  <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.4)" />
                  <AppText style={styles.swipeHintText}>{t('swipeForNextCourse')}</AppText>
                </View>
              )
            )}
          </View>

          {/* Right side: enrollment indicator + engagement buttons */}
          <View style={[styles.rightSide, { bottom: insets.bottom + 18 }]}>
            {enrolled ? (
              <View style={styles.courseThumb}>
                <Image source={{ uri: course.thumbnail }} style={styles.courseThumbImg} resizeMode="cover" />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.enrollBtn}
                onPress={async () => {
                  await enroll(course.id);
                  showToast(t('enrolledToast'));
                  if (user?.notificationsEnabled !== false) {
                    scheduleEnrollmentNotification(course.title);
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={26} color="#fff" />
              </TouchableOpacity>
            )}

            <ActionBtn
              icon="heart-outline" activeIcon="heart"
              isActive={isLiked(lesson.id)} color={COLORS.primary}
              count={lesson.likesCount + (isLiked(lesson.id) ? 1 : 0)}
              onPress={() => toggleLike(lesson.id)}
            />
            <ActionBtn
              icon="bookmark-outline" activeIcon="bookmark"
              isActive={isFavorited(lesson.id)} color={COLORS.secondary}
              count={lesson.savesCount + (isFavorited(lesson.id) ? 1 : 0)}
              onPress={() => toggleFavorite(lesson.id)}
            />
            <ActionBtn
              icon="chatbubble-outline" activeIcon="chatbubble"
              isActive={false} color={COLORS.secondary}
              count={lesson.commentsCount}
              onPress={() => setShowComments(true)}
            />
            {showShare && (
              <ActionBtn
                icon="share-social-outline" activeIcon="share-social"
                isActive={false} color={COLORS.secondary}
                count={lesson.sharesCount}
                onPress={handleShare}
              />
            )}
          </View>
        </Animated.View>
      </View>

      {/* Quiz modal */}
      <QuizModal
        visible={showQuiz}
        quiz={lesson?.quiz}
        onPass={handleQuizPass}
        onClose={() => { setShowQuiz(false); setPendingNext(false); }}
      />

      {/* Comments bottom sheet */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.commentsWrap}>
          <TouchableOpacity
            style={styles.commentsBackdrop}
            onPress={() => setShowComments(false)}
          />
          <View style={[styles.commentsSheet, { height: commentsH }]}>
            <CommentThread
              lessonId={lesson?.id}
              onClose={() => setShowComments(false)}
            />
          </View>
        </View>
      </Modal>

      <StreakCelebration
        visible={!!streakMilestone}
        streak={streakMilestone}
        onFinish={clearStreakMilestone}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  slideColumn: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: SIZES.base,
  },
  slide: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  // Text lesson
  textScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  textContent: {
    padding: 24,
    paddingTop: 100,
    paddingBottom: 240,
  },
  textTitle: {
    color: COLORS.text,
    fontSize: SIZES.xxl,
    fontWeight: '800',
    marginBottom: 18,
    lineHeight: 34,
  },
  textBody: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    lineHeight: 26,
  },
  // Gradients
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    pointerEvents: 'none',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    pointerEvents: 'none',
  },
  // Counter
  counter: {
    position: 'absolute',
    right: 16,
  },
  counterText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  // Bottom-left info
  bottomLeft: {
    position: 'absolute',
    left: 16,
    right: 82,
    gap: 4,
  },
  courseTitle: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  lessonTitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: SIZES.sm,
    fontWeight: '500',
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: COLORS.secondary + '55',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeQuiz: {
    borderColor: COLORS.primary + '55',
  },
  badgeText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  durationText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '500',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '500',
  },
  // Right engagement column
  rightSide: {
    position: 'absolute',
    right: 14,
    alignItems: 'center',
    gap: 16,
  },
  enrollBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 4,
  },
  courseThumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.success,
    marginBottom: 4,
  },
  courseThumbImg: {
    width: '100%',
    height: '100%',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 3,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Video progress bar
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 1.5,
  },
  // Image lesson caption + dots
  captionBox: {
    position: 'absolute',
    bottom: 220,
    left: 16,
    right: 90,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    padding: 10,
  },
  captionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: SIZES.sm,
    lineHeight: 18,
  },
  imgDots: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  imgDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  imgDotActive: {
    width: 16,
    backgroundColor: '#fff',
  },
  // Comments
  commentsWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentsSheet: {},
});

export default ForYouScreen;
