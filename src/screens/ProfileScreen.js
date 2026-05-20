import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, CATEGORIES } from '../utils/constants';
import ProgressBar from '../components/ProgressBar';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import { formatTimeAgo } from '../utils/helpers';
import { useResponsive } from '../utils/responsive';
import { useTranslation } from '../utils/useTranslation';
import { scheduleDailyReminder, cancelDailyReminder, requestPermissions } from '../services/notificationService';

const StatCard = ({ icon, value, label, color }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={22} color={color || COLORS.secondary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SectionTitle = ({ children }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, updateUser } = useAuth();
  const { hPad, formMaxW } = useResponsive();
  const { t } = useTranslation();
  const {
    courses,
    organizations,
    progress,
    getCourseProgress,
    getLessonsForCourse,
  } = useCourses();

  const handleViewCertificate = (course) => {
    const org = organizations.find((o) => o.id === course.organizationId);
    const issuedAt = course.lessonIds
      .map((lid) => progress.completedLessons.find((cl) => cl.lessonId === lid)?.completedAt)
      .filter(Boolean)
      .sort()
      .pop() || new Date().toISOString();
    navigation.navigate('Certificate', {
      certificate: {
        id: `cert-${course.id}-${user?.id || 'user'}`,
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: user?.fullName || '', bio: user?.bio || '' });
  const [activeTab, setActiveTab] = useState('progress');

  const enrolledCourses = useMemo(
    () => courses.filter((c) => progress.enrolledCourses.includes(c.id)),
    [courses, progress.enrolledCourses]
  );

  const completedCourses = useMemo(
    () => enrolledCourses.filter((c) => getCourseProgress(c.id) === 100),
    [enrolledCourses, getCourseProgress]
  );

  const inProgressCourses = useMemo(
    () => enrolledCourses.filter((c) => {
      const p = getCourseProgress(c.id);
      return p > 0 && p < 100;
    }),
    [enrolledCourses, getCourseProgress]
  );

  const favoritedLessons = useMemo(() => {
    const ids = progress.favoritedLessons;
    const all = courses.flatMap((c) => getLessonsForCourse(c.id));
    return all.filter((l) => ids.includes(l.id));
  }, [progress.favoritedLessons, courses, getLessonsForCourse]);

  const totalHours = Math.round((progress.totalSeconds || 0) / 3600 * 10) / 10;

  const handleSaveProfile = async () => {
    await updateUser(editForm);
    setShowEditModal(false);
  };

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirmMsg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const handleLanguageToggle = async () => {
    const newLang = user?.language === 'en' ? 'am' : 'en';
    await updateUser({ language: newLang });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#0D0D1A', COLORS.background]} style={styles.headerBg}>
        <View style={[styles.profileHeader, { paddingHorizontal: hPad }]}>
          <Image
            source={{ uri: user?.avatar || `https://picsum.photos/seed/profile/200/200` }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.fullName}>{user?.fullName}</Text>
            <Text style={styles.username}>@{user?.username}</Text>
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="pencil" size={16} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { paddingHorizontal: hPad }]}>
          <StatCard icon="trophy" value={completedCourses.length} label={t('completedStatus')} color={COLORS.success} />
          <StatCard icon="time" value={`${totalHours}h`} label={t('learnedLabel')} color={COLORS.secondary} />
          <StatCard icon="flame" value={progress.streak || 0} label={t('currentStreak')} color={COLORS.primary} />
          <StatCard icon="bookmark" value={favoritedLessons.length} label={t('savedLabel')} color="#FF9800" />
        </View>
      </LinearGradient>

      {/* Verification banner */}
      {!user?.phoneVerified && (
        <TouchableOpacity style={[styles.verifyBanner, { marginHorizontal: hPad }]}>
          <Ionicons name="warning" size={16} color={COLORS.warning} />
          <Text style={styles.verifyText}>{t('phoneNotVerified')}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.warning} />
        </TouchableOpacity>
      )}

      {/* Tab row */}
      <View style={[styles.tabRow, { paddingHorizontal: hPad }]}>
        {[
          { key: 'progress', label: t('progressTab') },
          { key: 'certs',    label: `${t('certsTab')}${completedCourses.length > 0 ? ` (${completedCourses.length})` : ''}` },
          { key: 'saved',    label: t('favoriteLessons') },
          { key: 'history',  label: t('history') },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'progress' && (
        <View style={styles.section}>
          {enrolledCourses.length === 0 ? (
            <Text style={styles.emptyText}>{t('noEnrolledCourses')}</Text>
          ) : (
            enrolledCourses.map((course) => {
              const p = getCourseProgress(course.id);
              return (
                <TouchableOpacity
                  key={course.id}
                  style={styles.courseRow}
                  onPress={() => navigation.navigate('CourseProfile', { courseId: course.id })}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: course.thumbnail }} style={styles.courseThumb} />
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                    <View style={styles.courseStatus}>
                      {p === 100 ? (
                        <View style={styles.completedRow}>
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                            <Text style={styles.completedText}>{t('completedStatus')}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.certIconBtn}
                            onPress={() => handleViewCertificate(course)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="ribbon" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                      ) : p > 0 ? (
                        <Text style={styles.inProgressText}>{p}%</Text>
                      ) : (
                        <Text style={styles.notStartedText}>{t('notStarted')}</Text>
                      )}
                    </View>
                    <ProgressBar percent={p} height={3} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {activeTab === 'certs' && (
        <View style={styles.section}>
          {completedCourses.length === 0 ? (
            <Text style={styles.emptyText}>{t('noCertsYet')}</Text>
          ) : (
            completedCourses.map((course) => {
              const org = organizations.find((o) => o.id === course.organizationId);
              const catInfo = CATEGORIES.find((c) => c.id === course.category);
              const issuedAt = course.lessonIds
                .map((lid) => progress.completedLessons.find((cl) => cl.lessonId === lid)?.completedAt)
                .filter(Boolean).sort().pop() || new Date().toISOString();
              const dateStr = new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              return (
                <View key={course.id} style={styles.certCard}>
                  {/* Gold top accent */}
                  <View style={styles.certCardAccent} />
                  <View style={styles.certCardBody}>
                    {/* Category chip */}
                    {catInfo && (
                      <View style={[styles.certChip, { backgroundColor: catInfo.color + '22', borderColor: catInfo.color + '66' }]}>
                        <Ionicons name={catInfo.icon} size={11} color={catInfo.color} />
                        <Text style={[styles.certChipText, { color: catInfo.color }]}>{catInfo.label}</Text>
                      </View>
                    )}
                    <Text style={styles.certCardTitle} numberOfLines={2}>{course.title}</Text>
                    <Text style={styles.certCardOrg}>{org?.name || 'EduTok'}</Text>
                    <View style={styles.certCardMeta}>
                      <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.certCardDate}>{t('issuedLabel')} {dateStr}</Text>
                      {course.difficulty ? (
                        <View style={styles.certDiffBadge}>
                          <Text style={styles.certDiffText}>{course.difficulty}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.certCardBtn}
                    onPress={() => handleViewCertificate(course)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ribbon" size={16} color="#fff" />
                    <Text style={styles.certCardBtnText}>{t('viewAndPrint')}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      )}

      {activeTab === 'saved' && (
        <View style={styles.section}>
          {favoritedLessons.length === 0 ? (
            <Text style={styles.emptyText}>{t('noSavedLessons')}</Text>
          ) : (
            favoritedLessons.map((lesson) => (
              <View key={lesson.id} style={styles.savedRow}>
                <Image source={{ uri: lesson.thumbnail }} style={styles.savedThumb} />
                <View style={styles.savedInfo}>
                  <Text style={styles.savedTitle} numberOfLines={2}>{lesson.title}</Text>
                  <View style={styles.savedMeta}>
                    <Ionicons name="bookmark" size={12} color={COLORS.secondary} />
                    <Text style={styles.savedType}>{lesson.type}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 'history' && (
        <View style={styles.section}>
          {progress.completedLessons.length === 0 ? (
            <Text style={styles.emptyText}>{t('noCompletedLessons')}</Text>
          ) : (
            [...progress.completedLessons].reverse().slice(0, 20).map((cl, i) => {
              const lesson = courses.flatMap((c) => getLessonsForCourse(c.id)).find((l) => l.id === cl.lessonId);
              if (!lesson) return null;
              return (
                <View key={cl.lessonId + i} style={styles.historyRow}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{lesson.title}</Text>
                    <Text style={styles.historyTime}>{formatTimeAgo(cl.completedAt)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Settings */}
      <SectionTitle>{t('settings')}</SectionTitle>
      <View style={[styles.settingsSection, { marginHorizontal: hPad }]}>
        <View style={styles.settingRow}>
          <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.settingLabel}>{t('notifications')}</Text>
          <Switch
            value={user?.notificationsEnabled ?? true}
            onValueChange={async (val) => {
              await updateUser({ notificationsEnabled: val });
              if (val) {
                const granted = await requestPermissions();
                if (granted) await scheduleDailyReminder();
              } else {
                await cancelDailyReminder();
              }
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.settingRow}>
          <Ionicons name="language-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.settingLabel}>{t('language')}</Text>
          <TouchableOpacity style={styles.langToggle} onPress={handleLanguageToggle}>
            <Text style={styles.langToggleText}>{user?.language === 'am' ? 'አማርኛ' : 'English'}</Text>
            <Ionicons name="swap-horizontal" size={14} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.settingRow}>
          <Ionicons name={user?.phoneVerified ? 'shield-checkmark' : 'shield-outline'} size={20} color={user?.phoneVerified ? COLORS.success : COLORS.warning} />
          <Text style={styles.settingLabel}>{t('phoneVerification')}</Text>
          <Text style={[styles.verifyStatus, { color: user?.phoneVerified ? COLORS.success : COLORS.warning }]}>
            {user?.phoneVerified ? t('verified') : t('notVerified')}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.signOutBtn, { marginHorizontal: hPad }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.signOutText}>{t('signOut')}</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { maxWidth: formMaxW, width: '100%', alignSelf: 'center' }]}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>{t('editProfile')}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.editLabel}>{t('fullName')}</Text>
            <TextInput
              style={styles.editInput}
              value={editForm.fullName}
              onChangeText={(v) => setEditForm((f) => ({ ...f, fullName: v }))}
              placeholder={t('yourFullNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.editLabel}>{t('bioLabel')}</Text>
            <TextInput
              style={[styles.editInput, styles.editTextarea]}
              value={editForm.bio}
              onChangeText={(v) => setEditForm((f) => ({ ...f, bio: v }))}
              placeholder={t('aboutYourselfPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={160}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBg: { paddingTop: 16, paddingBottom: 8 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileInfo: { flex: 1, gap: 3 },
  fullName: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '800' },
  username: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  bio: { color: COLORS.textSecondary, fontSize: SIZES.sm, lineHeight: 20, marginTop: 4 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  statValue: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warning + '22',
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.warning + '66',
  },
  verifyText: { flex: 1, color: COLORS.warning, fontSize: SIZES.sm, fontWeight: '600' },
  tabRow: {
    flexDirection: 'row',
    paddingTop: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600' },
  tabTextActive: { color: COLORS.text, fontWeight: '700' },
  section: { padding: 16, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.sm, textAlign: 'center', paddingTop: 24 },
  courseRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  courseThumb: { width: 80, height: 80, backgroundColor: COLORS.surface },
  courseInfo: { flex: 1, padding: 10, justifyContent: 'center', gap: 6 },
  courseTitle: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '700', lineHeight: 18 },
  courseStatus: { flexDirection: 'row', alignItems: 'center' },
  completedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completedText: { color: COLORS.success, fontSize: SIZES.xs, fontWeight: '700' },
  certIconBtn: { padding: 2 },
  // Certs tab
  certCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D4AF3744',
  },
  certCardAccent: { height: 3, backgroundColor: '#D4AF37' },
  certCardBody: { padding: 14, gap: 6 },
  certChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 2,
  },
  certChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  certCardTitle: { color: COLORS.text, fontSize: SIZES.base, fontWeight: '700', lineHeight: 20 },
  certCardOrg: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  certCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  certCardDate: { color: COLORS.textMuted, fontSize: SIZES.xs, flex: 1 },
  certDiffBadge: { backgroundColor: COLORS.surface, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  certDiffText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600' },
  certCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
  },
  certCardBtnText: { color: '#fff', fontWeight: '700', fontSize: SIZES.sm },
  inProgressText: { color: COLORS.secondary, fontSize: SIZES.xs, fontWeight: '600' },
  notStartedText: { color: COLORS.textMuted, fontSize: SIZES.xs },
  savedRow: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden' },
  savedThumb: { width: 70, height: 70, backgroundColor: COLORS.surface },
  savedInfo: { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  savedTitle: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '700', lineHeight: 18 },
  savedMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedType: { color: COLORS.secondary, fontSize: SIZES.xs, fontWeight: '600', textTransform: 'capitalize' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.success + '22', alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyTitle: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '600' },
  historyTime: { color: COLORS.textMuted, fontSize: SIZES.xs },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  settingsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: { flex: 1, color: COLORS.text, fontSize: SIZES.sm, fontWeight: '500' },
  langToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  langToggleText: { color: COLORS.secondary, fontSize: SIZES.sm, fontWeight: '700' },
  verifyStatus: { fontSize: SIZES.xs, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.error + '22',
    borderWidth: 1,
    borderColor: COLORS.error + '55',
  },
  signOutText: { color: COLORS.error, fontWeight: '700', fontSize: SIZES.base },
  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  editModal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  editModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  editModalTitle: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '700' },
  editLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600', marginBottom: 6 },
  editInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: SIZES.base,
    marginBottom: 16,
  },
  editTextarea: { height: 90, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: SIZES.base },
});

export default ProfileScreen;
