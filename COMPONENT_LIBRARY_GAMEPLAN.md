# Component Library Implementation Game Plan

## Overview
Build a design system foundation from Figma design, then compose pages from reusable components.

**Approach:** Component Library First (Option C)
**Source:** Figma Design - Deck Settings Page
**Goal:** Production-ready, reusable component library matching Figma design system

**Tech Stack:**
- React (existing)
- CSS Modules (pure - no framework)
- useState → Context (as needed)
- Figma MCP for design extraction

---

## High-Level Strategy

1. Extract design tokens from Figma using MCP
2. Build foundational UI components with CSS Modules
3. Compose feature-specific components
4. Assemble full pages
5. Integrate with backend APIs (details TBD)

## Figma MCP Workflow

### How We'll Use Figma MCP

**Available MCP Tools:**
- `get_design_context` - Extract component structure, styles, and code
- `get_screenshot` - Visual reference for components
- `get_metadata` - Page/node structure overview
- `get_variable_defs` - Design system variables

**Workflow per Component:**
1. Select component/section in Figma Desktop
2. Use MCP to extract design context (spacing, colors, fonts, layout)
3. Get screenshot for visual reference
4. Build component with CSS Modules matching exact specs
5. Iterate until pixel-perfect

**Benefits:**
- ✅ Exact design specs from Figma
- ✅ No manual measurement needed
- ✅ Design tokens automatically extracted
- ✅ Visual reference always available

---

## Project Structure

```
frontend/src/
├── components/
│   ├── ui/              # Base components
│   │   ├── Button/
│   │   ├── Checkbox/
│   │   ├── Input/
│   │   ├── Tag/
│   │   ├── Icon/
│   │   └── Dropdown/
│   ├── layout/          # Layout components
│   │   ├── SectionHeader/
│   │   ├── PageContainer/
│   │   └── Footer/
│   └── features/        # Feature-specific
│       ├── DeckSettings/
│       │   ├── IntroSlidesSection/
│       │   ├── CollectionCategoriesSection/
│       │   ├── ItemDetailsSection/
│       │   ├── LocalizationSection/
│       │   └── LayoutOptionsSection/
│       └── ...
├── styles/
│   ├── tokens.css       # Design tokens
│   └── globals.css
└── ...
```

---

## Phase 1: Setup & Foundation

### Step 1: Analyze Design System
- Extract design tokens from Figma (colors, spacing, typography)
- Create CSS variables or theme file
- Document component inventory

### Step 2: Project Structure
- Create folder structure
- Setup design tokens file (CSS variables)
- Create base CSS Modules structure
- No CSS framework dependencies needed

---

## Phase 2: Build Base UI Components

### Tier 1 - Foundational (Build First)

#### 1. Button Component
**Variants:**
- Primary, Secondary
- States: default, hover, disabled
- Sizes: sm, md, lg

**Props:**
- `variant`: 'primary' | 'secondary'
- `state`: 'default' | 'hover' | 'disabled'
- `size`: 'sm' | 'md' | 'lg'
- `onClick`: handler
- `children`: button text

**From Figma:**
- Padding: 16px 24px
- Border radius: 8px
- Font: Inter Medium, 14px
- Colors: #7d3b51 (primary), #ffffff (text)

#### 2. Checkbox Component
**Features:**
- With label
- Checked/unchecked states
- Disabled state
- Optional description text

**Props:**
- `checked`: boolean
- `onChange`: handler
- `label`: string
- `disabled`: boolean
- `description`: string (optional)

#### 3. Input Component
**Features:**
- Text input
- Validation states (error, success)
- Placeholder
- Label
- Helper text

**Props:**
- `value`: string
- `onChange`: handler
- `placeholder`: string
- `label`: string
- `error`: string
- `disabled`: boolean

#### 4. Tag Component
**Features:**
- Category tags
- Delete button (optional)
- Color variants

**Props:**
- `label`: string
- `onDelete`: handler (optional)
- `variant`: 'default' | 'success' | 'warning'

#### 5. Icon Component
**Icons Needed:**
- check
- add
- delete
- info
- bin
- arrow-right

**Props:**
- `name`: icon name
- `size`: number
- `color`: string

---

### Tier 2 - Composite Components

#### 6. SectionHeader Component
**Composition:**
- Title (heading)
- Description (body text)
- Action button (optional)

**Props:**
- `title`: string
- `description`: string
- `actionButton`: ReactNode (optional)

#### 7. LayoutOptionCard Component
**Features:**
- Selectable card
- Icon/visual representation
- Label
- Selected state (border + background)
- Radio button indicator

**Props:**
- `selected`: boolean
- `onClick`: handler
- `icon`: ReactNode
- `label`: string

#### 8. CategoryGroup Component
**Features:**
- Category name
- List of tags
- Add tag button
- Add sub-category button
- Delete category button

**Props:**
- `categoryName`: string
- `tags`: array of strings
- `onAddTag`: handler
- `onDeleteTag`: handler
- `onAddSubCategory`: handler
- `onDeleteCategory`: handler

#### 9. PreviewCard Component
**Features:**
- Product image
- Product details (name, SKU, color, etc.)
- Styled card layout

**Props:**
- `product`: object with product data
- `selectedFields`: array of field names to display

---

### Tier 3 - Specialized Components

#### 10. Dropdown Component
**Features:**
- Select dropdown
- Options list
- Selected value display
- Search/filter (optional)

**Props:**
- `value`: string
- `onChange`: handler
- `options`: array of {label, value}
- `placeholder`: string

#### 11. Footer Component
**Features:**
- Links (Help, Documentation, Support)
- Copyright text
- Responsive layout

**Props:**
- `links`: array of {label, href}
- `copyrightText`: string

#### 12. Navigation Component
**Features:**
- Tab navigation
- Active state
- Responsive

**Props:**
- `tabs`: array of {label, value}
- `activeTab`: string
- `onTabChange`: handler

---

## Phase 3: Build Feature Components

### 1. IntroSlidesSection
**Composition:**
- SectionHeader
- Grid of Checkboxes (2 columns)
- Save Changes button

**State:**
- Selected slides (array of slide names)

**API Integration:**
- GET collection settings
- POST update settings

### 2. CollectionCategoriesSection
**Composition:**
- SectionHeader
- Input for new category
- List of CategoryGroups
- Save Changes button

**State:**
- Categories (array of {name, tags, subcategories})

**API Integration:**
- GET categories
- POST add/update/delete categories

### 3. ItemDetailsSection
**Composition:**
- SectionHeader
- Checkboxes for fields to include
- PreviewCard showing selected fields
- Save Changes button

**State:**
- Selected fields (array of field names)
- Preview product data

**API Integration:**
- GET item detail settings
- POST update settings

### 4. LocalizationSection
**Composition:**
- SectionHeader
- Language Dropdown
- Save Changes button

**State:**
- Selected language

**API Integration:**
- GET localization settings
- POST update language

### 5. LayoutOptionsSection
**Composition:**
- SectionHeader
- Grid of LayoutOptionCards (1, 2, 3, 4 products per slide)
- Save Changes button

**State:**
- Selected layout (1, 2, 3, or 4)

**API Integration:**
- GET layout settings
- POST update layout

---

## Phase 4: Compose Full Page

### DeckSettingsPage
**Composition:**
- PageContainer
- Navigation tabs
- All feature sections
- Footer
- Continue button

**State Management:**
- Form state for all sections
- Validation state
- Loading states
- Error handling

**API Integration:**
- Fetch all settings on mount
- Save individual sections
- Save all changes
- Navigate to next step

---

## Phase 5: Integration & Polish

### 1. API Connections
- Connect to backend endpoints
- Handle loading states
- Handle error states
- Success notifications

### 2. Routing
- Add to React Router
- Navigation between steps
- Breadcrumbs

### 3. Validation
- Form validation
- Required fields
- Error messages

### 4. Accessibility
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

### 5. Responsive Design
- Mobile breakpoints
- Tablet layout
- Desktop optimization

### 6. Testing
- Unit tests for components
- Integration tests for sections
- E2E tests for full flow

---

## Session-by-Session Breakdown

### Session 1: Foundation (1-2 hours)
- [ ] Extract design tokens from Figma using MCP
- [ ] Create tokens.css with CSS variables
- [ ] Setup component folder structure
- [ ] Build Button component (all variants) with CSS Modules
- [ ] Build Icon system

### Session 2: Form Controls (1-2 hours)
- [ ] Checkbox component
- [ ] Input component
- [ ] Tag component
- [ ] Test all states

### Session 3: Layout Components (1 hour)
- [ ] SectionHeader
- [ ] Footer
- [ ] PageContainer

### Session 4: Feature Components (2 hours)
- [ ] LayoutOptionCard
- [ ] CategoryGroup
- [ ] PreviewCard
- [ ] Dropdown

### Session 5: Sections Part 1 (1.5 hours)
- [ ] IntroSlidesSection
- [ ] CollectionCategoriesSection

### Session 6: Sections Part 2 (1.5 hours)
- [ ] ItemDetailsSection
- [ ] LocalizationSection
- [ ] LayoutOptionsSection

### Session 7: Page Composition (1-2 hours)
- [ ] DeckSettingsPage
- [ ] State management
- [ ] Form handling

### Session 8: Integration (1-2 hours)
- [ ] API connections
- [ ] Validation
- [ ] Error handling
- [ ] Loading states

### Session 9: Polish (1 hour)
- [ ] Responsive design
- [ ] Accessibility
- [ ] Final testing

---

## Design Tokens (From Figma)

### Colors
```css
--color-brand-forest: #2c3528;
--color-brand-wine: #7d3b51;
--color-brand-lime: #a0f26e;
--background-active: #ebf7e6;
--background-light: #f9fafb;
--background-white: #ffffff;
--background-primary: #2c3528;
--background-highlight: #a0f26e;
--text-brand: #2c3528;
--text-secondary: #4b5563;
--border-primary: #2c3528;
--border-medium: #d1d5db;
--border-light: #e5e7eb;
--color-grey-0: #ffffff;
--color-grey-30: #d1d5db;
```

### Typography
```css
--font-family-heading: 'Inter', sans-serif;
--font-family-body: 'Inter', sans-serif;

--font-size-xs: 14px;
--font-size-sm: 16px;
--font-size-md: 18px;

--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semi-bold: 600;

--line-height-xs: 20px;
--line-height-sm: 24px;
--line-height-md: 28px;
```

### Spacing
```css
--spacing-0: 0px;
--spacing-1: 8px;
--spacing-2: 16px;
--spacing-3: 24px;
```

### Border Radius
```css
--border-radius-sm: 4px;
--border-radius-md: 8px;
```

---

## Component Checklist

### Base UI Components
- [ ] Button (Primary, Secondary)
- [ ] Checkbox
- [ ] Input
- [ ] Tag
- [ ] Icon
- [ ] Dropdown
- [ ] SectionHeader
- [ ] LayoutOptionCard
- [ ] CategoryGroup
- [ ] PreviewCard
- [ ] Footer
- [ ] PageContainer

### Feature Components
- [ ] IntroSlidesSection
- [ ] CollectionCategoriesSection
- [ ] ItemDetailsSection
- [ ] LocalizationSection
- [ ] LayoutOptionsSection

### Pages
- [ ] DeckSettingsPage

---

## Technical Requirements

### Confirmed Tech Stack
1. **Frontend Framework:** React (existing version)
2. **Styling Approach:** CSS Modules (pure, no Bootstrap)
3. **Language:** JavaScript
4. **State Management:** useState (start simple, add Context as needed)
5. **API Integration:** To be determined during implementation

2. **Existing Patterns:**
   - Review 1-2 existing components
   - File structure preferences
   - Naming conventions

3. **Priorities:**
   - Which components are most urgent?
   - Any existing components we can leverage?

---

## Success Metrics

### Quality
- ✅ 95-100% match to Figma design
- ✅ All interactive states working
- ✅ Responsive on all breakpoints
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Unit tests for all components

### Maintainability
- ✅ Reusable across entire app
- ✅ Well-documented props
- ✅ Consistent naming conventions
- ✅ Type-safe (if using TypeScript)

### Performance
- ✅ Fast render times
- ✅ Optimized re-renders
- ✅ Lazy loading where appropriate

---

## Estimates

- **Total Time:** 10-14 hours (spread across 9 sessions)
- **Components:** ~15-20 reusable components
- **Quality:** 95-100% production-ready
- **Maintainability:** Excellent
- **Reusability:** High (use across entire app)

---

## Benefits

✅ **Reusable** - Components work anywhere in app
✅ **Consistent** - Matches Figma design system exactly
✅ **Maintainable** - Easy to update/extend
✅ **Testable** - Each component tested independently
✅ **Scalable** - Add new pages easily
✅ **Type-safe** - Can add TypeScript easily
✅ **Documented** - Self-documenting with props

---

## Next Steps

1. Review existing component patterns in codebase
2. Confirm tech stack and styling approach
3. Start Session 1: Foundation & Button component
4. Iterate and approve pattern
5. Scale to remaining components

---

## Notes

- This game plan is based on the Figma design for the Deck Settings page
- The design includes sections for Intro Slides, Collection Categories, Item Details, Localization, and Layout Options
- Missing from Figma: 3 products per slide option (implemented in backend)
- All design tokens extracted from Figma design system using Figma Desktop MCP
- Using pure CSS Modules (no Bootstrap or Tailwind)
- State management starts simple (useState), will add Context as complexity grows
- API endpoint integration will be determined during implementation
- Focus is on understanding the MCP-driven build process
