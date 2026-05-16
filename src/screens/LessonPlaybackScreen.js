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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../utils/constants';
import { formatDuration } from '../utils/helpers';
import EngagementButtons from '../components/EngagementButtons';
import QuizModal from '../components/QuizModal';
import CommentThread from '../components/CommentThread';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;

// --- Lesson content renderers ---

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
      resizeMode="contain"
    />
    {lesson.content.caption && (
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.captionGrad}
      >
        <Text style={styles.captionText}>{lesson.content.caption}</Text>
      </LinearGradient>
    )}
    <View style={styles.imageTitleRow}>
      <Text style={styles.imageLessonTitle}>{lesson.title}</Text>
    </View>
  </View>
);

const VideoContent = ({ lesson, active }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});

  useEffect(() => {
    if (!active && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [active]);

  return (
    <View style={styles.videoContainer}>
      <Video
        ref={videoRef}
        source={{ uri: lesson.content.videoUri }}
        style={styles.video}
        resizeMode="contain"
        shouldPlay={active}
        isLooping={false}
        onPlaybackStatusUpdate={setStatus}
        useNativeControls
      />
      <View style={styles.videoTitleRow}>
        <Text style={styles.videoTitle}>{lesson.title}</Text>
      </View>
    </View>
  );
};

// --- Main lesson slide ---
const LessonSlide = ({ lesson, active, isLiked, isFavorited, isEnrolled, onLike, onFavorite, onComment, onEnroll, commentCount, courseTitle, lessonIndex, totalLessons }) => {
  const renderContent = () => {
    switch (lesson.type) {
      case 'video':
        return <VideoContent lesson={lesson} active={active} />;
      case 'image':
        return <ImageContent lesson={lesson} />;
      default:
        return <TextContent lesson={lesson} />;
    }
  };

  return (
    <View style={styles.slide}>
      <StatusBar barStyle="light-content" />
      {renderContent()}

      {/* Bottom overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.bottomOverlay}
        pointerEvents="none"
      />

      {/* Bottom left info */}
      <View style={styles.bottomLeft}>
        <Text style={styles.courseTitle} numberOfLines={1}>{courseTitle}</Text>
        <Text style={styles.lessonInfo}>
          Lesson {lessonIndex + 1} of {totalLessons}
        </Text>
        {lesson.type !== 'video' && (
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.duration}>{formatDuration(lesson.duration)} read</Text>
          </View>
        )}
        {lesson.hasQuiz && (
          <View style={styles.quizHint}>
            <Ionicons name="help-circle-outline" size={13} color={COLORS.secondary} />
            <Text style={styles.quizHintText}>Quiz when you swipe up</Text>
          </View>
        )}
        <View style={styles.progressDots}>
          {Array.from({ length: totalLessons }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === lessonIndex && styles.progressDotActive,
                i < lessonIndex && styles.progressDotDone,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Right engagement buttons */}
      <View style={styles.rightButtons}>
        <EngagementButtons
          isLiked={isLiked}
          isFavorited={isFavorited}
          likesCount={undefined}
          commentsCount={commentCount}
          onLike={onLike}
          onFavorite={onFavorite}
          onComment={onComment}
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
    courses,
    isLiked,
    isFavorited,
    isEnrolled,
    getLessonsForCourse,
    toggleLike,
    toggleFavorite,
    enroll,
    completeLesson,
    recordQuizPass,
  } = useCourses();

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const lessons = useMemo(() => getLessonsForCourse(courseId), [getLessonsForCourse, courseId]);

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pendingNext, setPendingNext] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCounts, setCommentCounts] = useState({});

  const lesson = lessons[currentIndex];
  const translateY = useRef(new Animated.Value(0)).current;

  // Mark current lesson complete when viewed
  useEffect(() => {
    if (lesson && user) {
      completeLesson(lesson.id, courseId, lesson.duration);
    }
  }, [currentIndex, lesson, courseId]);

  const goToNext = useCallback(() => {
    if (currentIndex < lessons.length - 1) {
      Animated.timing(translateY, {
        toValue: -H,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((i) => i + 1);
        translateY.setValue(0);
      });
    } else {
      navigation.goBack();
    }
  }, [currentIndex, lessons.length, translateY, navigation]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      Animated.timing(translateY, {
        toValue: H,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((i) => i - 1);
        translateY.setValue(0);
      });
    }
  }, [currentIndex, translateY]);

  const tryGoNext = useCallback(() => {
    if (lesson?.hasQuiz) {
      setPendingNext(true);
      setShowQuiz(true);
    } else {
      goToNext();
    }
  }, [lesson, goToNext]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_THRESHOLD) {
          // swipe up → next lesson
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          tryGoNext();
        } else if (g.dy > SWIPE_THRESHOLD) {
          // swipe down → prev lesson
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          goToPrev();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleQuizPass = useCallback(
    async (quizId, score, pct) => {
      await recordQuizPass(quizId, lesson.id, score);
      setShowQuiz(false);
      if (pendingNext) {
        setPendingNext(false);
        goToNext();
      }
    },
    [recordQuizPass, lesson, pendingNext, goToNext]
  );

  const handleQuizClose = useCallback(() => {
    setShowQuiz(false);
    setPendingNext(false);
  }, []);

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

      {/* Lesson slide with gesture */}
      <Animated.View
        style={[styles.slideWrap, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <LessonSlide
          lesson={lesson}
          active
          isLiked={isLiked(lesson.id)}
          isFavorited={isFavorited(lesson.id)}
          isEnrolled={isEnrolled(courseId)}
          onLike={() => toggleLike(lesson.id)}
          onFavorite={() => toggleFavorite(lesson.id)}
          onComment={() => setShowComments(true)}
          onEnroll={() => enroll(courseId)}
          commentCount={commentCounts[lesson.id] || 0}
          courseTitle={course?.title || ''}
          lessonIndex={currentIndex}
          totalLessons={lessons.length}
        />
      </Animated.View>

      {/* Swipe hint */}
      {currentIndex < lessons.length - 1 && (
        <View style={[styles.swipeHint, { bottom: insets.bottom + 16 }]}>
          <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.5)" />
          <Text style={styles.swipeHintText}>Swipe up for next lesson</Text>
        </View>
      )}

      {/* Quiz modal */}
      <QuizModal
        visible={showQuiz}
        quiz={lesson?.quiz}
        onPass={handleQuizPass}
        onClose={handleQuizClose}
      />

      {/* Comments bottom sheet */}
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
    paddingTop: 80,
    paddingBottom: 200,
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
    justifyContent: 'center',
  },
  lessonImage: {
    width: W,
    height: H * 0.7,
  },
  captionGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 120,
  },
  captionText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    lineHeight: 20,
  },
  imageTitleRow: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 80,
  },
  imageLessonTitle: {
    color: '#fff',
    fontSize: SIZES.xl,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  // Video lesson
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: {
    width: W,
    height: H * 0.6,
  },
  videoTitleRow: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 80,
  },
  videoTitle: {
    color: '#fff',
    fontSize: SIZES.xl,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  // Bottom overlay + info
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 90,
    gap: 6,
  },
  courseTitle: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lessonInfo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duration: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: SIZES.xs,
  },
  quizHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quizHintText: {
    color: COLORS.secondary,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: { backgroundColor: '#fff' },
  progressDotDone: { backgroundColor: COLORS.success },
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
    gap: 2,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
  },
  // Comments modal
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
