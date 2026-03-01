import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import styles from './ReorderCategoriesModal.module.css';

function SortableSubcategoryRow({ id, name, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.subcategoryRow} {...attributes} {...listeners}>
      <div className={styles.dragHandle}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 5H12M4 8H12M4 11H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <span className={styles.subcategoryIndex}>{index + 1}</span>
      <span className={styles.subcategoryName}>{name}</span>
    </div>
  );
}

/**
 * Isolated component for subcategory drag-and-drop.
 * Has its own useSensors so it doesn't conflict with the parent DndContext.
 */
function SubcategoryReorderList({ categoryName, subcategories, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(categoryName, active.id, over.id);
  };

  const items = subcategories.map((s) => `${categoryName}::${s.name}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className={styles.subcategoryList}>
          {subcategories.map((sub, subIndex) => (
            <SortableSubcategoryRow
              key={`${categoryName}::${sub.name}`}
              id={`${categoryName}::${sub.name}`}
              name={sub.name}
              index={subIndex}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableCategoryRow({ id, name, index, hasSubcategories, isExpanded, onToggleExpand }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.categoryRow} {...attributes} {...listeners}>
      <div className={styles.dragHandle}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 5H12M4 8H12M4 11H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <span className={styles.categoryIndex}>{index + 1}</span>
      <span className={styles.categoryName}>{name}</span>
      {hasSubcategories && (
        <button
          className={styles.expandToggle}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={isExpanded ? 'Collapse subcategories' : 'Expand subcategories'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function ReorderCategoriesModal({
  categories = [],
  isVisible = false,
  onSave,
  onClose,
  initialExpandedCategory = null,
}) {
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  useEffect(() => {
    if (isVisible && categories.length > 0) {
      const sorted = [...categories].sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      );
      // Sort subcategories within each category by display_order
      const withSortedSubs = sorted.map(cat => ({
        ...cat,
        subcategories: [...(cat.subcategories || [])].sort(
          (a, b) => (a.display_order || 0) - (b.display_order || 0)
        ),
      }));
      setOrderedCategories(withSortedSubs);
      // Auto-expand a category if requested (e.g. from CategorySection header button)
      setExpandedCategories(initialExpandedCategory ? new Set([initialExpandedCategory]) : new Set());
    }
  }, [isVisible, categories, initialExpandedCategory]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCategoryDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedCategories((prev) => {
      const oldIndex = prev.findIndex((c) => c.name === active.id);
      const newIndex = prev.findIndex((c) => c.name === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSubcategoryReorder = useCallback((categoryName, activeId, overId) => {
    setOrderedCategories((prev) =>
      prev.map((cat) => {
        if (cat.name !== categoryName) return cat;
        const subs = [...(cat.subcategories || [])];
        const oldIndex = subs.findIndex((s) => `${categoryName}::${s.name}` === activeId);
        const newIndex = subs.findIndex((s) => `${categoryName}::${s.name}` === overId);
        return { ...cat, subcategories: arrayMove(subs, oldIndex, newIndex) };
      })
    );
  }, []);

  const toggleExpand = useCallback((categoryName) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  }, []);

  const handleSave = () => {
    const updated = orderedCategories.map((cat, catIndex) => ({
      ...cat,
      display_order: catIndex,
      subcategories: (cat.subcategories || []).map((sub, subIndex) => ({
        ...sub,
        display_order: subIndex,
      })),
    }));
    onSave(updated);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>Reorder Categories</h3>
            <p className={styles.subtitle}>Drag to reorder how categories and subcategories appear on the page and in the presentation.</p>
          </div>
          {onClose && (
            <button className={styles.closeButton} onClick={onClose} aria-label="Close">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="14" fill="#EBF7E6"/>
                <path d="M18 10L10 18M10 10L18 18" stroke="#2C3528" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Category List */}
        <div className={styles.content}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={orderedCategories.map((c) => c.name)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.categoryList}>
                {orderedCategories.map((cat, index) => {
                  const subs = cat.subcategories || [];
                  const isExpanded = expandedCategories.has(cat.name);

                  return (
                    <div key={cat.name}>
                      <SortableCategoryRow
                        id={cat.name}
                        name={cat.name}
                        index={index}
                        hasSubcategories={subs.length > 0}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleExpand(cat.name)}
                      />
                      {isExpanded && subs.length > 0 && (
                        <SubcategoryReorderList
                          categoryName={cat.name}
                          subcategories={subs}
                          onReorder={handleSubcategoryReorder}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* Save Button */}
          <button className={styles.actionButton} onClick={handleSave}>
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReorderCategoriesModal;
