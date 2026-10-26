import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AuthScreen } from '@/components/auth/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setSubmitting(false);
    if (error) {
      Alert.alert('Could not create account', errorMessage(error, 'Please try again.'));
      return;
    }
    // With email confirmation on, there is no session until the emailed code is verified.
    if (!data.session) setStep('verify');
  }

  async function handleVerify() {
    setSubmitting(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' });
    setSubmitting(false);
    if (error) Alert.alert('Invalid code', errorMessage(error, 'Check the code and try again.'));
  }

  async function handleResend() {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    Alert.alert(error ? 'Could not resend' : 'Code sent', error ? error.message : `Check ${email.trim()}`);
  }

  if (step === 'verify') {
    return (
      <AuthScreen title="Verify your email" subtitle={`Enter the 6-digit code we sent to ${email.trim()}.`}>
        <TextField
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        <Button title="Verify & continue" onPress={handleVerify} loading={submitting} disabled={code.length < 6} />
        <Button title="Resend code" variant="ghost" onPress={handleResend} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Create your account" subtitle="Your career journey starts here.">
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="At least 8 characters"
      />
      <TextField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Button
        title="Sign up"
        onPress={handleSignUp}
        loading={submitting}
        disabled={!email || !password || !confirmPassword}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        Already have an account?{' '}
        <Link href="/sign-in" replace>
          <ThemedText type="smallBold" themeColor="primary">
            Sign in
          </ThemedText>
        </Link>
      </ThemedText>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: {
    textAlign: 'center',
  },
});
