import { Platform } from 'react-native';

// Sunao Official Design System & Theme
// Clean, Ultra-Fast Light & Slate Emerald Theme

export const SunaoTheme = {
  colors: {
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
