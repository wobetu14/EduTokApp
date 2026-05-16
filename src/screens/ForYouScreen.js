import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, CATEGORIES } from '../utils/constants';
import CourseCard from '../components/CourseCard';
import ProgressBar from '../components/ProgressBar';
import { useCourses } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { formatLargeNumber } from '../utils/helpers';

const SectionHeader = ({ title, onSeeAll }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAll}>See all</Text>
      </TouchableOpacity>
    )}
  </View>
);

const EnrolledCard = ({ course, progress, onPress }) => (
  <TouchableOpacity style={styles.enrolledCard} onPress={onPress} activeOpacity={0.85}>
    <Image source={{ uri: course.thumbnail }} style={styles.enrolledThumb} />
    <View style={styles.enrolledInfo}>
      <Text style={styles.enrolledTitle} numberOfLines={2}>{course.title}</Text>
      <View style={styles.enrolledMeta}>
        <Ionicons name="book-outline" size={12} color={COLORS.textMuted} />
        <Text style={styles.enrolledMetaText}>{course.lessonIds.length} lessons</Text>
      </View>
      <ProgressBar percent={progress} height={3} style={styles.progressBar} />
      <Text style={styles.progressLabel}>{progress}% complete</Text>
    </View>
  </TouchableOpacity>
);

const CategoryPill = ({ cat, active, onPress }) => (
  <TouchableOpacity
    style={[styles.catPill, active && { backgroundColor: cat.color + '33', borderColor: cat.color }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Ionicons name={cat.icon} size={14} color={active ? cat.color : COLORS.textMuted} />
    <Text style={[styles.catPillText, active && { color: cat.color }]}>{cat.label}</Text>
  </TouchableOpacity>
);

const ForYouScreen = ({ navigation }) => {
  const { user } = useAuth();
  const {
    isLoading,
    courses,
    organizations,
    progress,
    getPersonalizedCourses,
    getCourseProgress,
    isEnrolled,
  } = useCourses();

  const [selectedCat, setSelectedCat] = React.useState(null);

  const enrolledCourses = useMemo(
    () => courses.filter((c) => progress.enrolledCourses.includes(c.id)),
    [courses, progress.enrolledCourses]
  );

  const personalized = useMemo(
    () => getPersonalizedCourses(user?.preferences || []),
    [getPersonalizedCourses, user?.preferences]
  );

  const filtered = useMemo(() => {
    if (!selectedCat) return personalized;
    return personalized.filter((c) => c.category === selectedCat);
  }, [personalized, selectedCat]);

  const getOrg = (orgId) => organizations.find((o) => o.id === orgId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const ListHeader = () => (
    <View>
      {/* Greeting */}
      <View style={styles.greeting}>
        <View>
          <Text style={styles.greetingText}>
            Good {getGreeting()}, {user?.fullName?.split(' ')[0] || 'Learner'} 👋
          </Text>
          <Text style={styles.greetingSub}>Ready to learn something new?</Text>
        </View>
        {progress.streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakCount}>{progress.streak}</Text>
          </View>
        )}
      </View>

      {/* Enrolled courses */}
      {enrolledCourses.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Continue Learning" />
          <FlatList
            horizontal
            data={enrolledCourses}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <EnrolledCard
                course={item}
                progress={getCourseProgress(item.id)}
                onPress={() => navigation.navigate('CourseProfile', { courseId: item.id })}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.enrolledList}
          />
        </View>
      )}

      {/* Categories filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CategoryPill
            cat={item}
            active={selectedCat === item.id}
            onPress={() => setSelectedCat((c) => (c === item.id ? null : item.id))}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
      />

      <SectionHeader
        title={selectedCat ? `${CATEGORIES.find((c) => c.id === selectedCat)?.label} Courses` : 'For You'}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            organization={getOrg(item.organizationId)}
            onPress={() => navigation.navigate('CourseProfile', { courseId: item.id })}
            style={styles.courseCard}
          />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No courses found</Text>
          </View>
        }
      />
    </View>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  list: { paddingBottom: 100 },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greetingText: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  greetingSub: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 2,
  },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streakFire: { fontSize: 20 },
  streakCount: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '800',
  },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  seeAll: {
    color: COLORS.secondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  enrolledList: { paddingLeft: 16, paddingRight: 8, gap: 12 },
  enrolledCard: {
    width: 220,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  enrolledThumb: {
    width: '100%',
    height: 100,
    backgroundColor: COLORS.surface,
  },
  enrolledInfo: { padding: 10 },
  enrolledTitle: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 18,
  },
  enrolledMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  enrolledMetaText: { color: COLORS.textMuted, fontSize: SIZES.xs },
  progressBar: { marginBottom: 4 },
  progressLabel: { color: COLORS.textMuted, fontSize: 10 },
  catList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  catPillText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  courseCard: { marginHorizontal: 16 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.base },
});

export default ForYouScreen;
