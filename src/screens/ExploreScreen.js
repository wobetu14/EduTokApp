import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, CATEGORIES } from '../utils/constants';
import CourseCard from '../components/CourseCard';
import { useCourses } from '../context/CourseContext';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import AppText from '../components/AppText';
import { useTabBar } from '../context/TabBarContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../utils/constants';

const OrgCard = ({ org, courseCount, onPress }) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.orgCard} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: org.logo }} style={styles.orgLogo} />
      <View style={styles.orgInfo}>
        <AppText style={styles.orgName} numberOfLines={1}>{org.name}</AppText>
        <AppText style={styles.orgCourses}>{courseCount} {t('courses').toLowerCase()}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
};

const ExploreScreen = ({ navigation }) => {
  const { isLoading, visibleCourses: courses, organizations } = useCourses();
  const { hPad, hCardW, isTablet } = useResponsive();
  const { t } = useTranslation();
  const [view, setView] = useState('courses');
  const { hideTabBar, showTabBar } = useTabBar();
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y - lastScrollY.current > 10) hideTabBar();
    else if (lastScrollY.current - y > 10) showTabBar();
    lastScrollY.current = y;
  };

  const getOrg = (orgId) => organizations.find((o) => o.id === orgId);
  const getCourseCount = (orgId) => courses.filter((c) => c.organizationId === orgId).length;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const sections = useMemo(() => {
    const byCategory = {};
    courses.forEach((c) => {
      if (!byCategory[c.category]) byCategory[c.category] = [];
      byCategory[c.category].push(c);
    });
    return Object.entries(byCategory).map(([cat, data]) => {
      const catInfo = CATEGORIES.find((c) => c.id === cat);
      return {
        title: catInfo?.label || cat,
        icon: catInfo?.icon || 'book',
        color: catInfo?.color || COLORS.primary,
        data: [data],
        key: cat,
      };
    });
  }, [courses]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppText style={styles.headerTitle}>{t('explore')}</AppText>
        <View style={styles.viewToggle}>
          {['courses', 'organizations'].map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.toggleBtn, view === v && styles.toggleBtnActive]}
              onPress={() => setView(v)}
            >
              <AppText style={[styles.toggleText, view === v && styles.toggleTextActive]}>
                {v === 'courses' ? t('courses') : t('orgs')}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {view === 'organizations' ? (
        <FlatList
          key={isTablet ? 'org-2col' : 'org-1col'}
          data={organizations}
          keyExtractor={(o) => o.id}
          numColumns={isTablet ? 2 : 1}
          renderItem={({ item }) => (
            <View style={{ flex: 1, padding: 4 }}>
              <OrgCard
                org={item}
                courseCount={getCourseCount(item.id)}
                onPress={() => navigation.navigate('OrganizationProfile', { orgId: item.id })}
              />
            </View>
          )}
          contentContainerStyle={[styles.orgList, { paddingHorizontal: hPad, paddingBottom: TAB_BAR_HEIGHT + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `section-${index}`}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={18} color={section.color} />
              <AppText style={[styles.sectionTitle, { color: section.color }]}>{section.title}</AppText>
            </View>
          )}
          renderItem={({ item: courseGroup }) => (
            <FlatList
              horizontal
              data={courseGroup}
              keyExtractor={(c) => c.id}
              renderItem={({ item: course }) => (
                <TouchableOpacity
                  style={[styles.hCard, { width: hCardW }]}
                  onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: course.thumbnail }} style={styles.hThumb} />
                  <View style={styles.hInfo}>
                    <AppText style={styles.hTitle} numberOfLines={2}>{course.title}</AppText>
                    <AppText style={styles.hOrg} numberOfLines={1}>
                      {getOrg(course.organizationId)?.name}
                    </AppText>
                    <View style={styles.hMeta}>
                      <Ionicons name="book-outline" size={11} color={COLORS.textMuted} />
                      <AppText style={styles.hMetaText}>{course.lessonIds.length} {t('lessons').toLowerCase()}</AppText>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: SIZES.xxl,
    fontWeight: '800',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  hList: { paddingLeft: 16, paddingRight: 8, gap: 12 },
  hCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hThumb: {
    width: '100%',
    height: 110,
    backgroundColor: COLORS.surface,
  },
  hInfo: { padding: 10 },
  hTitle: {
    color: COLORS.text,
    fontSize: SIZES.sm,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  hOrg: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  hMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hMetaText: { color: COLORS.textMuted, fontSize: 11 },
  listContent: { paddingBottom: 100 },
  // Org cards
  orgList: { padding: 8, paddingBottom: 100 },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
  },
  orgLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  orgInfo: { flex: 1 },
  orgName: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  orgCourses: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
});

export default ExploreScreen;
