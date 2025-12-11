import React from 'react';
import { 
  TextInput, 
  View, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  TextInputProps 
} from 'react-native';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}
      
      <View style={[
        styles.inputContainer,
        error && styles.inputContainerError,
        textInputProps.multiline && styles.inputContainerMultiline
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            inputStyle
          ]}
          placeholderTextColor={colors.textSecondary}
          {...textInputProps}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  label: {
    ...typography.body2,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  
  inputContainerError: {
    borderColor: colors.error,
  },
  
  inputContainerMultiline: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  
  leftIcon: {
    marginRight: 12,
  },
  
  rightIcon: {
    marginLeft: 12,
  },
  
  input: {
    ...typography.body1,
    flex: 1,
    color: colors.text,
    minHeight: 24,
  },
  
  inputWithLeftIcon: {
    marginLeft: 0,
  },
  
  inputWithRightIcon: {
    marginRight: 0,
  },
  
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
});

export default Input;