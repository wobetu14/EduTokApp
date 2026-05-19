import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, CATEGORIES, DIFFICULTY } from '../utils/constants';
import LessonCard from '../components/LessonCard';
import ProgressBar from '../components/ProgressBar';
import { useCourses } from '../context/CourseContext';
import { formatLargeNumber, formatMinutes } from '../utils/helpers';
import { useResponsive } from '../utils/responsive';

const CourseProfileScreen = ({ route, navigation }) => {
  const { courseId } = route.params;
  const { heroH, lessonCardW, hPad } = useResponsive();
  const {
    courses,
    organizations,
    isLoading,
    isEnrolled,
    isLessonCompleted,
    getCourseProgress,
    getLessonsForCourse,
    enroll,
  } = useCourses();

  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId]);
  const org = useMemo(
    () => organizations.find((o) => o.id === course?.organizationId),
    [organizations, course]
  );
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

  const handleEnroll = async () => {
    await enroll(courseId);
  };

  const handleLessonPress = (lesson, index) => {
    navigation.navigate('LessonPlayback', {
      courseId,
      lessonId: lesson.id,
      startIndex: index,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
        <View style={styles.heroContent}>
          {catInfo && (
            <View style={[styles.catBadge, { backgroundColor: catInfo.color + '33' }]}>
              <Ionicons name={catInfo.icon} size={12} color={catInfo.color} />
              <Text style={[styles.catBadgeText, { color: catInfo.color }]}>{catInfo.label}</Text>
            </View>
          )}
          <Text style={styles.heroTitle}>{course.title}</Text>
          {org && (
            <TouchableOpacity
              style={styles.orgRow}
              onPress={() => navigation.navigate('OrganizationProfile', { orgId: org.id })}
            >
              <Image source={{ uri: org.logo }} style={styles.orgLogo} />
              <Text style={styles.orgName}>{org.name}</Text>
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
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* Enroll / Progress */}
      {enrolled ? (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Your progress</Text>
            <Text style={styles.progressPct}>{progress}%</Text>
          </View>
          <ProgressBar percent={progress} height={6} />
          {progress === 100 && (
            <View style={styles.completedBadge}>
              <Ionicons name="trophy" size={16} color={COLORS.success} />
              <Text style={styles.completedText}>Course completed!</Text>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.enrollBtn} onPress={handleEnroll} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.enrollBtnText}>Enroll in this Course</Text>
        </TouchableOpacity>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{course.description}</Text>
      </View>

      {/* Tags */}
      {course.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {course.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Lessons grid */}
      <View style={[styles.section, { paddingHorizontal: hPad }]}>
        <Text style={styles.sectionTitle}>{lessons.length} Lessons</Text>
      </View>
      <View style={[styles.lessonGrid, { paddingHorizontal: hPad }]}>
        {lessons.map((lesson, index) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            index={index}
            isCompleted={isLessonCompleted(lesson.id)}
            onPress={() => handleLessonPress(lesson, index)}
            style={{ width: lessonCardW }}
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
  heroContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 8,
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  completedText: { color: COLORS.success, fontWeight: '700', fontSize: SIZES.sm },
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
