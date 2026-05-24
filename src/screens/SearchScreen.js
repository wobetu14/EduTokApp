import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, CATEGORIES } from '../utils/constants';
import { useCourses } from '../context/CourseContext';
import { truncateText, formatLargeNumber } from '../utils/helpers';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import AppText from '../components/AppText';
import { useTabBar } from '../context/TabBarContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../utils/constants';

const SearchResultCard = ({ course, org, onPress }) => (
  <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.85}>
    <Image source={{ uri: course.thumbnail }} style={styles.thumb} />
    <View style={styles.info}>
      <AppText style={styles.title} numberOfLines={2}>{course.title}</AppText>
      {org && <AppText style={styles.orgName}>{org.name}</AppText>}
      <AppText style={styles.desc} numberOfLines={2}>{truncateText(course.description, 60)}</AppText>
      <View style={styles.meta}>
        <Ionicons name="book-outline" size={12} color={COLORS.textMuted} />
        <AppText style={styles.metaText}>{course.lessonIds.length} lessons</AppText>
        <View style={styles.dot} />
        <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
        <AppText style={styles.metaText}>{formatLargeNumber(course.enrolledCount)}</AppText>
      </View>
    </View>
  </TouchableOpacity>
);

const SearchScreen = ({ navigation }) => {
  const { visibleCourses: courses, organizations, isLoading } = useCourses();
  const { hPad } = useResponsive();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const { hideTabBar, showTabBar } = useTabBar();
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y - lastScrollY.current > 10) hideTabBar();
    else if (lastScrollY.current - y > 10) showTabBar();
    lastScrollY.current = y;
  };

  const getOrg = useCallback(
    (orgId) => organizations.find((o) => o.id === orgId),
    [organizations]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesCat = !selectedCat || c.category === selectedCat;
      if (!q) return matchesCat;
      const matchesQuery =
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.includes(q)) ||
        getOrg(c.organizationId)?.name.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, selectedCat, courses, getOrg]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={[styles.searchBar, { marginHorizontal: hPad, marginTop: insets.top + 8 }]}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlaceholderFull')}
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filters */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.catChip,
              selectedCat === item.id && { backgroundColor: item.color + '33', borderColor: item.color },
            ]}
            onPress={() => setSelectedCat((c) => (c === item.id ? null : item.id))}
            activeOpacity={0.8}
          >
            <Ionicons
              name={item.icon}
              size={13}
              color={selectedCat === item.id ? item.color : COLORS.textMuted}
            />
            <AppText
              style={[
                styles.catChipText,
                selectedCat === item.id && { color: item.color },
              ]}
            >
              {item.label}
            </AppText>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
      />

      {/* Results count */}
      {(query || selectedCat) && (
        <AppText style={styles.resultCount}>
          {results.length} {results.length === 1 ? t('courseFound') : t('coursesFound')}
        </AppText>
      )}

      {/* Results */}
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <SearchResultCard
              course={item}
              org={getOrg(item.organizationId)}
              onPress={() => navigation.navigate('CourseProfile', { courseId: item.id })}
            />
          )}
          contentContainerStyle={[styles.resultList, { paddingHorizontal: hPad, paddingBottom: TAB_BAR_HEIGHT + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.empty}>
              {query || selectedCat ? (
                <>
                  <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
                  <AppText style={styles.emptyTitle}>{t('noResultsTitle')}</AppText>
                  <AppText style={styles.emptySub}>{t('tryDifferentKeywords')}</AppText>
                </>
              ) : (
                <>
                  <Ionicons name="compass-outline" size={48} color={COLORS.textMuted} />
                  <AppText style={styles.emptyTitle}>{t('searchForCoursesTitle')}</AppText>
                  <AppText style={styles.emptySub}>{t('findLessonsOnAnyTopic')}</AppText>
                </>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.base,
  },
  catList: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  catChipText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  resultCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultList: { paddingTop: 8, gap: 12, paddingBottom: 100 },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 12,
  },
  thumb: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.surface,
  },
  info: {
    flex: 1,
    padding: 10,
    paddingLeft: 0,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  orgName: {
    color: COLORS.secondary,
    fontSize: SIZES.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  desc: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    lineHeight: 16,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { color: COLORS.textMuted, fontSize: SIZES.xs },
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
  emptySub: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
  },
});

export default SearchScreen;
