import { TextStyle } from 'react-native';

export const typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xl2: 24,
    xl3: 28,
    xl4: 32,
    xl5: 36,
  },
  
  // Font weights
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    bold: '600',
    extraBold: '700',
  },
  
  // Text styles
  h1: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 40,
    fontFamily: 'System',
  } as TextStyle,
  
  h2: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
    fontFamily: 'System',
  } as TextStyle,
  
  h3: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    fontFamily: 'System',
  } as TextStyle,
  
  h4: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 28,
    fontFamily: 'System',
  } as TextStyle,
  
  h5: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'System',
  } as TextStyle,
  
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    fontFamily: 'System',
  } as TextStyle,
  
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    fontFamily: 'System',
  } as TextStyle,
  
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    fontFamily: 'System',
  } as TextStyle,
  
  button: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'System',
  } as TextStyle,
  
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    fontFamily: 'System',
  } as TextStyle,
};