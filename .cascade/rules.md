# Cascade AI Rules for Brand Collection Product Training

## React Query Enforcement

### Primary Rule: Server State Management
**ALL API calls MUST use React Query hooks. NO manual fetch() calls in components.**

### When Writing Code That Fetches Data:

1. **ALWAYS reference** `REACT_QUERY_PATTERNS.md` before implementing
2. **NEVER use** manual `fetch()`, `axios()`, or similar in component files
3. **ALWAYS create** hooks in `src/hooks/` directory
4. **ALWAYS follow** established query key conventions

### Golden Rule
> "Server state lives in React Query, UI state lives in useState"

### Decision Tree
```
Need to manage state?
├─ Is it data from the API?
│  ├─ YES → Use React Query hook
│  │   ├─ Reading data? → useQuery
│  │   └─ Writing data? → useMutation
│  └─ NO → Use useState (form inputs, modals, UI state)
```

### Required Patterns

#### For Queries (GET requests):
- Create hook in `src/hooks/use[Resource].js`
- Use `useQuery` from `@tanstack/react-query`
- Follow query key convention: `['resource']` or `['resource', id]`
- Include auth token via `getAuthToken()` utility
- Reference: `src/hooks/useBrands.js`

#### For Mutations (POST/PUT/DELETE):
- Create hook in `src/hooks/use[Resource]Mutations.js`
- Use `useMutation` from `@tanstack/react-query`
- ALWAYS invalidate related queries in `onSuccess`
- Reference: `src/hooks/useBrandMutations.js`

### Query Key Conventions
```javascript
['brands']                    // All brands
['brand', brandId]           // Single brand
['collections', brandId]     // Collections for a brand
['collection', collectionId] // Single collection
['items', collectionId]      // Items for a collection
```

### Cache Invalidation Rules

When mutating data, ALWAYS invalidate:
1. The list: `queryClient.invalidateQueries({ queryKey: ['brands'] })`
2. The specific item: `queryClient.invalidateQueries({ queryKey: ['brand', brandId] })`
3. Related data: `queryClient.invalidateQueries({ queryKey: ['collections', brandId] })`

### Anti-Patterns to REJECT

❌ **NEVER allow these in code:**
```javascript
// ❌ Manual fetch in component
const [data, setData] = useState([]);
useEffect(() => {
  fetch('/api/brands').then(...)
}, []);

// ❌ Manual loading state for API data
const [loading, setLoading] = useState(true);

// ❌ Manual error handling for API calls
const [error, setError] = useState(null);
```

✅ **ALWAYS suggest this instead:**
```javascript
// ✅ React Query hook
const { data, isLoading, isError, error } = useBrands();
```

### Reference Files

**Before implementing ANY API call, check these files:**
1. `REACT_QUERY_PATTERNS.md` - Comprehensive patterns guide
2. `src/hooks/useBrands.js` - Query hook example
3. `src/hooks/useBrandMutations.js` - Mutation hook example
4. `src/pages/BrandEdit/BrandEditPage.jsx` - Usage example

### Code Review Checklist

Before suggesting code, verify:
- [ ] No manual `fetch()` in components
- [ ] All API calls use React Query hooks
- [ ] Hooks are in `src/hooks/` directory
- [ ] Query keys follow conventions
- [ ] Mutations invalidate related queries
- [ ] Proper error handling via React Query

### When User Asks to Fetch Data

**Your response should:**
1. Reference the patterns guide
2. Suggest creating a hook (if it doesn't exist)
3. Show the React Query pattern
4. Include cache invalidation (for mutations)
5. Never suggest manual fetch

### Example Response Template

"I'll create a React Query hook for this following our established patterns (see `REACT_QUERY_PATTERNS.md`).

For queries: Creating `use[Resource]` hook in `src/hooks/`
For mutations: Creating `use[Action][Resource]` hook with cache invalidation

This ensures proper caching and follows our conventions."

---

## Additional Project Rules

### File Organization
- API hooks: `src/hooks/`
- Components: `src/components/` and `src/pages/`
- Utilities: `src/utils/`
- Config: `src/config/`

### Naming Conventions
- Query hooks: `useBrands()`, `useBrand(id)`, `useCollections(brandId)`
- Mutation hooks: `useCreateBrand()`, `useUpdateBrand()`, `useDeleteBrand()`
- Components: PascalCase with descriptive names

### Import Order
1. React imports
2. Third-party libraries (React Query, React Router, etc.)
3. Local hooks
4. Local components
5. Utilities
6. Styles

---

## General Development Protocols

### Confidence and Clarification Protocol

**ALWAYS assess your confidence level before proceeding with ANY task.**

If you are less than 95% confident about:
- The approach to take
- The files to modify
- The expected behavior
- Any implementation details
- Potential side effects
- How the change fits into existing patterns

**STOP and ask clarifying questions FIRST.**

#### Required Questions When Uncertain:

1. State your confidence level: "I'm [X]% confident about [specific aspect]"
2. List specific uncertainties
3. Ask targeted clarifying questions
4. Wait for user confirmation before proceeding

#### Examples of When to Ask:

- ❓ Unclear requirements or ambiguous requests
- ❓ Multiple valid approaches exist
- ❓ Potential breaking changes
- ❓ Unfamiliar patterns in codebase
- ❓ Missing information needed for implementation
- ❓ Uncertainty about which files to modify
- ❓ Unclear about expected behavior or side effects

#### DO NOT Proceed If:

- You're guessing at implementation details
- You're unsure which files to modify
- You don't understand the full context
- There are multiple interpretations of the request
- You haven't verified your understanding

**IMPORTANT: User should NEVER have to ask "are you confident?" - you must volunteer this information proactively.**

---

### Explanation Protocol

**Before making ANY code changes, ALWAYS:**

1. **Explain what you're about to do**
   - Describe the approach
   - List the changes you'll make
   
2. **List files you'll modify**
   - Include file paths
   - Describe what changes in each file
   
3. **Describe the implementation approach**
   - Why this approach vs alternatives
   - How it fits with existing patterns
   
4. **Wait for user approval if changes are significant**
   - Breaking changes
   - Major refactors
   - New patterns or dependencies

---

### Breaking Change Protocol

**If changes might break existing functionality:**

1. **STOP and warn the user FIRST**
   - Don't make the change yet
   - Clearly state what might break
   
2. **List potential impacts**
   - Which features/pages affected
   - What behavior will change
   - Who/what depends on current behavior
   
3. **Suggest mitigation strategies**
   - How to minimize impact
   - Testing approach
   - Rollback plan if needed
   
4. **Get explicit approval before proceeding**
   - Wait for clear "yes, proceed"
   - Don't assume silence is consent

---

**These rules are MANDATORY for all code generation and suggestions.**
