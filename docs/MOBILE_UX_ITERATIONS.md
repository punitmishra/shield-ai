# Shield AI Mobile - UX Iterations

## Version 0 (Current State)

### Screenshots
- `docs/screenshots/v0/home-dashboard.png` - Settings screen capture

### Current Screens

#### 1. Home Dashboard (`HomeScreen.tsx`)
**Current Features:**
- Header with "Dashboard / Shield AI" branding and tier badge
- Large circular shield button with pulse animation when active
- Status text showing "Protected" / "Not Protected"
- Quick stats card (Queries, Blocked, Cached)
- Privacy Score panel with grade (A+) and breakdown
- Performance metrics (Cache Rate, Block Rate)
- Connection info panel (DNS Server, Encryption, Latency, Status)
- Quick Actions row (Analyze, History, Family, Settings)
- Footer with version

**Current Issues:**
- Shield button area is quite large but doesn't convey enough context
- Quick Actions duplicate bottom tab navigation
- No recent activity preview
- Privacy breakdown values are hardcoded
- No visual distinction between states

#### 2. Protection Screen (`ProtectionScreen.tsx`)
**Current Features:**
- VPN toggle card with connection status
- VPN stats when connected (Encryption, Server, Latency)
- DNS Protection toggles (Malware, Ads, Trackers, Phishing)
- Advanced Protection with PRO badges
- Custom lists (Blocklist, Allowlist) with domain counts
- DNS Server info

**Current Issues:**
- Emoji icons lack visual consistency
- No progress/status indicators for filter effectiveness
- PRO features opacity makes them look disabled rather than premium

#### 3. Analytics Screen (`AnalyticsScreen.tsx`)
**Current Features:**
- Time range selector (24h, 7d, 30d)
- Stats overview grid (Total Queries, Blocked, Cache Hit, Blocklist)
- Simple bar chart for blocked by category
- Top blocked domains list
- Query log with filter (All, Blocked, Allowed)

**Current Issues:**
- Charts are very basic - just horizontal bars
- No trend visualization
- Query log could show more context
- Time range selection doesn't feel interactive

#### 4. Family Screen (`FamilyScreen.tsx`)
**Current Features:**
- Profile cards with avatar, type badge, device count
- Content filters summary (emoji icons)
- Screen time and bedtime controls
- Profile editor modal
- Quick actions (Pause, Activity Report, Alerts)
- Today's summary stats

**Current Issues:**
- Profile creation uses Alert.prompt (iOS only)
- No profile picture customization
- Activity data is placeholder

#### 5. Settings Screen (`SettingsScreen.tsx`)
**Current Features:**
- User profile card (avatar, tier badge)
- Protection settings section
- Notifications section with toggles
- Device management section

**Current Issues:**
- Basic layout
- Device registration shows "Not registered"

---

## Version 1 (Proposed Improvements)

### Priority 1: Home Dashboard Redesign

**Goal:** Make the home screen more informative and action-oriented

**Changes:**
1. **Hero Section Redesign**
   - Larger, more prominent shield with gradient glow
   - Status indicator ring around shield
   - One-tap protection toggle
   - Connection quality indicator (signal bars)

2. **Live Stats Strip**
   - Horizontal scrolling mini-cards
   - Real-time blocked count with animation
   - Today's protection percentage
   - Active devices count

3. **Recent Activity Feed**
   - Last 3-5 blocked threats with timestamps
   - Threat type icons (malware, ad, tracker)
   - "View All" link to Analytics

4. **Quick Insights Card**
   - "Today's highlight" - most blocked category
   - Comparative stats (e.g., "42% fewer trackers than yesterday")
   - Privacy tip of the day

5. **Remove Quick Actions**
   - Redundant with bottom tabs
   - Replace with contextual actions based on protection state

### Priority 2: Visual Consistency

**Changes:**
1. Replace emoji icons with View-based icons throughout
2. Create consistent icon set for all protection features
3. Standardize card styles and spacing
4. Add subtle gradients and depth

### Priority 3: Interactive Elements

**Changes:**
1. Add haptic feedback to toggles and buttons
2. Implement smooth state transitions
3. Add pull-to-refresh everywhere
4. Loading skeletons instead of spinners

### Priority 4: Data Visualization

**Changes:**
1. Replace bar charts with animated ring/arc charts
2. Add mini sparkline graphs for trends
3. Color-coded threat levels
4. Interactive chart tooltips

---

## Design System

### Colors
```
Primary: #3b82f6 (Blue)
Success: #22c55e (Green)
Danger: #ef4444 (Red)
Warning: #f59e0b (Amber)
Purple: #8b5cf6

Background: #0a0f1a (Dark Navy)
Surface: rgba(255, 255, 255, 0.03-0.05)
Border: rgba(255, 255, 255, 0.06-0.08)

Text Primary: #f8fafc
Text Secondary: #94a3b8
Text Muted: #64748b
Text Disabled: #475569
```

### Typography
```
Heading 1: 28px, 700 weight
Heading 2: 22px, 700 weight
Title: 18px, 600 weight
Body: 16px, 400-500 weight
Caption: 13px, 500 weight
Label: 11px, 600 weight, uppercase
```

### Spacing
```
Card Padding: 16-20px
Section Gap: 12px
Content Padding: 20-24px
Border Radius: 12-16px
```

---

## Implementation Plan

### Phase 1: Foundation
- [x] Replace SVG icons with View-based components
- [x] Fix navigation flow for onboarding
- [ ] Create reusable icon components
- [ ] Standardize card component

### Phase 2: Home Screen
- [ ] Redesign hero section
- [ ] Add live stats strip
- [ ] Implement recent activity feed
- [ ] Add quick insights card

### Phase 3: Other Screens
- [ ] Update Protection screen icons
- [ ] Enhance Analytics charts
- [ ] Improve Family profiles UI
- [ ] Polish Settings screen

### Phase 4: Polish
- [ ] Add animations and transitions
- [ ] Implement haptic feedback
- [ ] Add loading skeletons
- [ ] Performance optimization

---

## Notes

- All icons converted from SVG to View-based to avoid Expo Go compatibility issues
- Onboarding flow fixed to use state callback instead of navigation.replace
- App runs without SVG "topSvgLayout" errors
