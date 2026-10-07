export const colors = {
  ink: '#1C2533',
  inkMuted: '#5B6675',
  inkSoft: '#8A94A3',
  line: '#DDE2E8',
  background: '#F2F4F7',
  surface: '#FFFFFF',
  primary: '#2B4C7E',
  primaryPressed: '#213B63',
  primarySoft: '#E5ECF6',
  onPrimary: '#FFFFFF',
  danger: '#B3261E',
  dangerSoft: '#FBECEA',
  warning: '#7A5300',
  warningSoft: '#FFF4D9',
  success: '#2E6B3F',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 18,
  round: 999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const, color: colors.ink },
  subtitle: { fontSize: 16, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  caption: { fontSize: 13, color: colors.inkMuted },
} as const;
