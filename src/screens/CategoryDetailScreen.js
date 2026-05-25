import React, { useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, CATEGORIES, TAB_BAR_HEIGHT } from '../utils/constants';
import { useCourses } from '../context/CourseContext';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import { useTabBar } from '../context/TabBarContext';
import AppText from '../components/AppText';
import { formatLargeNumber } from '../utils/helpers';

const CategoryDetailScreen = ({ route, navigation }) => {
  const { categoryId } = route.params;
  const { visibleCourses: courses, organizations, isLoading } = useCourses();
  const { hPad, gridCols, lessonCardW } = useResponsive();
  const { t } = useTranslation();
  const { hideTabBar, showTabBar } = useTabBar();
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);

  const catInfo = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId),
    [categoryId]
  );

  const filtered = useMemo(
    () => courses.filter((c) => c.category === categoryId),
    [courses, categoryId]
  );

  const getOrg = (orgId) => organizations.find((o) => o.id === orgId);

  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y - lastScrollY.current > 10) hideTabBar();
    else if (lastScrollY.current - y > 10) showTabBar();
    lastScrollY.current = y;
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const accentColor = catInfo?.color || COLORS.primary;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: hPad }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <View style={[styles.catIcon, { backgroundColor: accentColor + '22' }]}>
            <Ionicons name={catInfo?.icon || 'book'} size={22} color={accentColor} />
          </View>
          <View>
            <AppText style={styles.headerTitle}>{catInfo?.label || categoryId}</AppText>
            <AppText style={styles.headerSub}>
              {filtered.length} {t('courses').toLowerCase()}
            </AppText>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: accentColor + '44' }]} />

      {/* Course grid */}
      <FlatList
        key={`cat-grid-${gridCols}`}
        data={filtered}
        keyExtractor={(c) => c.id}
        numColumns={gridCols}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.grid,
          { paddingHorizontal: hPad, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 },
        ]}
        columnWrapperStyle={gridCols > 1 ? styles.row : undefined}
        renderItem={({ item: course }) => {
          const org = getOrg(course.organizationId);
          return (
            <TouchableOpacity
              style={[styles.card, { width: lessonCardW }]}
              onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
              activeOpacity={0.85}
            >
              <Image source={{ uri: course.thumbnail }} style={styles.thumb} />
              <View style={styles.cardBody}>
                <AppText style={styles.cardTitle} numberOfLines={2}>{course.title}</AppText>
                {org && (
                  <AppText style={[styles.cardOrg, { color: accentColor }]} numberOfLines={1}>
                    {org.name}
                  </AppText>
                )}
                <View style={styles.cardMeta}>
                  <Ionicons name="book-outline" size={11} color={COLORS.textMuted} />
                  <AppText style={styles.cardMetaText}>{course.lessonIds.length} {t('lessons').toLowerCase()}</AppText>
                  {course.enrolledCount > 0 && (
                    <>
                      <View style={styles.dot} />
                      <Ionicons name="people-outline" size={11} color={COLORS.textMuted} />
                      <AppText style={styles.cardMetaText}>{formatLargeNumber(course.enrolledCount)}</AppText>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
            <AppText style={styles.emptyTitle}>{t('noCourses')}</AppText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: SIZES.xl,
    fontWeight: '800',
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    marginTop: 2,
  },
  divider: { height: 1, marginBottom: 16 },
  grid: { paddingTop: 8, gap: 12 },
  row: { gap: 8, marginBottom: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: 110,
    backgroundColor: COLORS.surface,
  },
  cardBody: { padding: 10 },
  cardTitle: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  cardOrg: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { color: COLORS.textMuted, fontSize: 11 },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
});

export default CategoryDetailScreen;
