import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Phone, Link as LinkIcon, AlignLeft } from 'lucide-react';

export default function FooterInfoEditor({ value, onChange }) {
  const [items, setItems] = useState(() => {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const notifyChange = (newItems) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems, null, 2));
  };

  const handleAdd = () => {
    notifyChange([...items, { label: '', value: '', type: 'text' }]);
  };

  const handleRemove = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    notifyChange(newItems);
  };

  const handleUpdate = (index, field, val) => {
    const newItems = [...items];
    newItems[index][field] = val;
    notifyChange(newItems);
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'phone': return <Phone size={18} color="#9ca3af" />;
      case 'link': return <LinkIcon size={18} color="#9ca3af" />;
      default: return <AlignLeft size={18} color="#9ca3af" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, index) => (
        <div key={index} style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'flex-start',
          background: 'var(--bg)',
          padding: '12px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ padding: '8px 4px', cursor: 'grab', color: 'var(--text-muted)' }}>
            <GripVertical size={20} />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={item.type || 'text'}
                onChange={(e) => handleUpdate(index, 'type', e.target.value)}
                className="input-select"
                style={{ width: '120px' }}
              >
                <option value="text">Văn bản</option>
                <option value="phone">Số ĐT</option>
                <option value="link">Liên kết</option>
              </select>
              
              {renderIcon(item.type)}
              
              <input
                type="text"
                placeholder="Tiêu đề (VD: Địa chỉ, Hotline)"
                className="input-field"
                value={item.label}
                onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            
            <input
              type="text"
              placeholder={item.type === 'link' ? "Nhập link (https://...)" : "Nhập nội dung hiển thị"}
              className="input-field"
              value={item.value}
              onChange={(e) => handleUpdate(index, 'value', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="button"
            className="btn-danger"
            style={{ padding: '8px' }}
            onClick={() => handleRemove(index)}
            title="Xóa trường này"
          >
            <Trash2 size={20} />
          </button>
        </div>
      ))}
      
      <button
        type="button"
        className="btn-secondary"
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={handleAdd}
      >
        <Plus size={20} />
        Thêm trường thông tin
      </button>
    </div>
  );
}
