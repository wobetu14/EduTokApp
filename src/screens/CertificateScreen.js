import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS, SIZES } from '../utils/constants';
import { useCourses } from '../context/CourseContext';
import { buildCertificateHtml } from '../utils/certificateTemplate';
import { useTranslation } from '../utils/useTranslation';
import { t as _t } from '../utils/i18n';
import AppText from '../components/AppText';

const CATEGORY_PRIMARIES = {
  engineering: '#1B4332',
  ai:          '#0F3460',
  digital:     '#1B2A4A',
  math:        '#3B1F8C',
  psychology:  '#1A3A2A',
  business:    '#7C2D12',
  finance:     '#14532D',
  art:         '#4A044E',
};

const GOLD = '#D4AF37';

const CertificatePreview = ({ cert }) => {
  const { getCategory } = useCourses();
  const catInfo = getCategory(cert.category);
  const primary = CATEGORY_PRIMARIES[catInfo?.id] || CATEGORY_PRIMARIES[cert.category] || '#1B4332';
  const date = new Date(cert.issuedAt);
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  // Server-issued certs carry a verifiable EDUTOK-XXXXXXXXXX number
  const certIdValue = cert.certificateNumber || `EDUTOK-${cert.id.slice(-10).toUpperCase()}`;

  return (
    <View style={[styles.certCard, { borderColor: GOLD + '55' }]}>
      {/* Corner accents */}
      <View style={[styles.corner, styles.cornerTL, { borderColor: GOLD }]} />
      <View style={[styles.corner, styles.cornerTR, { borderColor: GOLD }]} />
      <View style={[styles.corner, styles.cornerBL, { borderColor: GOLD }]} />
      <View style={[styles.corner, styles.cornerBR, { borderColor: GOLD }]} />

      {/* Header band */}
      <LinearGradient colors={[primary, primary + 'dd']} style={styles.certHeader}>
        <View style={styles.certHeaderLogo}>
          <AppText style={styles.certHeaderLogoText}>E</AppText>
        </View>
        <View style={styles.certHeaderText}>
          <AppText style={styles.certPlatformName}>EduTok</AppText>
          <AppText style={styles.certPlatformSub}>Micro-Learning Platform</AppText>
        </View>
        {catInfo && (
          <View style={[styles.certCategoryBadge, { borderColor: 'rgba(255,255,255,0.3)' }]}>
            <AppText style={styles.certCategoryText}>{cert.category.toUpperCase()}</AppText>
          </View>
        )}
      </LinearGradient>

      {/* Body */}
      <View style={styles.certBody}>
        <AppText style={styles.certLabel}>Certificate of Completion</AppText>
        <AppText style={styles.certTypeText}>This is to certify that</AppText>
        <AppText style={[styles.certStudentName, { color: primary }]}>{cert.studentName}</AppText>
        <AppText style={styles.certCompletedText}>has successfully completed</AppText>
        <AppText style={[styles.certCourseName, { color: primary }]}>{cert.courseName}</AppText>
        <AppText style={styles.certOfferedBy}>
          offered by {cert.organizationName}  ·  {cert.difficulty || 'Course'} Level
        </AppText>

        {/* Gold divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: GOLD }]} />
          <View style={[styles.dividerDiamond, { backgroundColor: GOLD }]} />
          <View style={[styles.dividerLine, { backgroundColor: GOLD }]} />
        </View>

        {/* Footer row */}
        <View style={styles.certFooter}>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <AppText style={styles.sigName}>{cert.authorName}</AppText>
            <AppText style={styles.sigTitle}>Instructor</AppText>
          </View>

          {/* Seal */}
          <View style={[styles.seal, { backgroundColor: primary, borderColor: GOLD }]}>
            <View style={styles.sealRing} />
            <Ionicons name="star" size={22} color={GOLD} />
            <AppText style={styles.sealText}>Verified{'\n'}Completion</AppText>
          </View>

          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <AppText style={styles.sigName}>{dateStr}</AppText>
            <AppText style={styles.sigTitle}>Date Completed</AppText>
          </View>
        </View>
      </View>

      {/* Certificate ID strip */}
      <View style={[styles.certIdStrip, { backgroundColor: '#f8f5ee' }]}>
        <AppText style={styles.certIdLabel}>Certificate ID</AppText>
        <AppText style={styles.certIdValue}>{certIdValue}</AppText>
        <AppText style={styles.certIdLabel}>edutok.app/verify</AppText>
      </View>
    </View>
  );
};

const CertificateScreen = ({ route, navigation }) => {
  const { certificate } = route.params;
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const html = buildCertificateHtml(certificate);

      if (Platform.OS === 'web') {
        const win = window.open('', '_blank', 'width=960,height=700');
        if (!win) {
          Alert.alert(t('popupBlocked'), t('popupBlockedMsg'));
          return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
      } else {
        const { uri } = await Print.printToFileAsync({ html, width: 900, height: 636 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `${certificate.courseName} Certificate`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert(t('certSaved'), `Certificate saved to: ${uri}`);
        }
      }
    } catch (err) {
      Alert.alert('Error', t('certError'));
    } finally {
      setIsGenerating(false);
    }
  }, [certificate, t]);

  const primary = CATEGORY_PRIMARIES[certificate.category] || '#1B4332';

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <LinearGradient colors={[primary, '#000']} style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topBarContent}>
          <AppText style={styles.topBarTitle}>{t('yourCertificate')}</AppText>
          <AppText style={styles.topBarSub}>{certificate.courseName}</AppText>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Certificate preview */}
        <CertificatePreview cert={certificate} />

        {/* Info cards */}
        <View style={styles.infoRow}>
          {[
            { icon: 'school-outline', label: t('instructor'), value: certificate.authorName },
            { icon: 'business-outline', label: t('organization'), value: certificate.organizationName },
            { icon: 'ribbon-outline', label: t('level'), value: certificate.difficulty || t('courses') },
          ].map((item) => (
            <View key={item.label} style={styles.infoCard}>
              <Ionicons name={item.icon} size={18} color={COLORS.secondary} />
              <AppText style={styles.infoLabel}>{item.label}</AppText>
              <AppText style={styles.infoValue} numberOfLines={2}>{item.value}</AppText>
            </View>
          ))}
        </View>

        {/* Completion notice */}
        <View style={styles.notice}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <AppText style={styles.noticeText}>
            {certificate.courseName} — {t('allLessonsCompleted')}
          </AppText>
        </View>
      </ScrollView>

      {/* Download button */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: primary }]}
          onPress={handleDownload}
          disabled={isGenerating}
          activeOpacity={0.85}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name={Platform.OS === 'web' ? 'print-outline' : 'share-outline'} size={20} color="#fff" />
          )}
          <AppText style={styles.downloadBtnText}>
            {isGenerating ? t('generating') : Platform.OS === 'web' ? t('printSavePdf') : t('downloadSharePdf')}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  topBarContent: { flex: 1 },
  topBarTitle: { color: '#fff', fontSize: SIZES.base, fontWeight: '700' },
  topBarSub: { color: 'rgba(255,255,255,0.65)', fontSize: SIZES.xs, marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Certificate card
  certCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  corner: { position: 'absolute', width: 24, height: 24, zIndex: 2, borderWidth: 2 },
  cornerTL: { top: 10, left: 10, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: 10, right: 10, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: 10, left: 10, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: 10, right: 10, borderTopWidth: 0, borderLeftWidth: 0 },

  certHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  certHeaderLogo: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  certHeaderLogoText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  certHeaderText: { flex: 1 },
  certPlatformName: { color: '#fff', fontWeight: '800', fontSize: SIZES.base },
  certPlatformSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 1 },
  certCategoryBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  certCategoryText: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

  certBody: { padding: 20, alignItems: 'center' },
  certLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 3, color: GOLD, marginBottom: 10 },
  certTypeText: { color: '#666', fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  certStudentName: { fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 36, marginVertical: 6 },
  certCompletedText: { color: '#555', fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  certCourseName: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 24, marginBottom: 4 },
  certOfferedBy: { color: '#888', fontSize: 11, textAlign: 'center', marginBottom: 16 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, width: '60%' },
  dividerLine: { flex: 1, height: 1 },
  dividerDiamond: { width: 7, height: 7, transform: [{ rotate: '45deg' }] },

  certFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', paddingHorizontal: 8 },
  sigBlock: { alignItems: 'center', minWidth: 110 },
  sigLine: { borderTopWidth: 1.5, borderTopColor: '#ccc', width: 110, marginBottom: 5 },
  sigName: { fontSize: 11, fontWeight: '700', color: '#222', textAlign: 'center' },
  sigTitle: { fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 },

  seal: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 2 },
  sealRing: { position: 'absolute', top: 4, bottom: 4, left: 4, right: 4, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  sealText: { color: 'rgba(255,255,255,0.8)', fontSize: 7, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  certIdStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e8e2d4' },
  certIdLabel: { fontSize: 9, color: '#bbb' },
  certIdValue: { fontSize: 9, color: '#999', fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }) },

  // Info cards
  infoRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  infoCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  infoLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  infoValue: { color: COLORS.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },

  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.success + '18', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: COLORS.success + '44' },
  noticeText: { flex: 1, color: COLORS.success, fontSize: SIZES.sm, fontWeight: '600' },

  // Action bar
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  downloadBtnText: { color: '#fff', fontWeight: '800', fontSize: SIZES.base },
});

export default CertificateScreen;
