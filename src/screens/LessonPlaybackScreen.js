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
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  PanResponder,
  Animated,
  StatusBar,
  Share,
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

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;

// --- Content renderers ---

const TextContent = ({ lesson }) => (
  <ScrollView
    style={styles.textScroll}
    contentContainerStyle={styles.textContent}
    showsVerticalScrollIndicator={false}
  >
    <Text style={styles.lessonTitle}>{lesson.title}</Text>
    <Text style={styles.bodyText}>{lesson.content.body}</Text>
  </ScrollView>
);

const ImageContent = ({ lesson }) => (
  <View style={styles.imageContainer}>
    <Image
      source={{ uri: lesson.content.imageUri }}
      style={styles.lessonImage}
      resizeMode="cover"
    />
    {lesson.content.caption && (
      <View style={styles.captionRow}>
        <Text style={styles.captionText}>{lesson.content.caption}</Text>
      </View>
    )}
  </View>
);

const VideoContent = ({ lesson, active, onProgress }) => (
  <View style={styles.videoContainer}>
    <VideoPlayer
      youtubeId={lesson.content.youtubeId}
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
}) => {
  const renderContent = () => {
    switch (lesson.type) {
      case 'video': return <VideoContent lesson={lesson} active={active} onProgress={onVideoProgress} />;
      case 'image': return <ImageContent lesson={lesson} />;
      default:      return <TextContent lesson={lesson} />;
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
      <View style={styles.bottomLeft}>
        <Text style={styles.courseTitle} numberOfLines={1}>{courseTitle}</Text>
        <Text style={styles.lessonInfo}>Lesson {lessonIndex + 1} of {totalLessons}</Text>
        {lesson.type !== 'video' && (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.65)" />
            <Text style={styles.metaText}>{formatDuration(lesson.duration)} read</Text>
          </View>
        )}
        {lesson.hasQuiz && (
          <View style={styles.metaRow}>
            <Ionicons name="help-circle-outline" size={12} color={COLORS.secondary} />
            <Text style={[styles.metaText, { color: COLORS.secondary }]}>Quiz before next lesson</Text>
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
      <View style={styles.rightButtons}>
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
          showEnroll={!isEnrolled}
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
  const {
    courses, isLiked, isFavorited, isEnrolled, isQuizPassed,
    getLessonsForCourse, toggleLike, toggleFavorite,
    enroll, completeLesson, recordQuizPass,
  } = useCourses();

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const lessons = useMemo(() => getLessonsForCourse(courseId), [getLessonsForCourse, courseId]);

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pendingNext, setPendingNext] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [videoActive, setVideoActive] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  const lesson = lessons[currentIndex];
  const translateY = useRef(new Animated.Value(0)).current;

  // Refs so panResponder always calls the latest callbacks
  const tryGoNextRef = useRef(null);
  const goToPrevRef = useRef(null);

  // Mark lesson complete and reset video progress when lesson changes
  useEffect(() => {
    setVideoProgress(0);
    if (lesson && user) {
      completeLesson(lesson.id, courseId, lesson.duration);
    }
  }, [currentIndex]);

  const animateToNext = useCallback(() => {
    setVideoActive(false);
    Animated.timing(translateY, {
      toValue: -H,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((i) => i + 1);
      translateY.setValue(0);
      setVideoActive(true);
    });
  }, [translateY]);

  const animateToPrev = useCallback(() => {
    setVideoActive(false);
    Animated.timing(translateY, {
      toValue: H,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((i) => i - 1);
      translateY.setValue(0);
      setVideoActive(true);
    });
  }, [translateY]);

  const tryGoNext = useCallback(() => {
    if (lesson?.hasQuiz && !isQuizPassed(lesson.quiz?.id)) {
      setPendingNext(true);
      setShowQuiz(true);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    } else if (currentIndex < lessons.length - 1) {
      animateToNext();
    } else {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      navigation.goBack();
    }
  }, [lesson, isQuizPassed, currentIndex, lessons.length, animateToNext, translateY, navigation]);

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

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
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
    await recordQuizPass(quizId, lesson.id, score);
    setShowQuiz(false);
    if (pendingNext) {
      setPendingNext(false);
      animateToNext();
    }
  }, [recordQuizPass, lesson, pendingNext, animateToNext]);

  const handleShare = useCallback(async () => {
    if (!lesson || !course) return;
    try {
      await Share.share({
        message: `📚 Check out "${lesson.title}" from "${course.title}" on EduTok!`,
        title: lesson.title,
      });
    } catch (_) {}
  }, [lesson, course]);

  if (!lesson) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-down" size={24} color="#fff" />
      </TouchableOpacity>

      <Animated.View
        style={[styles.slideWrap, { transform: [{ translateY }] }]}
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
          onEnroll={() => enroll(courseId)}
          commentCount={0}
          courseTitle={course?.title || ''}
          lessonIndex={currentIndex}
          totalLessons={lessons.length}
          videoProgress={videoProgress}
          onVideoProgress={setVideoProgress}
        />
      </Animated.View>

      {/* Swipe hint */}
      {currentIndex < lessons.length - 1 && (
        <View style={[styles.swipeHint, { bottom: insets.bottom + 16 }]}>
          <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.4)" />
          <Text style={styles.swipeHintText}>Swipe up for next lesson</Text>
        </View>
      )}

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
          <View style={styles.commentsSheet}>
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
  slideWrap: {
    width: W,
    height: H,
  },
  slide: {
    width: W,
    height: H,
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
  lessonImage: {
    ...StyleSheet.absoluteFillObject,
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
    bottom: 80,
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
    bottom: 80,
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
  commentsSheet: {
    height: H * 0.65,
  },
});

export default LessonPlaybackScreen;
