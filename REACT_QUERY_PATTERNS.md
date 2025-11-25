# React Query Patterns Guide

## Overview

This guide establishes patterns and best practices for using React Query in our application. Following these patterns ensures consistency, maintainability, and optimal performance.

---

## Core Principle

> **"Server state lives in React Query, UI state lives in useState"**

### Decision Tree

```
Need to manage state?
│
├─ Is it data from the API?
│  ├─ YES → Use React Query
│  │   ├─ Reading data? → useQuery
│  │   └─ Writing data? → useMutation
│  │
│  └─ NO → Use useState
│      └─ Examples: form inputs, modals, tabs, toggles
```

---

## When to Use React Query

### ✅ Use React Query For:
- Fetching data from backend API
- Creating/updating/deleting data
- Any server state management
- Data that needs to be cached
- Data shared across components

### ❌ Don't Use React Query For:
- Form input values (use useState)
- Modal open/closed state (use useState)
- UI-only state (tabs, dropdowns, filters)
- Temporary UI state

---

## File Organization

### Hook Structure

```
src/hooks/
├── useBrands.js              ← Brand queries (GET)
├── useBrandMutations.js      ← Brand mutations (POST/PUT/DELETE)
├── useCollections.js         ← Collection queries
├── useCollectionMutations.js ← Collection mutations
├── useItems.js               ← Item queries
└── useItemMutations.js       ← Item mutations
```

### Naming Conventions

**Query Hooks (Read):**
- `useBrands()` - Get all brands
- `useBrand(id)` - Get single brand
- `useCollections(brandId)` - Get collections for a brand
- `useCollection(id)` - Get single collection

**Mutation Hooks (Write):**
- `useCreateBrand()` - Create new brand
- `useUpdateBrand()` - Update existing brand
- `useDeleteBrand()` - Delete brand
- `useUploadLogo()` - Upload brand logo

---

## Query Hook Pattern

### Template

```javascript
import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * Fetch [description of what this fetches]
 * 
 * @param {string} [param] - Description of parameter
 * @returns {Object} Query result with data, isLoading, isError, error
 */
export const useResourceName = (param) => {
  return useQuery({
    queryKey: ['resource', param],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/resource/${param}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch resource');
      }
      
      return await response.json();
    },
    enabled: !!param, // Only run if param is provided
  });
};
```

### Real Example

```javascript
// src/hooks/useBrands.js
import { useQuery } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * Fetch all brands with their collections for the authenticated user
 */
export const useBrands = () => {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch('http://localhost:8000/api/brands/with-collections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      
      const data = await response.json();
      
      // Transform data to match component format
      return data.map(brand => ({
        id: brand.brand_id,
        name: brand.name,
        logo: brand.logo_url,
        collections: brand.collections.map(col => ({
          id: col.collection_id,
          name: col.name
        }))
      }));
    },
  });
};

/**
 * Fetch a single brand's details by ID
 */
export const useBrand = (brandId) => {
  return useQuery({
    queryKey: ['brand', brandId],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/brands/${brandId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch brand');
      }
      
      return await response.json();
    },
    enabled: !!brandId, // Only run query if brandId is provided
  });
};
```

---

## Mutation Hook Pattern

### Template

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * [Description of what this mutation does]
 * 
 * @returns {Object} Mutation object with mutate, mutateAsync, isLoading, isError, isSuccess
 */
export const useActionResource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ param1, param2 }) => {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/resource`, {
        method: 'POST', // or PUT, DELETE
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ param1, param2 })
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['resource'] });
      queryClient.invalidateQueries({ queryKey: ['related-resource'] });
    },
  });
};
```

### Real Example

```javascript
// src/hooks/useBrandMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../utils/auth';

/**
 * Update a brand's information
 */
export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ brandId, data }) => {
      const token = await getAuthToken();
      const response = await fetch(`http://localhost:8000/api/brands/${brandId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update brand');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch brands list
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      
      // Invalidate and refetch the specific brand
      queryClient.invalidateQueries({ queryKey: ['brand', variables.brandId] });
    },
  });
};

/**
 * Upload a brand logo
 */
export const useUploadLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ brandId, file }) => {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:8000/api/brands/${brandId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate brands list (to update logo in sidebar)
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      
      // Invalidate specific brand (to update logo in form)
      queryClient.invalidateQueries({ queryKey: ['brand', variables.brandId] });
    },
  });
};
```

---

## Component Usage Patterns

### Basic Query Usage

```javascript
import { useBrands } from '../hooks/useBrands';

function DashboardPage() {
  // Destructure what you need
  const { data: brands = [], isLoading, isError, error, refetch } = useBrands();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return (
      <div>
        Error: {error?.message}
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {brands.map(brand => (
        <BrandCard key={brand.id} brand={brand} />
      ))}
    </div>
  );
}
```

### Mutation Usage (Simple)

```javascript
import { useUpdateBrand } from '../hooks/useBrandMutations';

function BrandEditForm({ brandId }) {
  const [formData, setFormData] = useState({ name: '', website_url: '' });
  const updateBrand = useUpdateBrand();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await updateBrand.mutateAsync({
        brandId,
        data: formData
      });
      // Success! Cache automatically invalidated
      alert('Brand updated!');
    } catch (error) {
      alert('Failed to update brand');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <button type="submit" disabled={updateBrand.isLoading}>
        {updateBrand.isLoading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Sequential Mutations

```javascript
import { useUpdateBrand, useUploadLogo } from '../hooks/useBrandMutations';

function BrandEditPage() {
  const updateBrand = useUpdateBrand();
  const uploadLogo = useUploadLogo();
  
  const handleSave = async () => {
    try {
      // Update brand info first
      await updateBrand.mutateAsync({
        brandId,
        data: { name: formData.name, website_url: formData.website_url }
      });

      // Then upload logo if changed
      if (formData.logo) {
        await uploadLogo.mutateAsync({
          brandId,
          file: formData.logo
        });
      }

      // Both mutations automatically invalidate cache
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const saving = updateBrand.isLoading || uploadLogo.isLoading;

  return (
    <div>
      {/* Form fields */}
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
```

---

## Query Key Conventions

### Structure

Query keys should be arrays that uniquely identify the data:

```javascript
// List of resources
['brands']
['collections', brandId]
['items', collectionId]

// Single resource
['brand', brandId]
['collection', collectionId]
['item', itemId]

// Filtered/paginated resources
['brands', { status: 'active' }]
['items', collectionId, { page: 1, limit: 20 }]
```

### Hierarchy

```
['brands']                          ← All brands
  └─ ['brand', '123']              ← Specific brand
      └─ ['collections', '123']    ← Collections for brand 123
          └─ ['collection', '456'] ← Specific collection
              └─ ['items', '456']  ← Items for collection 456
```

### Why This Matters

**Cache Invalidation:**
```javascript
// Invalidate all brands
queryClient.invalidateQueries({ queryKey: ['brands'] });

// Invalidate specific brand
queryClient.invalidateQueries({ queryKey: ['brand', brandId] });

// Invalidate all collections for a brand
queryClient.invalidateQueries({ queryKey: ['collections', brandId] });
```

---

## Cache Invalidation Rules

### When to Invalidate

**After Creating:**
```javascript
onSuccess: () => {
  // Invalidate the list to show new item
  queryClient.invalidateQueries({ queryKey: ['brands'] });
}
```

**After Updating:**
```javascript
onSuccess: (data, variables) => {
  // Invalidate the list
  queryClient.invalidateQueries({ queryKey: ['brands'] });
  
  // Invalidate the specific item
  queryClient.invalidateQueries({ queryKey: ['brand', variables.brandId] });
}
```

**After Deleting:**
```javascript
onSuccess: () => {
  // Invalidate the list to remove deleted item
  queryClient.invalidateQueries({ queryKey: ['brands'] });
}
```

### Related Data Invalidation

When updating a brand, also invalidate:
- Brand list (sidebar)
- Specific brand (edit page)
- Collections for that brand (if brand name changed)

```javascript
onSuccess: (data, variables) => {
  queryClient.invalidateQueries({ queryKey: ['brands'] });
  queryClient.invalidateQueries({ queryKey: ['brand', variables.brandId] });
  queryClient.invalidateQueries({ queryKey: ['collections', variables.brandId] });
}
```

---

## Common Patterns

### Dependent Queries

```javascript
// Only fetch collections after brand is loaded
const { data: brand } = useBrand(brandId);
const { data: collections } = useCollections(brand?.id);
```

### Conditional Queries

```javascript
// Only fetch if user is authenticated
const { data: user } = useAuth();
const { data: brands } = useBrands({
  enabled: !!user // Only run if user exists
});
```

### Prefetching

```javascript
// Prefetch brand details when hovering over card
const queryClient = useQueryClient();

const handleMouseEnter = (brandId) => {
  queryClient.prefetchQuery({
    queryKey: ['brand', brandId],
    queryFn: () => fetchBrand(brandId)
  });
};
```

---

## Error Handling

### In Hooks

```javascript
export const useBrands = () => {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await fetch('...');
      
      if (!response.ok) {
        // Throw error with meaningful message
        throw new Error('Failed to fetch brands');
      }
      
      return response.json();
    },
    // Optional: Customize retry behavior
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
```

### In Components

```javascript
const { data, isError, error } = useBrands();

if (isError) {
  return (
    <div className="error">
      <p>Error: {error?.message || 'Something went wrong'}</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );
}
```

---

## Code Review Checklist

Before merging any PR, verify:

### ❌ Anti-Patterns (Don't Do This)
- [ ] Manual `fetch()` calls in components
- [ ] `useState` for API data
- [ ] `useEffect` for data fetching
- [ ] Manual loading/error state for API calls
- [ ] Duplicate API calls for same data

### ✅ Best Practices (Do This)
- [ ] All API calls use React Query hooks
- [ ] Hooks are in `/src/hooks` directory
- [ ] Query keys follow naming conventions
- [ ] Mutations invalidate related queries
- [ ] Proper error handling
- [ ] Loading states handled by React Query

---

## Configuration Reference

### Current Settings

Located in `src/config/queryClient.js`:

```javascript
{
  queries: {
    staleTime: 5 * 60 * 1000,      // 5 minutes - data is fresh
    cacheTime: 10 * 60 * 1000,     // 10 minutes - data stays in memory
    refetchOnWindowFocus: false,   // Don't refetch on tab switch
    refetchOnMount: false,         // Use cache if available
    retry: 3,                      // Retry failed requests 3 times
  },
  mutations: {
    retry: 1,                      // Retry failed mutations once
  }
}
```

### What These Mean

- **staleTime:** How long data is considered "fresh" (no refetch needed)
- **cacheTime:** How long unused data stays in memory
- **refetchOnWindowFocus:** Whether to refetch when user returns to tab
- **refetchOnMount:** Whether to refetch when component mounts
- **retry:** How many times to retry failed requests

---

## Examples from Codebase

### Reference Implementations

**Best examples to learn from:**
- `src/hooks/useBrands.js` - Query hooks
- `src/hooks/useBrandMutations.js` - Mutation hooks
- `src/pages/Dashboard/DashboardPage.jsx` - Query usage
- `src/pages/BrandEdit/BrandEditPage.jsx` - Mutation usage

---

## Troubleshooting

### Data Not Updating After Mutation

**Problem:** You saved changes but UI doesn't update

**Solution:** Add cache invalidation to mutation:
```javascript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['brands'] });
}
```

### Too Many API Calls

**Problem:** Same endpoint called multiple times

**Solution:** Check query keys are consistent:
```javascript
// ❌ Bad - different keys for same data
['brands']
['brand-list']

// ✅ Good - consistent key
['brands']
['brands']
```

### Stale Data Showing

**Problem:** Old data displayed even after update

**Solution:** Ensure proper cache invalidation:
```javascript
// Invalidate both list and detail
queryClient.invalidateQueries({ queryKey: ['brands'] });
queryClient.invalidateQueries({ queryKey: ['brand', brandId] });
```

---

## Resources

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Query Keys Guide](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Mutations Guide](https://tanstack.com/query/latest/docs/react/guides/mutations)

---

## Quick Reference

### Import Statements

```javascript
// Queries
import { useQuery } from '@tanstack/react-query';

// Mutations
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Auth
import { getAuthToken } from '../utils/auth';
```

### Common Hooks

```javascript
// In component
const { data, isLoading, isError, error, refetch } = useQuery({...});
const mutation = useMutation({...});
const queryClient = useQueryClient();
```

### Cache Operations

```javascript
// Invalidate (refetch)
queryClient.invalidateQueries({ queryKey: ['brands'] });

// Set data manually
queryClient.setQueryData(['brand', id], newData);

// Get cached data
const data = queryClient.getQueryData(['brands']);

// Prefetch
queryClient.prefetchQuery({ queryKey: ['brand', id], queryFn: fetchBrand });
```

---

**Last Updated:** November 24, 2025  
**Migration Completed:** November 22, 2025
