import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, CATEGORIES, DIFFICULTY, COURSE_VISIBILITY } from '../utils/constants';
import LessonCard from '../components/LessonCard';
import ProgressBar from '../components/ProgressBar';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { formatLargeNumber, formatMinutes } from '../utils/helpers';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import { useToast } from '../context/ToastContext';
import { useTabBar } from '../context/TabBarContext';
import { scheduleEnrollmentNotification } from '../services/notificationService';
import AppText from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';

const CourseProfileScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const { heroH, lessonCardW, hPad } = useResponsive();
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    courses,
    organizations,
    progress: userProgress,
    isLoading,
    isEnrolled,
    isLessonCompleted,
    getCourseProgress,
    getLessonsForCourse,
    getCertificate,
    enroll,
  } = useCourses();

  const { t } = useTranslation();
  const { hideTabBar, showTabBar } = useTabBar();

  // Hide the bottom tab bar while scrolling down, reveal on scroll up —
  // same behaviour as the Explore/Search/Profile tabs.
  const lastScrollY = useRef(0);
  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y - lastScrollY.current > 10) hideTabBar();
    else if (lastScrollY.current - y > 10) showTabBar();
    lastScrollY.current = y;
  };

  // This is a pushed screen, not a tab root — make sure we never leave the
  // tab bar hidden when navigating away (or arriving with it hidden).
  useFocusEffect(
    useCallback(() => {
      showTabBar();
      return () => showTabBar();
    }, [showTabBar])
  );

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const org = useMemo(
    () => organizations.find((o) => o.id === course?.organizationId),
    [organizations, course]
  );
  const visInfo = COURSE_VISIBILITY[course?.visibility] || COURSE_VISIBILITY.public;
  const lessons = useMemo(() => getLessonsForCourse(courseId), [getLessonsForCourse, courseId]);
  const enrolled = isEnrolled(courseId);
  const progress = getCourseProgress(courseId);
  const catInfo = CATEGORIES.find((c) => c.id === course?.category);
  const diff = DIFFICULTY[course?.difficulty] || DIFFICULTY.Beginner;

  if (isLoading || !course) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const handleShare = () => {
    Share.share({
      message: `Check out "${course.title}" by ${org?.name || 'EduTok'} on EduTok!\n${lessons.length} lessons · ${formatMinutes(course.totalDuration)}`,
      title: course.title,
    });
  };

  const handleEnroll = async () => {
    await enroll(courseId);
    showToast(t('enrolledToast'));
    if (user?.notificationsEnabled !== false) {
      scheduleEnrollmentNotification(course.title);
    }
  };

  const isNavigatingRef = useRef(false);

  const handleLessonPress = useCallback((lesson, index) => {
    // Guard against double-taps while navigation is transitioning
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setTimeout(() => { isNavigatingRef.current = false; }, 800);

    // Navigate immediately — never block on the enrollment API call.
    // LessonPlaybackScreen has its own enroll button if not yet enrolled.
    navigation.navigate('LessonPlayback', {
      courseId,
      lessonId: lesson.id,
      startIndex: index,
    });

    // Enroll in background if not already enrolled
    if (!enrolled) {
      handleEnroll().catch(() => {});
    }
  }, [enrolled, courseId, navigation, handleEnroll]);

  const handleViewCertificate = () => {
    // Prefer the server-issued certificate (verifiable EDUTOK-XXXXXXXXXX number);
    // fall back to a client-derived one if the server hasn't issued it yet
    const serverCert = getCertificate(courseId);
    if (serverCert) {
      navigation.navigate('Certificate', { certificate: serverCert });
      return;
    }

    const issuedAt = course.lessonIds
      .map((lid) => userProgress.completedLessons.find((cl) => cl.lessonId === lid)?.completedAt)
      .filter(Boolean)
      .sort()
      .pop() || new Date().toISOString();

    navigation.navigate('Certificate', {
      certificate: {
        id: `cert-${courseId}-${user?.id || 'user'}`,
        studentName: user?.fullName || user?.username || 'Learner',
        courseName: course.title,
        organizationName: org?.name || 'EduTok',
        authorName: org?.name || 'EduTok',
        category: course.category,
        difficulty: course.difficulty,
        issuedAt,
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Hero */}
      <View style={[styles.hero, { height: heroH }]}>
        <Image source={{ uri: course.thumbnail }} style={styles.heroImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={styles.badgeRow}>
            {catInfo && (
              <View style={[styles.catBadge, { backgroundColor: catInfo.color + '33' }]}>
                <Ionicons name={catInfo.icon} size={12} color={catInfo.color} />
                <AppText style={[styles.catBadgeText, { color: catInfo.color }]}>{catInfo.label}</AppText>
              </View>
            )}
            {course.visibility && course.visibility !== 'public' && (
              <View style={[styles.visBadge, { backgroundColor: visInfo.color + '22', borderColor: visInfo.color + '66' }]}>
                <Ionicons name={visInfo.icon} size={11} color={visInfo.color} />
                <AppText style={[styles.visBadgeText, { color: visInfo.color }]}>
                  {t(`course${course.visibility.charAt(0).toUpperCase() + course.visibility.slice(1)}`)}
                </AppText>
              </View>
            )}
          </View>
          <AppText style={styles.heroTitle}>{course.title}</AppText>
          {org && (
            <TouchableOpacity
              style={styles.orgRow}
              onPress={() => navigation.navigate('OrganizationProfile', { orgId: org.id })}
            >
              <Image source={{ uri: org.logo }} style={styles.orgLogo} />
              <AppText style={styles.orgName}>{org.name}</AppText>
              <Ionicons name="chevron-forward" size={14} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { icon: 'book-outline', value: `${lessons.length} lessons`, color: COLORS.text },
          { icon: 'time-outline', value: formatMinutes(course.totalDuration), color: COLORS.text },
          { icon: 'people-outline', value: formatLargeNumber(course.enrolledCount), color: COLORS.text },
          { icon: 'bar-chart-outline', value: diff.label, color: diff.color },
        ].map((s, i) => (
          <View key={i} style={styles.stat}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <AppText style={[styles.statValue, { color: s.color }]}>{s.value}</AppText>
          </View>
        ))}
      </View>

      {/* Enroll / Progress */}
      {enrolled ? (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <AppText style={styles.progressLabel}>{t('yourProgress')}</AppText>
            <AppText style={styles.progressPct}>{progress}%</AppText>
          </View>
          <ProgressBar percent={progress} height={6} />
          {progress === 100 && (
            <View style={styles.completedRow}>
              <View style={styles.completedBadge}>
                <Ionicons name="trophy" size={16} color={COLORS.success} />
                <AppText style={styles.completedText}>{t('courseCompleted')}</AppText>
              </View>
              <TouchableOpacity style={styles.certBtn} onPress={handleViewCertificate} activeOpacity={0.85}>
                <Ionicons name="ribbon" size={15} color="#fff" />
                <AppText style={styles.certBtnText}>{t('viewCertificate')}</AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.enrollBtn} onPress={handleEnroll} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <AppText style={styles.enrollBtnText}>{t('enrollInCourse')}</AppText>
        </TouchableOpacity>
      )}

      {/* Description */}
      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>{t('about')}</AppText>
        <AppText style={styles.description}>{course.description}</AppText>
      </View>

      {/* Tags */}
      {course.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {course.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <AppText style={styles.tagText}>#{tag}</AppText>
            </View>
          ))}
        </View>
      )}

      {/* Lessons grid */}
      <View style={[styles.section, { paddingHorizontal: hPad }]}>
        <AppText style={styles.sectionTitle}>{lessons.length} {t('lessons')}</AppText>
      </View>
      <View style={[styles.lessonGrid, { paddingHorizontal: hPad }]}>
        {lessons.map((lesson, index) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            index={index}
            isCompleted={isLessonCompleted(lesson.id)}
            onPress={() => handleLessonPress(lesson, index)}
            style={{ width: lessonCardW, height: Math.round(lessonCardW * 4 / 3) }}
          />
        ))}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  hero: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
  },
  catBadgeText: { fontSize: SIZES.xs, fontWeight: '700' },
  visBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1,
  },
  visBadgeText: { fontSize: SIZES.xs, fontWeight: '600' },
  heroTitle: {
    color: '#fff',
    fontSize: SIZES.xl,
    fontWeight: '800',
    lineHeight: 28,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  orgLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
  orgName: {
    color: COLORS.secondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  progressSection: {
    margin: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { color: COLORS.text, fontWeight: '600', fontSize: SIZES.sm },
  progressPct: { color: COLORS.primary, fontWeight: '800', fontSize: SIZES.base },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedText: { color: COLORS.success, fontWeight: '700', fontSize: SIZES.sm },
  certBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  certBtnText: { color: '#fff', fontWeight: '700', fontSize: SIZES.xs },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  enrollBtnText: { color: '#fff', fontWeight: '800', fontSize: SIZES.base },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: COLORS.secondary, fontSize: SIZES.xs, fontWeight: '600' },
  lessonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
});

export default CourseProfileScreen;
