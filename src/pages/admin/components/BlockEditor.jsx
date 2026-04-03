// src/pages/admin/components/BlockEditor.jsx
// Manages the ordered list of blocks for a timeline item.
// Supports add, reorder (arrows), and delegates edit/delete to BlockField.

import { useState } from 'react';
import { BlockField } from './BlockField.jsx';
import { createBlock, reorderBlocks } from '../../../data/admin/timelineAdminQueries.js';
import './BlockEditor.css';

const BLOCK_TYPES = [
  { value: 'text',  label: 'טקסט' },
  { value: 'image', label: 'תמונה' },
  { value: 'video', label: 'וידאו' },
  { value: 'link',  label: 'לינק' },
  { value: 'cta',   label: 'כפתור' },
];

const emptyContent = () => ({ naor: {}, shay: {} });

export function BlockEditor({ itemId, initialBlocks }) {
  const [blocks,  setBlocks]  = useState(initialBlocks ?? []);
  const [adding,  setAdding]  = useState(false);
  const [newType, setNewType] = useState('text');
  const [error,   setError]   = useState('');

  async function handleAdd() {
    setError('');
    setAdding(true);
    try {
      const sortOrder = blocks.length;
      const block = await createBlock(itemId, {
        block_type:  newType,
        sort_order:  sortOrder,
        visibility:  'both',
        content:     emptyContent(),
      });
      setBlocks(prev => [...prev, block]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleMove(index, direction) {
    const newBlocks = [...blocks];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    const reordered = newBlocks.map((b, i) => ({ ...b, sort_order: i }));
    setBlocks(reordered);
    try {
      await reorderBlocks(reordered.map(b => ({ id: b.id, sort_order: b.sort_order })));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDeleted(id) {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }

  function handleSaved(updated) {
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));
  }

  return (
    <div className="block-editor">
      <h3 className="block-editor__title">בלוקים</h3>

      <div className="block-editor__list">
        {blocks.length === 0 && (
          <p className="block-editor__empty">אין בלוקים עדיין.</p>
        )}
        {blocks.map((block, index) => (
          <div key={block.id} className="block-editor__item">
            <div className="block-editor__arrows">
              <button
                type="button"
                className="block-editor__arrow"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0}
                aria-label="הזז למעלה"
              >▲</button>
              <button
                type="button"
                className="block-editor__arrow"
                onClick={() => handleMove(index, 1)}
                disabled={index === blocks.length - 1}
                aria-label="הזז למטה"
              >▼</button>
            </div>
            <div className="block-editor__field">
              <BlockField
                block={block}
                onDeleted={handleDeleted}
                onSaved={handleSaved}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="block-editor__add">
        <select
          className="block-editor__type-select"
          value={newType}
          onChange={e => setNewType(e.target.value)}
        >
          {BLOCK_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="block-editor__add-btn"
          onClick={handleAdd}
          disabled={adding}
        >
          {adding ? '...' : '+ הוסף בלוק'}
        </button>
      </div>

      {error && <p className="block-editor__error">{error}</p>}
    </div>
  );
}
