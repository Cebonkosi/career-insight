import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, style, secureTextEntry, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isPassword && !visible}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
            style,
          ]}
          {...rest}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible((value) => !value)}
            style={styles.toggle}>
            {visible ? (
              <EyeOff color={theme.textSecondary} size={20} strokeWidth={2} />
            ) : (
              <Eye color={theme.textSecondary} size={20} strokeWidth={2} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: Spacing.three + 28,
  },
  toggle: {
    position: 'absolute',
    right: Spacing.three,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
