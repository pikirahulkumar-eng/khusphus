import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = () => {
    if (phoneNumber.length < 10) return;
    setLoading(true);
    // TODO: Connect Firebase Phone Auth here
    setTimeout(() => {
      setLoading(false);
      setStep('OTP');
    }, 1500);
  };

  const handleVerifyOtp = () => {
    if (otp.length < 6) return;
    setLoading(true);
    
    // Dummy OTP logic for testing
    setTimeout(() => {
      setLoading(false);
      if (otp === '123456') {
        onLoginSuccess();
      } else {
        alert('Invalid OTP! Please enter 123456 for testing.');
      }
    }, 1000);
  };

  if (step === 'OTP') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Verifying your number</Text>
          </View>
          <Text style={styles.subtitle}>
            Waiting to automatically detect an SMS sent to +91 {phoneNumber}.{' '}
            <Text style={styles.wrongNumberText} onPress={() => setStep('PHONE')}>
              Wrong number?
            </Text>
          </Text>

          <TextInput
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="--- ---"
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />
          <Text style={styles.resendText}>Enter 6-digit code</Text>

          <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading || otp.length < 6}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Verify</Text>}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Enter your phone number</Text>
        </View>
        <Text style={styles.subtitle}>
          KhusPhus will need to verify your phone number. Carrier charges may apply.
        </Text>

        <View style={styles.inputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryText}>IN +91</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            keyboardType="phone-pad"
            placeholder="phone number"
            maxLength={10}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            autoFocus
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading || phoneNumber.length < 10}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Next</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  inner: { flex: 1, alignItems: 'center', padding: 24, marginTop: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '600', color: '#128C7E' },
  subtitle: { fontSize: 14, color: '#5E5E5E', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  wrongNumberText: { color: '#128C7E', fontWeight: 'bold' },
  inputContainer: {
    flexDirection: 'row',
    width: '80%',
    borderBottomWidth: 2,
    borderBottomColor: '#128C7E',
    paddingBottom: 4,
    marginBottom: 40,
  },
  countryCode: {
    borderRightWidth: 1,
    borderRightColor: '#CCC',
    paddingRight: 12,
    marginRight: 12,
    justifyContent: 'center',
  },
  countryText: { fontSize: 18, color: '#000' },
  phoneInput: { flex: 1, fontSize: 18, color: '#000' },
  otpInput: {
    fontSize: 32,
    letterSpacing: 8,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#128C7E',
    width: 160,
    marginBottom: 16,
  },
  resendText: { fontSize: 14, color: '#5E5E5E', marginBottom: 40 },
  button: {
    backgroundColor: '#128C7E',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
