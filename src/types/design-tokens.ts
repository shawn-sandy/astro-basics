/**
 * Design Token TypeScript Definitions
 * Generated from Component Sample - Light theme
 * Provides type-safe access to design tokens
 */

// =============================================================================
// Color Token Types
// =============================================================================

export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

export interface ColorPalette {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
}

export interface AccentColors {
  red: ColorPalette
  blue: ColorPalette
  green: ColorPalette
  yellow: ColorPalette
  pink: ColorPalette
  slate: ColorPalette
}

export interface SemanticColors {
  text: {
    primary: string
    secondary: string
    tertiary: string
    inverse: string
  }
  background: {
    primary: string
    secondary: string
    elevated: string
    overlay: string
  }
  border: {
    default: string
    focus: string
    error: string
  }
  alert: {
    background: string
    border: string
    text: string
    icon: string
  }
  button: {
    'primary-bg': string
    'primary-bg-hover': string
    'primary-text': string
    'danger-bg': string
    'danger-bg-hover': string
  }
}

export interface ColorTokens {
  primary: ColorPalette
  accent: AccentColors
  semantic: SemanticColors
}

// =============================================================================
// Spacing Token Types
// =============================================================================

export type SpacingScale = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

export interface SpacingTokens {
  scale: Record<SpacingScale, string>
  component: {
    'input-padding-x': string
    'input-padding-y': string
    'button-padding-x': string
    'button-padding-y': string
    'modal-padding': string
    'form-field-gap': string
    'tag-padding-x': string
    'tag-padding-y': string
    'tag-gap': string
  }
}

// =============================================================================
// Typography Token Types
// =============================================================================

export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold'
export type LineHeight = 'tight' | 'normal' | 'relaxed'
export type LetterSpacing = 'tight' | 'normal' | 'wide'

export interface TypographyTokens {
  fontFamily: {
    sans: string
    mono: string
  }
  fontSize: Record<FontSize, string>
  fontWeight: Record<FontWeight, number>
  lineHeight: Record<LineHeight, number>
  letterSpacing: Record<LetterSpacing, string>
}

// =============================================================================
// Border Token Types
// =============================================================================

export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type BorderWidth = 'none' | 'thin' | 'medium' | 'thick'

export interface BorderTokens {
  radius: Record<BorderRadius, string>
  width: Record<BorderWidth, string>
}

// =============================================================================
// Shadow Token Types
// =============================================================================

export type Shadow = 'sm' | 'md' | 'lg' | 'xl'

export interface ShadowToken {
  offsetX: string
  offsetY: string
  blur: string
  spread: string
  color: string
}

export type ShadowTokens = Record<Shadow, ShadowToken>

// =============================================================================
// Opacity Token Types
// =============================================================================

export type Opacity = 0 | 10 | 25 | 50 | 75 | 90 | 100

export type OpacityTokens = Record<Opacity, number>

// =============================================================================
// Transition Token Types
// =============================================================================

export type TransitionDuration = 'fast' | 'normal' | 'slow'
export type TransitionEasing = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'

export interface TransitionTokens {
  duration: Record<TransitionDuration, string>
  easing: Record<TransitionEasing, number[]>
}

// =============================================================================
// Complete Design Token Schema
// =============================================================================

export interface DesignTokens {
  color: ColorTokens
  spacing: SpacingTokens
  typography: TypographyTokens
  borderRadius: Record<BorderRadius, string>
  shadow: ShadowTokens
  borderWidth: Record<BorderWidth, string>
  opacity: OpacityTokens
  transition: TransitionTokens
}

// =============================================================================
// Component-Specific Token Types
// =============================================================================

export interface ButtonTokens {
  primary: {
    background: string
    backgroundHover: string
    text: string
  }
  danger: {
    background: string
    backgroundHover: string
    text: string
  }
}

export interface InputTokens {
  border: string
  borderFocus: string
  paddingX: string
  paddingY: string
  radius: string
}

export interface TagTokens {
  colors: {
    red: string
    green: string
    yellow: string
    gray: string
    black: string
  }
  paddingX: string
  paddingY: string
  gap: string
  textColor: string
}

export interface AlertTokens {
  background: string
  border: string
  text: string
  icon: string
}

export interface ModalTokens {
  background: string
  overlay: string
  padding: string
  radius: string
  shadow: string
}

export interface ComponentTokens {
  button: ButtonTokens
  input: InputTokens
  tag: TagTokens
  alert: AlertTokens
  modal: ModalTokens
}

// =============================================================================
// Token Accessor Helper Types
// =============================================================================

/**
 * Type-safe token accessor
 * @example
 * const primaryColor: TokenValue = 'var(--color-primary-500)'
 */
export type TokenValue = `var(--${string})` | string

/**
 * CSS custom property name
 * @example
 * const tokenName: TokenName = '--color-primary-500'
 */
export type TokenName = `--${string}`

// =============================================================================
// Utility Types for Token Access
// =============================================================================

/**
 * Extract token category from full token path
 * @example
 * type Category = TokenCategory<'color.primary.500'> // 'color'
 */
export type TokenCategory<T extends string> = T extends `${infer Category}.${string}`
  ? Category
  : never

/**
 * Type guard for checking if value is a valid token value
 */
export function isTokenValue(value: unknown): value is TokenValue {
  return typeof value === 'string' && (value.startsWith('var(--') || value.startsWith('#'))
}

/**
 * Type guard for checking if value is a valid token name
 */
export function isTokenName(value: unknown): value is TokenName {
  return typeof value === 'string' && value.startsWith('--')
}

// =============================================================================
// Token Constants (Runtime Values)
// =============================================================================

export const SPACING_SCALE: Record<SpacingScale, string> = {
  '3xs': '0.125rem',
  '2xs': '0.25rem',
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
}

export const FONT_SIZES: Record<FontSize, string> = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
}

export const FONT_WEIGHTS: Record<FontWeight, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

export const BORDER_RADII: Record<BorderRadius, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '1rem',
  full: '9999px',
}

// =============================================================================
// Color Constants
// =============================================================================

export const PRIMARY_COLORS: ColorPalette = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
}

export const ACCENT_RED: ColorPalette = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
}

export const ACCENT_BLUE: ColorPalette = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
}

export const ACCENT_GREEN: ColorPalette = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  200: '#BBF7D0',
  300: '#86EFAC',
  400: '#4ADE80',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
  800: '#166534',
  900: '#14532D',
}

export const ACCENT_YELLOW: ColorPalette = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
}

export const ACCENT_PINK: ColorPalette = {
  50: '#FDF2F8',
  100: '#FCE7F3',
  200: '#FBCFE8',
  300: '#F9A8D4',
  400: '#F472B6',
  500: '#EC4899',
  600: '#DB2777',
  700: '#BE185D',
  800: '#9D174D',
  900: '#831843',
}

export const ACCENT_SLATE: ColorPalette = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a color from a palette by shade
 * @param palette - Color palette object
 * @param shade - Shade number (50-900)
 * @returns Color hex value
 */
export function getColorShade(palette: ColorPalette, shade: ColorShade): string {
  return palette[shade]
}

/**
 * Get spacing value by scale
 * @param scale - Spacing scale key
 * @returns Spacing value in rem
 */
export function getSpacing(scale: SpacingScale): string {
  return SPACING_SCALE[scale]
}

/**
 * Get font size by scale
 * @param size - Font size key
 * @returns Font size in rem
 */
export function getFontSize(size: FontSize): string {
  return FONT_SIZES[size]
}

/**
 * Get border radius value
 * @param radius - Border radius key
 * @returns Border radius value
 */
export function getBorderRadius(radius: BorderRadius): string {
  return BORDER_RADII[radius]
}

/**
 * Convert token name to CSS custom property
 * @param tokenPath - Dot-separated token path (e.g., 'color.primary.500')
 * @returns CSS custom property name (e.g., '--color-primary-500')
 */
export function tokenToCssVar(tokenPath: string): TokenName {
  return `--${tokenPath.replace(/\./g, '-')}` as TokenName
}

/**
 * Convert token name to CSS var() function
 * @param tokenPath - Dot-separated token path
 * @returns CSS var() function (e.g., 'var(--color-primary-500)')
 */
export function tokenToVarFunction(tokenPath: string): TokenValue {
  return `var(${tokenToCssVar(tokenPath)})` as TokenValue
}
