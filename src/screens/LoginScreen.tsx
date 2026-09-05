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
import { SunaoTheme } from '../constants/theme';

export default function LoginScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: (phone: string) => void;
}) {
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) return;
    setLoading(true);

    // Fast seamless OTP simulation for zero friction
    setTimeout(() => {
      setLoading(false);
      setStep('OTP');
    }, 600);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (otp === '123456' || otp.length === 6) {
        onLoginSuccess(phoneNumber);
      } else {
        Alert.alert('Invalid OTP', 'Please enter 123456 or any 6-digit code for testing.');
      }
    }, 600);
  };

  if (step === 'OTP') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
        >
          {/* Header Card */}
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={28} color="#059669" />
          </View>

          <Text style={styles.title}>Confirm Your Code</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{' '}
            <Text style={styles.phoneHighlight}>+91 {phoneNumber}</Text>
          </Text>

          <TouchableOpacity
            style={styles.changePhoneBtn}
            onPress={() => {
              setStep('PHONE');
              setOtp('');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.changePhoneText}>Change number</Text>
          </TouchableOpacity>

          {/* OTP Box */}
          <View style={styles.cardBox}>
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor="#94A3B8"
              value={otp}
              onChangeText={setOtp}
              autoFocus
            />
            <Text style={styles.otpHelpText}>Enter the 6-digit code (Test OTP: 123456)</Text>

            <TouchableOpacity
              style={[styles.primaryBtn, (loading || otp.length < 6) && styles.btnDisabled]}
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Brand Header */}
        <View style={styles.brandHero}>
          <View style={styles.logoBadge}>
            <Ionicons name="radio" size={32} color="#059669" />
          </View>
          <Text style={styles.brandTitle}>Sunao</Text>
          <Text style={styles.brandSubtitle}>
            Direct Calls & Instant Chats • 100% Private
          </Text>
        </View>

        {/* Auth Input Card */}
        <View style={styles.cardBox}>
          <Text style={styles.inputLabel}>Enter Phone Number</Text>
          <Text style={styles.inputHelp}>
            Connect with friends and family with instant calls and chats.
          </Text>

          <View style={styles.phoneInputRow}>
            <View style={styles.countryCodeBox}>
              <Text style={styles.countryFlag}>🇮🇳</Text>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              placeholderTextColor="#94A3B8"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (loading || phoneNumber.length < 10) && styles.btnDisabled,
            ]}
            onPress={handleSendOtp}
            disabled={loading || phoneNumber.length < 10}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.encryptionNote}>
            <Ionicons name="lock-closed" size={13} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.encryptionNoteText}>
              Private & Secure • Zero logs saved
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
  inputLabel: {
    fontSize: 16,
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
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
