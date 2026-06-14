import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
  StatusBar,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import VideoPlayer from '../components/VideoPlayer';
import { COLORS, SIZES, TAB_BAR_HEIGHT } from '../utils/constants';
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
import BadgeCelebration from '../components/BadgeCelebration';
import AppText from '../components/AppText';
import ShareSheet from '../components/ShareSheet';
import { lessonLink } from '../utils/shareLinks';
import { useTabBar } from '../context/TabBarContext';

const SWIPE_THRESHOLD = 50;

// --- Content renderers ---

const TextContent = ({ lesson }) => (
  <ScrollView
    style={styles.textScroll}
    contentContainerStyle={styles.textContent}
    showsVerticalScrollIndicator={false}
  >
    <AppText style={styles.textTitle}>{lesson.title}</AppText>
    <AppText style={styles.textBody}>{lesson.content?.body ?? ''}</AppText>
  </ScrollView>
);

const ImageContent = ({ lesson, slideWidth, slideHeight }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const raw = lesson.content?.images ?? (lesson.content?.imageUri ? [{ uri: lesson.content.imageUri, caption: lesson.content.caption }] : []);
  const images = raw.filter((img) => img?.uri);

  // Track the visible page live while dragging — onMomentumScrollEnd alone
  // updates late and never fires on web
  const handleScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    if (idx !== activeIdx && idx >= 0 && idx < images.length) setActiveIdx(idx);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((item, i) => (
          <View key={i} style={{ width: slideWidth, height: slideHeight, backgroundColor: '#000' }}>
            {/* contain = full image always visible (no horizontal cropping) */}
            <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
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
    videoUri={lesson.content?.videoUri ?? null}
    active={active}
    onProgress={onProgress}
  />
);

// Lightweight stand-in for video lessons on the non-active (prev/next) slides —
// avoids mounting extra video players during transitions.
const VideoPoster = ({ lesson, course }) => {
  const uri = lesson.thumbnail || course.thumbnail;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null}
      <View style={styles.posterPlay} pointerEvents="none">
        <Ionicons name="play" size={42} color="rgba(255,255,255,0.85)" />
      </View>
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
      {count != null && <AppText style={styles.actionCount}>{formatLargeNumber(count)}</AppText>}
      {label && <AppText style={styles.actionLabel}>{label}</AppText>}
    </TouchableOpacity>
  );
};

// --- One full-screen feed slide (content + overlays) ---

const Slide = ({
  item, index, feedLength, isActive,
  slideWidth, slideBodyH, insetsTop, insetsBottom,
  navigation, t, showShare,
  enrolled, liked, saved,
  videoActive, onVideoProgress,
  onEnroll, onLike, onSave, onComment, onShare, onTapNext,
}) => {
  const { lesson, course } = item;

  return (
    <View style={{ width: slideWidth, height: slideBodyH, backgroundColor: '#000', overflow: 'hidden' }}>
      {/* Lesson content */}
      {lesson.type === 'video' && (
        isActive ? (
          <VideoContent key={lesson.id} lesson={lesson} active={videoActive} onProgress={onVideoProgress} />
        ) : (
          <VideoPoster lesson={lesson} course={course} />
        )
      )}
      {lesson.type === 'image' && (
        <ImageContent key={lesson.id} lesson={lesson} slideWidth={slideWidth} slideHeight={slideBodyH} />
      )}
      {lesson.type === 'text' && <TextContent key={lesson.id} lesson={lesson} />}

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
      <View style={[styles.counter, { top: insetsTop + 10 }]}>
        <AppText style={styles.counterText}>{index + 1} / {feedLength} {t('courses').toLowerCase()}</AppText>
      </View>

      {/* Bottom-left: course title + lesson info */}
      <View style={[styles.bottomLeft, { bottom: insetsBottom + 16 }]}>
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

        {/* Always shown — feed is infinite, always a next lesson */}
        {lesson.type === 'text' || lesson.type === 'image' ? (
          <TouchableOpacity style={styles.swipeHint} onPress={onTapNext} activeOpacity={0.7}>
            <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.7)" />
            <AppText style={[styles.swipeHintText, { color: 'rgba(255,255,255,0.7)' }]}>{t('tapForNextCourse')}</AppText>
          </TouchableOpacity>
        ) : (
          <View style={styles.swipeHint}>
            <Ionicons name="chevron-up" size={13} color="rgba(255,255,255,0.4)" />
            <AppText style={styles.swipeHintText}>{t('swipeForNextCourse')}</AppText>
          </View>
        )}
      </View>

      {/* Right side: enrollment indicator + engagement buttons.
          Enrolled → course thumbnail (tap opens the course details);
          not enrolled → + (tap enrolls, optimistically). */}
      <View style={[styles.rightSide, { bottom: insetsBottom + 16 }]}>
        {enrolled ? (
          <TouchableOpacity
            style={styles.courseThumb}
            onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
            activeOpacity={0.85}
          >
            {course.thumbnail ? (
              <Image source={{ uri: course.thumbnail }} style={styles.courseThumbImg} resizeMode="cover" />
            ) : (
              <View style={[styles.courseThumbImg, styles.courseThumbFallback]}>
                <Ionicons name="checkmark" size={22} color={COLORS.success} />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.enrollBtn}
            onPress={onEnroll}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        )}

        <ActionBtn
          icon="heart-outline" activeIcon="heart"
          isActive={liked} color={COLORS.primary}
          count={lesson.likesCount + (liked ? 1 : 0)}
          onPress={onLike}
        />
        <ActionBtn
          icon="bookmark-outline" activeIcon="bookmark"
          isActive={saved} color={COLORS.secondary}
          count={lesson.savesCount + (saved ? 1 : 0)}
          onPress={onSave}
        />
        <ActionBtn
          icon="chatbubble-outline" activeIcon="chatbubble"
          isActive={false} color={COLORS.secondary}
          count={lesson.commentsCount}
          onPress={onComment}
        />
        {showShare && (
          <ActionBtn
            icon="share-social-outline" activeIcon="share-social"
            isActive={false} color={COLORS.secondary}
            count={lesson.sharesCount}
            onPress={onShare}
          />
        )}
      </View>
    </View>
  );
};

// --- Main ForYou screen ---

const ForYouScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    visibleCourses: courses, lessons, organizations, isLoading, loadError, reload,
    isLiked, isFavorited, isEnrolled, isQuizPassed,
    toggleLike, toggleFavorite, enroll,
    completeLesson, recordQuizPass, recordShare, bumpCommentCount,
    streakMilestone, clearStreakMilestone,
    newBadges, clearNewBadges,
  } = useCourses();

  const { showTabBar } = useTabBar();
  const insets = useSafeAreaInsets();
  const { W, H, commentsH } = useResponsive();

  // The tab bar stays pinned on this screen: never hidden by swipes here, and
  // re-shown on focus in case another screen (e.g. Profile scroll) hid it
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', showTabBar);
    return unsubscribe;
  }, [navigation, showTabBar]);

  // TikTok-style: on wide screens (desktop/tablet web) center a phone-width column
  const isWide = W >= 500;
  const slideWidth = isWide ? Math.min(W, 430) : W;

  // tab bar: paddingTop(10) + pill(40) + paddingBottom(6) = 56 base + device inset
  const tabBarH = TAB_BAR_HEIGHT + insets.bottom;
  const [slideH, setSlideH] = useState(H);
  const slideBodyH = slideH - tabBarH;
  // Hide Share when screen is too short to fit it comfortably
  const showShare = slideH >= 700;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [pendingNext, setPendingNext] = useState(false);
  const [pendingPrev, setPendingPrev] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [videoActive, setVideoActive] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [shareTarget, setShareTarget] = useState(null);
  // Pause the feed video whenever this screen isn't focused (navigated away,
  // tab switched) so it doesn't keep playing — and overlap another player —
  // in the background. Resumes automatically on return.
  const isFocused = useIsFocused();

  const translateY = useRef(new Animated.Value(0)).current;

  // Refs: allow panResponder to call latest callbacks without stale closures
  const currentIndexRef = useRef(0);
  const tryGoNextRef = useRef(null);
  const tryGoPrevRef = useRef(null);
  const currentLessonTypeRef = useRef(null);
  // Updated every render so panResponder always reads the latest slide width
  const slideWidthRef = useRef(slideWidth);
  const slideBodyHRef = useRef(slideBodyH);
  // Updated every render so infinite-scroll modulo always has latest feed length
  const feedLengthRef = useRef(0);
  // Prevents concurrent animations that cause black-screen / double-index-jump
  const isAnimatingRef = useRef(false);

  // Build course-wise feed — one entry per course, previewed by a RANDOM lesson
  // from that course, in fully random order. Computed once per data load so the
  // feed doesn't reshuffle mid-session.
  const feed = useMemo(() => {
    if (!courses.length || !lessons.length) return [];

    const items = courses
      .map((course) => {
        const courseLessons = lessons.filter((l) => l.courseId === course.id);
        if (!courseLessons.length) return null;
        const lesson = courseLessons[Math.floor(Math.random() * courseLessons.length)];
        const org = organizations.find((o) => o.id === course.organizationId);
        return { lesson, course, org };
      })
      .filter(Boolean);

    return shuffle(items);
    // `lessons` is intentionally NOT a dependency: its identity changes on
    // count bumps (e.g. comment posted) and that must not reshuffle the feed.
    // courses/lessons always update together in the single LOADED dispatch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, organizations]);

  // Live lookup so slides show fresh counts (comments etc.) without the feed
  // memo depending on the lessons array identity
  const lessonsById = useMemo(() => {
    const m = new Map();
    lessons.forEach((l) => m.set(l.id, l));
    return m;
  }, [lessons]);
  const liveLesson = useCallback((l) => lessonsById.get(l.id) ?? l, [lessonsById]);

  // PanResponder — created once; reads mutable refs during gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // let buttons claim taps
      onMoveShouldSetPanResponder: (_, g) => {
        // Never steal gestures while an animation is in flight
        if (isAnimatingRef.current) return false;
        // Never steal gestures that start in the right-side button column
        if (g.x0 > slideWidthRef.current - 90) return false;
        const type = currentLessonTypeRef.current;
        if (type === 'text') {
          return Math.abs(g.dy) > 50 && Math.abs(g.dy) > Math.abs(g.dx) * 2;
        }
        if (type === 'image') {
          return Math.abs(g.dy) > 40 && Math.abs(g.dy) > Math.abs(g.dx) * 2;
        }
        return Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx);
      },
      onPanResponderMove: (_, g) => {
        if (isAnimatingRef.current) return;
        // Clamp the drag to one slide in either direction — the stack only
        // renders the immediate prev/next neighbours
        const max = slideBodyHRef.current;
        translateY.setValue(Math.max(-max, Math.min(max, g.dy)));
      },
      onPanResponderRelease: (_, g) => {
        // Animation running — drop this gesture entirely (do NOT fire a spring
        // that would interrupt the ongoing timing animation)
        if (isAnimatingRef.current) return;
        if (g.dy < -SWIPE_THRESHOLD) {
          tryGoNextRef.current?.();
        } else if (g.dy > SWIPE_THRESHOLD) {
          tryGoPrevRef.current?.();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const current = feed[currentIndex];
  const lesson = current ? liveLesson(current.lesson) : undefined;
  const course = current?.course;

  // Mark lesson complete and reset video progress when lesson changes.
  // In the discovery feed, completion is only tracked for enrolled courses.
  useEffect(() => {
    setVideoProgress(0);
    if (lesson && course && isEnrolled(course.id)) {
      // Background work — a network failure here must never break the feed
      completeLesson(lesson.id, course.id, lesson.duration).catch(() => {});
      if (user?.notificationsEnabled !== false) {
        scheduleLessonCompleteNotification(lesson.title);
      }
    }
  }, [currentIndex]);

  const animateToNext = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setVideoActive(false); // pause video during the transition
    Animated.timing(translateY, {
      toValue: -slideBodyH,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setCurrentIndex((i) => (i + 1) % feedLengthRef.current);
        // Wait one frame so React renders the new current slide at center
        // before resetting the stack position — prevents a 1-frame flash
        requestAnimationFrame(() => {
          translateY.setValue(0);
          isAnimatingRef.current = false;
          setVideoActive(true);
        });
      } else {
        translateY.setValue(0);
        isAnimatingRef.current = false;
        setVideoActive(true);
      }
    });
  }, [translateY, slideBodyH]);

  const animateToPrev = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setVideoActive(false);
    Animated.timing(translateY, {
      toValue: slideBodyH,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setCurrentIndex((i) => (i - 1 + feedLengthRef.current) % feedLengthRef.current);
        requestAnimationFrame(() => {
          translateY.setValue(0);
          isAnimatingRef.current = false;
          setVideoActive(true);
        });
      } else {
        translateY.setValue(0);
        isAnimatingRef.current = false;
        setVideoActive(true);
      }
    });
  }, [translateY, slideBodyH]);

  const tryGoNext = useCallback(() => {
    if (!lesson) return;
    // Quiz gate only fires for enrolled students with an unpassed quiz
    if (lesson.hasQuiz && lesson.quiz && isEnrolled(course?.id) && !isQuizPassed(lesson.quiz?.id)) {
      setPendingNext(true);
      setShowQuiz(true);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    } else {
      animateToNext(); // infinite: always navigate
    }
  }, [lesson, course, isEnrolled, isQuizPassed, animateToNext, translateY]);

  const tryGoPrev = useCallback(() => {
    if (!lesson) return;
    // Quiz gate on swipe-down as well
    if (lesson.hasQuiz && lesson.quiz && isEnrolled(course?.id) && !isQuizPassed(lesson.quiz?.id)) {
      setPendingPrev(true);
      setShowQuiz(true);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    } else {
      animateToPrev(); // infinite: always navigate
    }
  }, [lesson, course, isEnrolled, isQuizPassed, animateToPrev, translateY]);

  // Update refs on every render so panResponder always calls latest version
  currentIndexRef.current = currentIndex;
  tryGoNextRef.current = tryGoNext;
  tryGoPrevRef.current = tryGoPrev;
  currentLessonTypeRef.current = lesson?.type ?? null;
  slideWidthRef.current = slideWidth;
  slideBodyHRef.current = slideBodyH;
  feedLengthRef.current = feed.length;

  // All engagement actions are optimistic: the UI flips instantly (state is
  // updated locally in CourseContext before the request), and reverts with an
  // error toast if the server rejects.
  const handleEnroll = useCallback(async (courseArg) => {
    showToast(t('enrolledToast'));
    if (user?.notificationsEnabled !== false) {
      scheduleEnrollmentNotification(courseArg.title);
    }
    try {
      await enroll(courseArg.id);
    } catch (e) {
      showToast(e?.message || t('networkError'));
    }
  }, [enroll, showToast, t, user]);

  const handleLike = useCallback(async (lessonArg) => {
    try {
      await toggleLike(lessonArg.id);
    } catch (e) {
      showToast(e?.message || t('networkError'));
    }
  }, [toggleLike, showToast, t]);

  const handleSave = useCallback(async (lessonArg) => {
    try {
      await toggleFavorite(lessonArg.id);
    } catch (e) {
      showToast(e?.message || t('networkError'));
    }
  }, [toggleFavorite, showToast, t]);

  const handleShare = useCallback((item) => {
    if (!item) return;
    setShareTarget(item);
  }, []);

  const handleQuizPass = useCallback(
    async (quizId, score, _pct, answers) => {
      try {
        await recordQuizPass(quizId, lesson.id, score, answers);
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
      } else if (pendingPrev) {
        setPendingPrev(false);
        animateToPrev();
      }
    },
    [recordQuizPass, lesson, pendingNext, pendingPrev, animateToNext, animateToPrev, user]
  );

  // --- Loading / error / empty ---
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
        <AppText style={styles.emptyText}>{t('networkError')}</AppText>
        <TouchableOpacity style={styles.retryBtn} onPress={reload} activeOpacity={0.8}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <AppText style={styles.retryBtnText}>{t('tryAgain')}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.center}>
        <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
        <AppText style={styles.emptyText}>{t('noLessonsAvailable')}</AppText>
        <TouchableOpacity style={styles.retryBtn} onPress={reload} activeOpacity={0.8}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <AppText style={styles.retryBtnText}>{t('tryAgain')}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const len = feed.length;
  const prevIndex = (currentIndex - 1 + len) % len;
  const nextIndex = (currentIndex + 1) % len;

  // Render one slide of the 3-slide stack (prev above, current, next below)
  const renderStackSlide = (index, position) => {
    // Resolve the live lesson object so counts stay fresh after engagement
    const item = { ...feed[index], lesson: liveLesson(feed[index].lesson) };
    const isActive = position === 'current';
    const top = position === 'prev' ? -slideBodyH : position === 'next' ? slideBodyH : 0;
    return (
      <View key={position} style={[styles.stackSlide, { top, width: slideWidth, height: slideBodyH }]}>
        <Slide
          item={item}
          index={index}
          feedLength={len}
          isActive={isActive}
          slideWidth={slideWidth}
          slideBodyH={slideBodyH}
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
          navigation={navigation}
          t={t}
          showShare={showShare}
          enrolled={isEnrolled(item.course.id)}
          liked={isLiked(item.lesson.id)}
          saved={isFavorited(item.lesson.id)}
          videoActive={isActive && videoActive && isFocused}
          onVideoProgress={isActive ? setVideoProgress : undefined}
          onEnroll={() => handleEnroll(item.course)}
          onLike={() => handleLike(item.lesson)}
          onSave={() => handleSave(item.lesson)}
          onComment={() => setShowComments(true)}
          onShare={() => handleShare(item)}
          onTapNext={() => tryGoNextRef.current?.()}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Centered slide column — full-width on mobile, phone-width on desktop/tablet */}
      <View
        style={[styles.slideColumn, { width: slideWidth }]}
        onLayout={(e) => setSlideH(e.nativeEvent.layout.height)}
      >
        {/* Clip window: exactly one slide tall; neighbours sit above/below it */}
        <View style={[styles.stackClip, { width: slideWidth, height: slideBodyH }]}>
          <Animated.View
            style={[styles.stack, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            {/* When the feed has a single item, prev/next would duplicate the
                active slide (and its video) — render only the current one */}
            {len > 1 && renderStackSlide(prevIndex, 'prev')}
            {renderStackSlide(currentIndex, 'current')}
            {len > 1 && renderStackSlide(nextIndex, 'next')}
          </Animated.View>
        </View>

        {/* Video watch progress bar — fixed strip just above the tab bar so it's
            always visible and never lost at the tab-bar seam or hidden behind
            the swiping stack. */}
        {lesson?.type === 'video' && (
          <View style={[styles.progressTrack, { bottom: tabBarH }]} pointerEvents="none">
            <View style={[styles.progressFill, { width: `${videoProgress * 100}%` }]} />
          </View>
        )}
      </View>

      {/* Quiz modal */}
      <QuizModal
        visible={showQuiz}
        quiz={lesson?.quiz}
        onPass={handleQuizPass}
        onClose={() => { setShowQuiz(false); setPendingNext(false); setPendingPrev(false); }}
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
              onPosted={() => bumpCommentCount(lesson?.id)}
            />
          </View>
        </View>
      </Modal>

      <StreakCelebration
        visible={!!streakMilestone}
        streak={streakMilestone}
        onFinish={clearStreakMilestone}
      />

      <BadgeCelebration badges={newBadges} onFinish={clearNewBadges} />

      <ShareSheet
        visible={!!shareTarget}
        onClose={() => setShareTarget(null)}
        title={shareTarget?.lesson.title}
        message={shareTarget ? `📚 Check out "${shareTarget.lesson.title}" from "${shareTarget.course.title}" on EduTok!` : ''}
        url={shareTarget ? lessonLink(shareTarget.lesson.id, shareTarget.course.id) : ''}
        onShared={() => shareTarget && recordShare(shareTarget.lesson.id)}
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
  stackClip: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  stack: {
    flex: 1,
  },
  stackSlide: {
    position: 'absolute',
    left: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: SIZES.sm,
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
  // Video poster (non-active slides)
  posterPlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
  courseThumbFallback: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Bottom-center, above the course info block and below the caption box
  imgDots: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imgDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  imgDotActive: {
    width: 20,
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
