import { Platform } from 'react-native';

// Light Palette (Sunao Signature Slate & Emerald)
export const SunaoLightColors = {
  // Brand & Accents
  primary: '#047857',         // Deep Emerald
  primaryDark: '#065F46',     // Rich Deep Forest
  primaryLight: '#ECFDF5',    // Soft Mint Glow
  accent: '#10B981',          // Electric Mint
  accentHover: '#059669',
  acoustic: '#6366F1',        // Acoustic Waveform Indigo

  // Surfaces & Backgrounds
  background: '#F8FAFC',      // Slate Light Canvas
  surface: '#FFFFFF',         // Pure White Card
  surfaceLight: '#F1F5F9',
  surfaceSubtle: '#F8FAFC',
  card: '#FFFFFF',
  cardHover: '#F8FAFC',
  chatBackground: '#F1F5F9',
  headerBg: '#FFFFFF',
  inputBg: '#F1F5F9',

  // Message Bubbles
  bubbleMe: '#E8FDF2',        // Ultra-soft mint
  bubbleMeBorder: '#A7F3D0',  // Mint hairline
  bubbleMeText: '#064E3B',    // Deep forest readable text
  bubbleThem: '#FFFFFF',      // Crisp white
  bubbleThemBorder: '#E2E8F0',// Subtle hairline
  bubbleThemText: '#0F172A',  // Obsidian slate
  bubbleTickBlue: '#0284C7',  // Sky blue double tick

  // Typography & Content
  textPrimary: '#0F172A',     // Obsidian slate dark
  textSecondary: '#475569',   // Slate gray
  textMuted: '#94A3B8',       // Light slate muted
  textInverse: '#FFFFFF',

  // Status & Utility
  statusStoryRing: '#10B981',
  statusViewedRing: '#CBD5E1',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  whatsapp: '#25D366',

  // Borders & Dividers
  border: '#E2E8F0',
  glassBorder: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#F1F5F9',
};

// Synkon Dark Palette (Pure OLED Black & Electric Accents)
export const SynkonDarkColors = {
  // Brand & Accents
  primary: '#10B981',          // Electric Mint
  primaryDark: '#059669',
  primaryLight: 'rgba(16, 185, 129, 0.15)',
  accent: '#00F2FE',           // Synkon Neon Cyan
  accentHover: '#38BDF8',
  acoustic: '#818CF8',

  // Surfaces & Backgrounds (Pure OLED Black)
  background: '#000000',       // Pure OLED Black
  surface: '#000000',          // Pure OLED Black Surface
  surfaceLight: '#0A0D12',     // Elevated Dark Obsidian Surface
  surfaceSubtle: '#000000',    // Pure OLED Pitch-black Canvas
  card: '#000000',
  cardHover: '#0A0D12',
  chatBackground: '#000000',
  headerBg: '#000000',
  inputBg: '#0A0D12',

  // Message Bubbles
  bubbleMe: '#047857',         // Rich Emerald
  bubbleMeBorder: '#059669',
  bubbleMeText: '#FFFFFF',
  bubbleThem: '#0E1217',       // Pure OLED Obsidian Bubble
  bubbleThemBorder: 'rgba(255, 255, 255, 0.08)',
  bubbleThemText: '#F1F5F9',
  bubbleTickBlue: '#38BDF8',

  // Typography & Content
  textPrimary: '#FFFFFF',      // Pure White
  textSecondary: '#94A3B8',    // Light Slate
  textMuted: '#64748B',        // Muted Gray
  textInverse: '#0F172A',

  // Status & Utility
  statusStoryRing: '#00F2FE',  // Neon Cyan Ring
  statusViewedRing: '#334155',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  whatsapp: '#25D366',

  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  divider: 'rgba(255, 255, 255, 0.06)',
};

export const SunaoTheme = {
  colors: SunaoLightColors,
  darkColors: SynkonDarkColors,
  typography: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    brandLetterSpacing: 0.3,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 9999,
  },
};

export const KhusPhusTheme = SunaoTheme;
export default SunaoTheme;
