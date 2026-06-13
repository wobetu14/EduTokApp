import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { searchCourses as searchCoursesApi, fetchCategories } from '../services/apiService';

// Dashboard-authored categories may carry an icon name that isn't a valid
// Ionicons glyph (e.g. "brain"); fall back so the chip still renders.
const safeIcon = (name) =>
  name && Ionicons.glyphMap?.[name] ? name : 'pricetags-outline';
import { truncateText, formatLargeNumber } from '../utils/helpers';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import AppText from '../components/AppText';
import { useTabBar } from '../context/TabBarContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../utils/constants';

const SearchResultCard = ({ course, org, onPress }) => {
  const lessonCount = course.lessonIds?.length || course.lessonCount || 0;
  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: course.thumbnail }} style={styles.thumb} />
      <View style={styles.info}>
        <AppText style={styles.title} numberOfLines={2}>{course.title}</AppText>
        {org && <AppText style={styles.orgName}>{org.name}</AppText>}
        <AppText style={styles.desc} numberOfLines={2}>{truncateText(course.description, 60)}</AppText>
        <View style={styles.meta}>
          <Ionicons name="book-outline" size={12} color={COLORS.textMuted} />
          <AppText style={styles.metaText}>{lessonCount} lessons</AppText>
          <View style={styles.dot} />
          <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
          <AppText style={styles.metaText}>{formatLargeNumber(course.enrolledCount)}</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

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

  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // Seed with the bundled list so chips show instantly; replace with the
  // DB-driven list once the API responds.
  const [categories, setCategories] = useState(CATEGORIES);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((cats) => {
        if (!cancelled && cats.length) setCategories(cats);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const getOrg = useCallback(
    (orgId) => organizations.find((o) => o.id === orgId),
    [organizations]
  );

  // The backend stores the category LABEL on course.category (not the id).
  const catLabel = selectedCat ? categories.find((c) => c.id === selectedCat)?.label : null;

  // Local filter — used for category-only browsing (the /search endpoint
  // requires a query string) and as an offline fallback if the API fails.
  const localFilter = useCallback(
    (q, label) =>
      courses.filter((c) => {
        const matchesCat = !label || c.category === label;
        if (!q) return matchesCat;
        const matchesQuery =
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
          getOrg(c.organizationId)?.name.toLowerCase().includes(q);
        return matchesCat && matchesQuery;
      }),
    [courses, getOrg]
  );

  useEffect(() => {
    const q = query.trim();

    // No query → show the full course list (landing) or, if a category is
    // selected, the courses already loaded in context filtered by category.
    // The /search endpoint requires a query string, so this stays local.
    if (!q) {
      setResults(localFilter('', catLabel));
      setSearching(false);
      return;
    }

    // Query present → hit the server search, debounced.
    setSearching(true);
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const apiCourses = await searchCoursesApi({ q, category: catLabel });
        if (cancelled) return;
        // Prefer the in-context copy (carries lessonIds / engagement data),
        // fall back to the mapped API result for anything not loaded locally.
        const byId = new Map(courses.map((c) => [c.id, c]));
        setResults(apiCourses.map((c) => byId.get(c.id) ?? c));
      } catch (e) {
        if (!cancelled) setResults(localFilter(q.toLowerCase(), catLabel));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, selectedCat, catLabel, courses, localFilter]);

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
        data={categories}
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
              name={safeIcon(item.icon)}
              size={14}
              color={selectedCat === item.id ? item.color : COLORS.textSecondary}
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
        style={styles.catListWrap}
        contentContainerStyle={styles.catList}
      />

      {/* Results count */}
      {(query || selectedCat) && (
        <View style={styles.resultCountRow}>
          {searching ? (
            <>
              <ActivityIndicator size="small" color={COLORS.textMuted} />
              <AppText style={styles.resultCount}>{t('searchingLabel')}</AppText>
            </>
          ) : (
            <AppText style={styles.resultCount}>
              {results.length} {results.length === 1 ? t('courseFound') : t('coursesFound')}
            </AppText>
          )}
        </View>
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
    paddingVertical: 0,
    height: 24,
  },
  // flexGrow:0 stops the horizontal list from expanding to fill the column,
  // which was stretching the pill chips to full screen height.
  catListWrap: {
    flexGrow: 0,
  },
  catList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipText: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '600',
    includeFontPadding: false,
  },
  resultCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
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
