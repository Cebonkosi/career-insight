import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AuthScreen } from '@/components/auth/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    // On success the root layout's guards move us on; nothing to navigate here.
    if (error) Alert.alert('Could not sign in', errorMessage(error, 'Please try again.'));
  }

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to discover bursaries, internships and more.">
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
        autoComplete="current-password"
        textContentType="password"
      />
      <Button
        title="Sign in"
        onPress={handleSignIn}
        loading={submitting}
        disabled={!email || !password}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        New to Career Insight?{' '}
        <Link href="/sign-up" replace>
          <ThemedText type="smallBold" themeColor="primary">
            Create an account
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
