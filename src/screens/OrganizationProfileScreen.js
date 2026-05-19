import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import CourseCard from '../components/CourseCard';
import { useCourses } from '../context/CourseContext';
import { useResponsive } from '../utils/responsive';

const OrganizationProfileScreen = ({ route, navigation }) => {
  const { orgId } = route.params;
  const { organizations, courses } = useCourses();
  const { heroH, hPad } = useResponsive();

  const org = useMemo(() => organizations.find((o) => o.id === orgId), [organizations, orgId]);
  const orgCourses = useMemo(
    () => courses.filter((c) => c.organizationId === orgId),
    [courses, orgId]
  );

  if (!org) return null;

  const totalEnrolled = orgCourses.reduce((sum, c) => sum + c.enrolledCount, 0);
  const totalLessons = orgCourses.reduce((sum, c) => sum + c.lessonIds.length, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero banner */}
      <View style={[styles.hero, { height: heroH }]}>
        <LinearGradient
          colors={['#1A1A2E', '#16213E', COLORS.card]}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Image source={{ uri: org.logo }} style={styles.logo} />
          <Text style={styles.orgName}>{org.name}</Text>
          {org.tags?.length > 0 && (
            <View style={styles.tagsRow}>
              {org.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { marginHorizontal: hPad }]}>
        {[
          { label: 'Courses', value: orgCourses.length, icon: 'book' },
          { label: 'Lessons', value: totalLessons, icon: 'play-circle' },
          { label: 'Students', value: totalEnrolled.toLocaleString(), icon: 'people' },
        ].map((s) => (
          <View key={s.label} style={styles.stat}>
            <Ionicons name={s.icon} size={20} color={COLORS.secondary} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.about}>{org.description}</Text>
      </View>

      {/* Courses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{orgCourses.length} Courses</Text>
      </View>
      {orgCourses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          organization={org}
          onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
          style={styles.courseCard}
        />
      ))}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    justifyContent: 'flex-end',
    position: 'relative',
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
    alignItems: 'center',
    paddingBottom: 24,
    gap: 10,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.border,
  },
  orgName: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: COLORS.primary + '22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
  },
  tagText: { color: COLORS.primary, fontSize: SIZES.xs, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginTop: -12,
    paddingVertical: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stat: { alignItems: 'center', gap: 4 },
  statValue: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '800',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '700',
    marginBottom: 8,
  },
  about: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    lineHeight: 22,
  },
  courseCard: { marginHorizontal: 16 },
});

export default OrganizationProfileScreen;
