import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import { isValidUsername, isValidPhone, passwordStrength } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../utils/responsive';

const InputField = ({ icon, placeholder, value, onChangeText, secureEntry, keyboardType, error, rightElement }) => {
  const [secure, setSecure] = useState(secureEntry);
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.inputRow, error && styles.inputError]}>
        <Ionicons name={icon} size={18} color={COLORS.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          keyboardType={keyboardType || 'default'}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {secureEntry && (
          <TouchableOpacity onPress={() => setSecure((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        {rightElement}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const StrengthBar = ({ password }) => {
  const s = passwordStrength(password);
  if (!password) return null;
  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthTrack}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[styles.strengthSeg, { backgroundColor: i <= s.level ? s.color : COLORS.border }]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color: s.color }]}>{s.label}</Text>
    </View>
  );
};

const AuthScreen = () => {
  const { signIn, signUp } = useAuth();
  const { formPad, formMaxW, isLandscape } = useResponsive();
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', fullName: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const validate = useCallback(() => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required';
    else if (mode === 'signup' && !isValidUsername(form.username))
      e.username = '3-20 chars, letters/numbers/underscore only';
    if (mode === 'signup') {
      if (!form.fullName.trim()) e.fullName = 'Full name is required';
      if (!form.phone.trim()) e.phone = 'Phone number is required';
      else if (!isValidPhone(form.phone)) e.phone = 'Enter a valid phone number';
    }
    if (!form.password) e.password = 'Password is required';
    else if (mode === 'signup' && form.password.length < 8)
      e.password = 'Minimum 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, mode]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(form.username, form.password);
      } else {
        await signUp({
          username: form.username,
          fullName: form.fullName,
          phone: form.phone,
          password: form.password,
        });
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [form, mode, validate, signIn, signUp]);

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setErrors({});
    setForm({ username: '', fullName: '', phone: '', password: '' });
  };

  const isSignUp = mode === 'signup';

  return (
    <LinearGradient colors={['#000000', '#0D0D1A']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingHorizontal: formPad, paddingTop: isLandscape ? 32 : 80 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ maxWidth: formMaxW, width: '100%', alignSelf: 'center' }}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <Ionicons name="play-circle" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.logoText}>EduTok</Text>
            <Text style={styles.logoSub}>Micro-learning, maximum growth.</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, !isSignUp && styles.modeBtnActive]}
              onPress={() => mode !== 'signin' && toggleMode()}
            >
              <Text style={[styles.modeBtnText, !isSignUp && styles.modeBtnTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, isSignUp && styles.modeBtnActive]}
              onPress={() => mode !== 'signup' && toggleMode()}
            >
              <Text style={[styles.modeBtnText, isSignUp && styles.modeBtnTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignUp && (
              <InputField
                icon="person-outline"
                placeholder="Full Name"
                value={form.fullName}
                onChangeText={set('fullName')}
                error={errors.fullName}
              />
            )}
            <InputField
              icon="at-outline"
              placeholder="Username"
              value={form.username}
              onChangeText={set('username')}
              error={errors.username}
            />
            {isSignUp && (
              <InputField
                icon="call-outline"
                placeholder="Phone Number (e.g. +1 555 000 0000)"
                value={form.phone}
                onChangeText={set('phone')}
                keyboardType="phone-pad"
                error={errors.phone}
              />
            )}
            <InputField
              icon="lock-closed-outline"
              placeholder="Password"
              value={form.password}
              onChangeText={set('password')}
              secureEntry
              error={errors.password}
            />
            {isSignUp && <StrengthBar password={form.password} />}

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch link */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.switchLink}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoText: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoSub: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  modeBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: SIZES.base,
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  form: {
    gap: 14,
  },
  fieldWrap: { gap: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.base,
    paddingVertical: 14,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.xs,
    marginLeft: 4,
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -4,
  },
  strengthTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    width: 68,
    textAlign: 'right',
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: COLORS.secondary, fontSize: SIZES.sm, fontWeight: '600' },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
  },
  switchText: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  switchLink: { color: COLORS.secondary, fontSize: SIZES.sm, fontWeight: '700' },
});

export default AuthScreen;
