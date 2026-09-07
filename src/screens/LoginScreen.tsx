import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: (phone: string, name: string) => void;
}) {
  const { isDark } = useTheme();
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const isDetailsValid = name.trim().length >= 2 && phoneNumber.trim().length >= 10;

  const handleSendOtp = async () => {
    if (!isDetailsValid) return;
    setLoading(true);

    // Fast seamless OTP simulation for zero friction
    setTimeout(() => {
      setLoading(false);
      setStep('OTP');
    }, 500);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (otp === '123456' || otp.length === 6) {
        onLoginSuccess(phoneNumber.trim(), name.trim());
      } else {
        Alert.alert('Invalid OTP', 'Please enter 123456 or any 6-digit code for testing.');
      }
    }, 500);
  };

  if (step === 'OTP') {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
        >
          {/* Header Card */}
          <View
            style={[
              styles.logoBadge,
              isDark && {
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={28} color={isDark ? '#10B981' : '#059669'} />
          </View>

          <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>Confirm Your Code</Text>
          <Text style={[styles.subtitle, isDark && { color: '#94A3B8' }]}>
            We've sent a 6-digit verification code for{' '}
            <Text style={[styles.phoneHighlight, isDark && { color: '#00F2FE' }]}>{name.trim()}</Text> to{' '}
            <Text style={[styles.phoneHighlight, isDark && { color: '#10B981' }]}>+91 {phoneNumber}</Text>
          </Text>

          <TouchableOpacity
            style={styles.changePhoneBtn}
            onPress={() => {
              setStep('DETAILS');
              setOtp('');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={14} color={isDark ? '#10B981' : '#059669'} style={{ marginRight: 4 }} />
            <Text style={[styles.changePhoneText, isDark && { color: '#10B981' }]}>Edit name or number</Text>
          </TouchableOpacity>

          {/* OTP Box */}
          <View
            style={[
              styles.cardBox,
              isDark && {
                backgroundColor: '#0D1117',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                shadowColor: '#000000',
              },
            ]}
          >
            <TextInput
              style={[
                styles.otpInput,
                isDark && {
                  backgroundColor: '#161B22',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                },
              ]}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={otp}
              onChangeText={setOtp}
              autoFocus
            />
            <Text style={[styles.otpHelpText, isDark && { color: '#64748B' }]}>
              Enter the 6-digit code (Demo OTP: 123456)
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (loading || otp.length < 6) && styles.btnDisabled,
                isDark && { backgroundColor: '#10B981' },
              ]}
              onPress={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Verify & Enter Sunao</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Brand Header */}
        <View style={styles.brandHero}>
          <View
            style={[
              styles.logoBadge,
              isDark && {
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              },
            ]}
          >
            <Ionicons name="radio" size={32} color={isDark ? '#10B981' : '#059669'} />
          </View>
          <Text style={[styles.brandTitle, isDark && { color: '#FFFFFF' }]}>Sunao</Text>
          <Text style={[styles.brandSubtitle, isDark && { color: '#94A3B8' }]}>
            Direct Calls & Instant Chats • 100% Private
          </Text>
        </View>

        {/* Auth Input Card */}
        <View
          style={[
            styles.cardBox,
            isDark && {
              backgroundColor: '#0D1117',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              shadowColor: '#000000',
            },
          ]}
        >
          <Text style={[styles.inputHeading, isDark && { color: '#FFFFFF' }]}>Create Your Account</Text>
          <Text style={[styles.inputHelp, isDark && { color: '#94A3B8' }]}>
            Enter your name and mobile number to start chatting and calling.
          </Text>

          {/* 1. Full Name Input */}
          <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>Your Full Name</Text>
          <View
            style={[
              styles.inputRow,
              isDark && {
                backgroundColor: '#161B22',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          >
            <View style={styles.inputIconBox}>
              <Ionicons name="person-outline" size={18} color={isDark ? '#10B981' : '#059669'} />
            </View>
            <TextInput
              style={[styles.textInput, isDark && { color: '#FFFFFF' }]}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
            />
          </View>

          {/* 2. Phone Number Input */}
          <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>Phone Number</Text>
          <View
            style={[
              styles.phoneInputRow,
              isDark && {
                backgroundColor: '#161B22',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          >
            <View
              style={[
                styles.countryCodeBox,
                isDark && {
                  backgroundColor: '#0D1117',
                  borderRightColor: 'rgba(255, 255, 255, 0.12)',
                },
              ]}
            >
              <Text style={styles.countryFlag}>🇮🇳</Text>
              <Text style={[styles.countryCodeText, isDark && { color: '#FFFFFF' }]}>+91</Text>
            </View>
            <TextInput
              style={[styles.phoneInput, isDark && { color: '#FFFFFF' }]}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!isDetailsValid || loading) && styles.btnDisabled,
              isDark && { backgroundColor: '#10B981' },
            ]}
            onPress={handleSendOtp}
            disabled={!isDetailsValid || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Continue to Verify</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.encryptionNote}>
            <Ionicons name="lock-closed" size={13} color={isDark ? '#10B981' : '#059669'} style={{ marginRight: 6 }} />
            <Text style={[styles.encryptionNoteText, isDark && { color: '#94A3B8' }]}>
              Private & Secure • Zero Cloud Logs
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  cardBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  inputHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  inputHelp: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 17,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIconBox: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 12,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    gap: 6,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 12,
    letterSpacing: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  encryptionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  encryptionNoteText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 18,
  },
  phoneHighlight: {
    color: '#059669',
    fontWeight: '700',
  },
  changePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  changePhoneText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  otpInput: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    paddingVertical: 12,
    marginBottom: 8,
  },
  otpHelpText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
  },
});
