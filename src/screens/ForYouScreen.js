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
  Dimensions,
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
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../utils/constants';
import { formatDuration, shuffle, formatLargeNumber } from '../utils/helpers';
import QuizModal from '../components/QuizModal';
import CommentThread from '../components/CommentThread';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

// --- Content renderers ---

const TextContent = ({ lesson }) => (
  <ScrollView
    style={styles.textScroll}
    contentContainerStyle={styles.textContent}
    showsVerticalScrollIndicator={false}
  >
    <Text style={styles.textTitle}>{lesson.title}</Text>
    <Text style={styles.textBody}>{lesson.content.body}</Text>
  </ScrollView>
);

const ImageContent = ({ lesson }) => (
  <View style={StyleSheet.absoluteFill}>
    <Image
      source={{ uri: lesson.content.imageUri }}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  </View>
);

const VideoContent = ({ lesson, active }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!active && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [active]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Video
        ref={videoRef}
        source={{ uri: lesson.content.videoUri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        shouldPlay={active}
        isLooping
        useNativeControls={false}
        onPlaybackStatusUpdate={() => {}}
      />
    </View>
  );
};

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
      {count != null && <Text style={styles.actionCount}>{formatLargeNumber(count)}</Text>}
      {label && <Text style={styles.actionLabel}>{label}</Text>}
    </TouchableOpacity>
  );
};

// --- Main ForYou screen ---

const ForYouScreen = ({ navigation }) => {
  const { user } = useAuth();
  const {
    courses, lessons, organizations, isLoading,
    isLiked, isFavorited, isEnrolled, isQuizPassed,
    toggleLike, toggleFavorite, enroll,
    completeLesson, recordQuizPass,
  } = useCourses();

  const insets = useSafeAreaInsets();
  const [slideH, setSlideH] = useState(H);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pendingNext, setPendingNext] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [videoActive, setVideoActive] = useState(true);

  const translateY = useRef(new Animated.Value(0)).current;

  // Refs: allow panResponder to call latest callbacks without stale closures
  const currentIndexRef = useRef(0);
  const tryGoNextRef = useRef(null);
  const animateToPrevRef = useRef(null);

  // Build personalized lesson feed — preferred categories first, then shuffle within groups
  const feed = useMemo(() => {
    if (!lessons.length || !courses.length) return [];
    const prefs = user?.preferences || [];

    const items = lessons
      .map((lesson) => {
        const course = courses.find((c) => c.id === lesson.courseId);
        if (!course) return null;
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
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
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

  // Mark lesson complete when it becomes active
  useEffect(() => {
    if (lesson && course) {
      completeLesson(lesson.id, course.id, lesson.duration);
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

  const handleQuizPass = useCallback(
    async (quizId, score) => {
      await recordQuizPass(quizId, lesson.id, score);
      setShowQuiz(false);
      if (pendingNext) {
        setPendingNext(false);
        animateToNext();
      }
    },
    [recordQuizPass, lesson, pendingNext, animateToNext]
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

  // --- Loading ---
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
        <Text style={styles.emptyText}>No lessons available</Text>
      </View>
    );
  }

  const enrolled = isEnrolled(course.id);

  return (
    <View
      style={styles.container}
      onLayout={(e) => setSlideH(e.nativeEvent.layout.height)}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View
        style={[styles.slide, { height: slideH, transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Lesson content */}
        {lesson.type === 'video' && <VideoContent lesson={lesson} active={videoActive} />}
        {lesson.type === 'image' && <ImageContent lesson={lesson} />}
        {lesson.type === 'text' && <TextContent lesson={lesson} />}

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

        {/* Feed position counter (top-right) */}
        <View style={[styles.counter, { top: insets.top + 10 }]}>
          <Text style={styles.counterText}>{currentIndex + 1} / {feed.length}</Text>
        </View>

        {/* Bottom-left: course title + lesson info (TikTok username-style) */}
        <View style={[styles.bottomLeft, { bottom: insets.bottom + 18 }]}>
          {/* Course title — taps into CourseProfile */}
          <TouchableOpacity
            onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
            activeOpacity={0.75}
          >
            <Text style={styles.courseTitle} numberOfLines={1}>📚 {course.title}</Text>
          </TouchableOpacity>

          {/* Lesson title */}
          <Text style={styles.lessonTitle} numberOfLines={2}>{lesson.title}</Text>

          {/* Type + duration + quiz badges */}
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
              <Text style={styles.badgeText}>{lesson.type}</Text>
            </View>
            <Text style={styles.durationText}>{formatDuration(lesson.duration)}</Text>
            {lesson.hasQuiz && (
              <View style={[styles.badge, styles.badgeQuiz]}>
                <Ionicons name="help-circle" size={11} color={COLORS.primary} />
                <Text style={[styles.badgeText, { color: COLORS.primary }]}>Quiz</Text>
              </View>
            )}
          </View>

          {/* Swipe hint */}
          {currentIndex < feed.length - 1 && (
            <View style={styles.swipeHint}>
              <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.4)" />
              <Text style={styles.swipeHintText}>Swipe up for next</Text>
            </View>
          )}
        </View>

        {/* Right side: enrollment + engagement buttons */}
        <View style={[styles.rightSide, { bottom: insets.bottom + 18 }]}>
          {/* Enroll "+" button — TikTok follow pattern */}
          {!enrolled && (
            <TouchableOpacity
              style={styles.enrollBtn}
              onPress={() => enroll(course.id)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
          )}

          <ActionBtn
            icon="heart-outline" activeIcon="heart"
            isActive={isLiked(lesson.id)} color={COLORS.primary}
            onPress={() => toggleLike(lesson.id)}
          />
          <ActionBtn
            icon="bookmark-outline" activeIcon="bookmark"
            isActive={isFavorited(lesson.id)} color={COLORS.secondary}
            onPress={() => toggleFavorite(lesson.id)}
            label="Save"
          />
          <ActionBtn
            icon="chatbubble-outline" activeIcon="chatbubble"
            isActive={false} color={COLORS.secondary}
            onPress={() => setShowComments(true)}
            label="Chat"
          />
          <ActionBtn
            icon="share-social-outline" activeIcon="share-social"
            isActive={false} color={COLORS.secondary}
            onPress={handleShare}
            label="Share"
          />
        </View>
      </Animated.View>

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
          <View style={styles.commentsSheet}>
            <CommentThread
              lessonId={lesson?.id}
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
    width: W,
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
  // Comments
  commentsWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentsSheet: {
    height: H * 0.65,
  },
});

export default ForYouScreen;
