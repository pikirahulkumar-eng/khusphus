import { Platform } from 'react-native';

// Sunao Official Design System & Theme
// Clean, Ultra-Fast Light & Slate Emerald Theme

export const SunaoTheme = {
  colors: {
    // Brand & Accents
    primary: '#059669',         // Emerald Green
    primaryDark: '#047857',     // Deep Emerald
    primaryLight: '#ECFDF5',    // Soft Emerald Tint
    accent: '#10B981',          // Light Mint
    accentHover: '#047857',

    // Surfaces & Backgrounds
    background: '#F8FAFC',      // Soft Slate Canvas
    surface: '#FFFFFF',         // Crisp White Card
    surfaceLight: '#F1F5F9',
    surfaceSubtle: '#F8FAFC',
    card: '#FFFFFF',
    cardHover: '#F8FAFC',
    chatBackground: '#F8FAFC',

    // Message Bubbles
    bubbleMe: '#059669',        // Emerald green
    bubbleMeBorder: '#047857',
    bubbleThem: '#FFFFFF',      // Crisp white
    bubbleThemBorder: '#E2E8F0',
    bubbleTickBlue: '#38BDF8',  // Sky blue double tick

    // Typography & Content
    textPrimary: '#0F172A',     // Deep slate dark
    textSecondary: '#475569',   // Slate gray
    textMuted: '#94A3B8',       // Light slate muted
    textInverse: '#FFFFFF',

    // Status & Utility
    statusStoryRing: '#10B981',
    statusViewedRing: '#CBD5E1',
    danger: '#EF4444',          // Red for missed calls / cancel
    warning: '#F59E0B',
    success: '#10B981',
    whatsapp: '#25D366',

    // Borders & Dividers
    border: '#E2E8F0',
    glassBorder: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#F1F5F9',
  },
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
