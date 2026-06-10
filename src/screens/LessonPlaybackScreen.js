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
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  PanResponder,
  Animated,
  StatusBar,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoPlayer from '../components/VideoPlayer';
import { COLORS, SIZES } from '../utils/constants';
import { formatDuration } from '../utils/helpers';
import EngagementButtons from '../components/EngagementButtons';
import QuizModal from '../components/QuizModal';
import CommentThread from '../components/CommentThread';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import { scheduleLessonCompleteNotification, scheduleQuizPassNotification, scheduleEnrollmentNotification } from '../services/notificationService';
import { useToast } from '../context/ToastContext';
import AppText from '../components/AppText';

const SWIPE_THRESHOLD = 60;

// --- Content renderers ---

const TextContent = ({ lesson }) => (
  <ScrollView
    style={styles.textScroll}
    contentContainerStyle={styles.textContent}
    showsVerticalScrollIndicator={false}
  >
    <AppText style={styles.lessonTitle}>{lesson.title}</AppText>
    <AppText style={styles.bodyText}>{lesson.content?.body ?? ''}</AppText>
  </ScrollView>
);

const ImageContent = ({ lesson, slideWidth, slideHeight }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const raw = lesson.content?.images ?? (lesson.content?.imageUri ? [{ uri: lesson.content.imageUri, caption: lesson.content.caption }] : []);
  const images = raw.filter((img) => img?.uri);
  return (
    <View style={styles.imageContainer}>
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
              <View style={styles.captionRow}>
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
  <View style={styles.videoContainer}>
    <VideoPlayer
      videoUri={lesson.content?.videoUri ?? null}
      active={active}
      onProgress={onProgress}
    />
  </View>
);

// --- Lesson slide ---
const LessonSlide = ({
  lesson, active, isLiked, isFavorited, isEnrolled,
  onLike, onFavorite, onComment, onShare, onEnroll,
  commentCount, courseTitle, lessonIndex, totalLessons,
  videoProgress, onVideoProgress,
  showShare, insetBottom, slideWidth, slideHeight, courseThumbnail,
}) => {
  const { t } = useTranslation();
  const renderContent = () => {
    switch (lesson.type) {
      case 'video': return <VideoContent key={lesson.id} lesson={lesson} active={active} onProgress={onVideoProgress} />;
      case 'image': return <ImageContent key={lesson.id} lesson={lesson} slideWidth={slideWidth} slideHeight={slideHeight} />;
      default:      return <TextContent key={lesson.id} lesson={lesson} />;
    }
  };

  return (
    <View style={styles.slide}>
      <StatusBar barStyle="light-content" />
      {renderContent()}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomOverlay}
        pointerEvents="none"
      />

      {/* Video watch progress bar */}
      {lesson.type === 'video' && (
        <View style={styles.progressTrack} pointerEvents="none">
          <View style={[styles.progressFill, { width: `${videoProgress * 100}%` }]} />
        </View>
      )}

      {/* Bottom-left info */}
      <View style={[styles.bottomLeft, { bottom: insetBottom + 24 }]}>
        <AppText style={styles.courseTitle} numberOfLines={1}>{courseTitle}</AppText>
        <AppText style={styles.lessonInfo}>{t('lesson')} {lessonIndex + 1} {t('of')} {totalLessons}</AppText>
        {lesson.type !== 'video' && (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.65)" />
            <AppText style={styles.metaText}>{formatDuration(lesson.duration)} {t('read')}</AppText>
          </View>
        )}
        {lesson.hasQuiz && (
          <View style={styles.metaRow}>
            <Ionicons name="help-circle-outline" size={12} color={COLORS.secondary} />
            <AppText style={[styles.metaText, { color: COLORS.secondary }]}>{t('quizBeforeNext')}</AppText>
          </View>
        )}
        <View style={styles.progressDots}>
          {Array.from({ length: totalLessons }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === lessonIndex && styles.dotActive,
                i < lessonIndex && styles.dotDone,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Right engagement stack */}
      <View style={[styles.rightButtons, { bottom: insetBottom + 24 }]}>
        <EngagementButtons
          isLiked={isLiked}
          isFavorited={isFavorited}
          likesCount={lesson.likesCount + (isLiked ? 1 : 0)}
          favoritesCount={lesson.savesCount + (isFavorited ? 1 : 0)}
          commentsCount={lesson.commentsCount ?? commentCount}
          sharesCount={lesson.sharesCount}
          onLike={onLike}
          onFavorite={onFavorite}
          onComment={onComment}
          onShare={onShare}
          onEnroll={onEnroll}
          isEnrolled={isEnrolled}
          courseThumbnail={courseThumbnail}
          showEnroll={true}
          showShare={showShare}
        />
      </View>
    </View>
  );
};

// --- Main screen ---
const LessonPlaybackScreen = ({ route, navigation }) => {
  const { courseId, lessonId, startIndex = 0 } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { W, H, commentsH } = useResponsive();
  const {
    courses, isLiked, isFavorited, isEnrolled, isQuizPassed,
    getLessonsForCourse, toggleLike, toggleFavorite,
    enroll, completeLesson, recordQuizPass,
  } = useCourses();

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const lessons = useMemo(() => getLessonsForCourse(courseId), [getLessonsForCourse, courseId]);

  // TikTok-style: center on wide screens (desktop/tablet web)
  const isWide = W >= 500;
  const slideWidth = isWide ? Math.min(W, 430) : W;

  const [currentIndex, setCurrentIndex] = useState(startIndex);

  // When lessons load, resolve the correct index by lessonId (more reliable than
  // the position index, which can drift if lesson order changes between renders)
  const didResolveRef = useRef(false);
  useEffect(() => {
    if (didResolveRef.current || !lessons.length || !lessonId) return;
    didResolveRef.current = true;
    const idx = lessons.findIndex((l) => l.id === lessonId);
    if (idx >= 0 && idx !== currentIndex) setCurrentIndex(idx);
  }, [lessons.length]); // intentionally only fires when list becomes non-empty
  const [showQuiz, setShowQuiz] = useState(false);
  const [pendingNext, setPendingNext] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [videoActive, setVideoActive] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [slideH, setSlideH] = useState(H);

  // Hide Share when screen is too short to fit it comfortably
  const showShare = slideH >= 700;

  const lesson = lessons[currentIndex];
  const translateY = useRef(new Animated.Value(0)).current;

  // Refs so panResponder always calls the latest callbacks
  const tryGoNextRef = useRef(null);
  const goToPrevRef = useRef(null);
  const currentLessonTypeRef = useRef(null);
  const isAnimatingRef = useRef(false);

  const enrolled = isEnrolled(courseId);

  // Mark lesson complete and reset video progress when lesson changes
  useEffect(() => {
    setVideoProgress(0);
    if (lesson && user && enrolled) {
      completeLesson(lesson.id, courseId, lesson.duration);
      if (user?.notificationsEnabled !== false) {
        scheduleLessonCompleteNotification(lesson.title);
      }
    }
  }, [currentIndex]);

  const animateToNext = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    Animated.timing(translateY, {
      toValue: -slideH,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setCurrentIndex((i) => i + 1);
        requestAnimationFrame(() => {
          translateY.setValue(0);
          isAnimatingRef.current = false;
        });
      } else {
        translateY.setValue(0);
        isAnimatingRef.current = false;
      }
    });
  }, [translateY, slideH]);

  const animateToPrev = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    Animated.timing(translateY, {
      toValue: slideH,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setCurrentIndex((i) => i - 1);
        requestAnimationFrame(() => {
          translateY.setValue(0);
          isAnimatingRef.current = false;
        });
      } else {
        translateY.setValue(0);
        isAnimatingRef.current = false;
      }
    });
  }, [translateY, slideH]);

  const tryGoNext = useCallback(() => {
    if (lesson?.hasQuiz && lesson?.quiz && enrolled && !isQuizPassed(lesson.quiz?.id)) {
      setPendingNext(true);
      setShowQuiz(true);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    } else if (currentIndex < lessons.length - 1) {
      animateToNext();
    } else {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      navigation.goBack();
    }
  }, [lesson, enrolled, isQuizPassed, currentIndex, lessons.length, animateToNext, translateY, navigation]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      animateToPrev();
    } else {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [currentIndex, animateToPrev, translateY]);

  // Update refs every render — panResponder reads these during gestures
  tryGoNextRef.current = tryGoNext;
  goToPrevRef.current = goToPrev;
  currentLessonTypeRef.current = lesson?.type ?? null;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        if (isAnimatingRef.current) return false;
        const type = currentLessonTypeRef.current;
        if (type === 'text') return false;
        if (type === 'image') {
          return Math.abs(g.dy) > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 2;
        }
        return Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx);
      },
      onPanResponderMove: (_, g) => {
        if (isAnimatingRef.current) return;
        translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (isAnimatingRef.current) return;
        if (g.dy < -SWIPE_THRESHOLD) {
          tryGoNextRef.current?.();
        } else if (g.dy > SWIPE_THRESHOLD) {
          goToPrevRef.current?.();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleQuizPass = useCallback(async (quizId, score) => {
    try {
      await recordQuizPass(quizId, lesson.id, score);
    } catch (_) {
      // Never let a server error block the quiz flow — pass is tracked locally
    }
    if (user?.notificationsEnabled !== false) {
      scheduleQuizPassNotification(score);
    }
    setShowQuiz(false);
    if (pendingNext) {
      setPendingNext(false);
      animateToNext();
    }
  }, [recordQuizPass, lesson, pendingNext, animateToNext, user]);

  const handleShare = useCallback(async () => {
    if (!lesson || !course) return;
    try {
      await Share.share({
        message: `📚 Check out "${lesson.title}" from "${course.title}" on EduTok!`,
        title: lesson.title,
      });
    } catch (_) {}
  }, [lesson, course]);

  if (!lesson) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Centered slide column — full-width on mobile, phone-width on desktop/tablet */}
      <View
        style={[styles.slideColumn, { width: slideWidth }]}
        onLayout={(e) => setSlideH(e.nativeEvent.layout.height)}
      >
        {/* Back button — inside column so it's centered with the content on wide screens */}
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>

        <Animated.View
          style={[styles.slideWrap, { width: slideWidth, height: slideH, transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <LessonSlide
            lesson={lesson}
            active={videoActive}
            isLiked={isLiked(lesson.id)}
            isFavorited={isFavorited(lesson.id)}
            isEnrolled={isEnrolled(courseId)}
            onLike={() => toggleLike(lesson.id)}
            onFavorite={() => toggleFavorite(lesson.id)}
            onComment={() => setShowComments(true)}
            onShare={handleShare}
            onEnroll={async () => {
              await enroll(courseId);
              showToast(t('enrolledToast'));
              if (user?.notificationsEnabled !== false) {
                scheduleEnrollmentNotification(course?.title || '');
              }
            }}
            commentCount={0}
            courseTitle={course?.title || ''}
            lessonIndex={currentIndex}
            totalLessons={lessons.length}
            videoProgress={videoProgress}
            onVideoProgress={setVideoProgress}
            showShare={showShare}
            insetBottom={insets.bottom}
            slideWidth={slideWidth}
            slideHeight={slideH}
            courseThumbnail={course?.thumbnail}
          />
        </Animated.View>

        {/* Swipe hint — positioned above home indicator, outside animated view */}
        {currentIndex < lessons.length - 1 && (
          lesson.type === 'text' ? (
            <TouchableOpacity
              style={[styles.swipeHint, { bottom: insets.bottom + 16 }]}
              onPress={tryGoNext}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.7)" />
              <AppText style={[styles.swipeHintText, { color: 'rgba(255,255,255,0.7)' }]}>{t('tapForNextLesson')}</AppText>
            </TouchableOpacity>
          ) : (
            <View style={[styles.swipeHint, { bottom: insets.bottom + 16 }]}>
              <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.4)" />
              <AppText style={styles.swipeHintText}>{t('swipeHint')}</AppText>
            </View>
          )
        )}
      </View>

      <QuizModal
        visible={showQuiz}
        quiz={lesson?.quiz}
        onPass={handleQuizPass}
        onClose={() => { setShowQuiz(false); setPendingNext(false); }}
      />

      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.commentsModal}>
          <TouchableOpacity
            style={styles.commentsBackdrop}
            onPress={() => setShowComments(false)}
          />
          <View style={[styles.commentsSheet, { height: commentsH }]}>
            <CommentThread
              lessonId={lesson.id}
              onClose={() => setShowComments(false)}
            />
          </View>
        </View>
      </Modal>
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
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideWrap: {},
  slide: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Text lesson
  textScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  textContent: {
    padding: 24,
    paddingTop: 90,
    paddingBottom: 220,
  },
  lessonTitle: {
    color: COLORS.text,
    fontSize: SIZES.xxl,
    fontWeight: '800',
    marginBottom: 20,
    lineHeight: 34,
  },
  bodyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    lineHeight: 26,
  },
  // Image lesson
  imageContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  captionRow: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 90,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 10,
  },
  captionText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: SIZES.sm,
    lineHeight: 18,
  },
  imgDots: {
    position: 'absolute',
    top: 52,
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
  // Video lesson
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
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
  // Overlay
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  bottomLeft: {
    position: 'absolute',
    left: 16,
    right: 90,
    gap: 5,
  },
  courseTitle: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lessonInfo: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: SIZES.xs,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { backgroundColor: '#fff' },
  dotDone: { backgroundColor: COLORS.success },
  rightButtons: {
    position: 'absolute',
    right: 14,
  },
  swipeHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '500',
  },
  commentsModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentsSheet: {},
});

export default LessonPlaybackScreen;
