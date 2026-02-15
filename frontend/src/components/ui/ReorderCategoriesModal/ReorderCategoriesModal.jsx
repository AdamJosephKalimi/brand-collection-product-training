import React, { useState, useEffect } from 'react';
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

function SortableCategoryRow({ id, name, index }) {
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
    </div>
  );
}

function ReorderCategoriesModal({
  categories = [],
  isVisible = false,
  onSave,
  onClose,
}) {
  const [orderedCategories, setOrderedCategories] = useState([]);

  useEffect(() => {
    if (isVisible && categories.length > 0) {
      const sorted = [...categories].sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      );
      setOrderedCategories(sorted);
    }
  }, [isVisible, categories]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedCategories((prev) => {
      const oldIndex = prev.findIndex((c) => c.name === active.id);
      const newIndex = prev.findIndex((c) => c.name === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSave = () => {
    const updated = orderedCategories.map((cat, index) => ({
      ...cat,
      display_order: index,
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
            <p className={styles.subtitle}>Drag to reorder how categories appear on the page and in the presentation.</p>
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
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedCategories.map((c) => c.name)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.categoryList}>
                {orderedCategories.map((cat, index) => (
                  <SortableCategoryRow
                    key={cat.name}
                    id={cat.name}
                    name={cat.name}
                    index={index}
                  />
                ))}
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
