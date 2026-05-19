import React, { useMemo } from 'react';
import {
  View,
  Text,
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
import { formatLargeNumber } from '../utils/helpers';
import { useTranslation } from '../utils/useTranslation';

const AuthorProfileScreen = ({ route, navigation }) => {
  const { authorId } = route.params;
  const { authors, organizations, visibleCourses } = useCourses();
  const { heroH, hPad } = useResponsive();
  const { t } = useTranslation();

  const author = useMemo(() => authors.find((a) => a.id === authorId), [authors, authorId]);
  const org = useMemo(
    () => organizations.find((o) => o.id === author?.organizationId),
    [organizations, author]
  );
  const authorCourses = useMemo(
    () => visibleCourses.filter((c) => c.authorId === authorId),
    [visibleCourses, authorId]
  );
  const totalStudents = authorCourses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);

  if (!author) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={[styles.hero, { height: heroH }]}>
        <LinearGradient
          colors={['#1A1A2E', '#16213E', COLORS.card]}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Image source={{ uri: author.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{author.name}</Text>
          <Text style={styles.roleLabel}>{t('instructor')}</Text>
          {org && (
            <TouchableOpacity
              style={styles.orgRow}
              onPress={() => navigation.navigate('OrganizationProfile', { orgId: org.id })}
            >
              <Image source={{ uri: org.logo }} style={styles.orgLogo} />
              <Text style={styles.orgName}>{org.name}</Text>
              <Ionicons name="chevron-forward" size={12} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
          {author.expertise?.length > 0 && (
            <View style={styles.tagsRow}>
              {author.expertise.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { marginHorizontal: hPad }]}>
        {[
          { label: t('courses'), value: authorCourses.length, icon: 'book' },
          { label: t('students'), value: formatLargeNumber(totalStudents), icon: 'people' },
          { label: t('followers'), value: formatLargeNumber(author.followersCount || 0), icon: 'heart' },
        ].map((s) => (
          <View key={s.label} style={styles.stat}>
            <Ionicons name={s.icon} size={20} color={COLORS.secondary} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('about')}</Text>
        <Text style={styles.bio}>{author.bio}</Text>
      </View>

      {/* Courses */}
      {authorCourses.length > 0 && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{authorCourses.length} {t('courses')}</Text>
          </View>
          {authorCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              organization={org}
              onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
              style={styles.courseCard}
            />
          ))}
        </>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: { justifyContent: 'flex-end', position: 'relative' },
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
  heroContent: { alignItems: 'center', paddingBottom: 24, gap: 8 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.border,
  },
  name: { color: COLORS.text, fontSize: SIZES.xl, fontWeight: '800', textAlign: 'center' },
  roleLabel: { color: COLORS.textMuted, fontSize: SIZES.sm, fontWeight: '500' },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orgLogo: { width: 18, height: 18, borderRadius: 4, backgroundColor: COLORS.surface },
  orgName: { color: COLORS.secondary, fontSize: SIZES.sm, fontWeight: '600' },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
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
  statValue: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: SIZES.xs, fontWeight: '500' },
  section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '700', marginBottom: 8 },
  bio: { color: COLORS.textSecondary, fontSize: SIZES.sm, lineHeight: 22 },
  courseCard: { marginHorizontal: 16 },
});

export default AuthorProfileScreen;
