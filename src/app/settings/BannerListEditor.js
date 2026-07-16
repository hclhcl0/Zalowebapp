import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Image as ImageIcon, Link as LinkIcon, Upload } from 'lucide-react';

export default function BannerListEditor({ value, onChange }) {
  const [items, setItems] = useState(() => {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [uploadingIndex, setUploadingIndex] = useState(null);

  const notifyChange = (newItems) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems, null, 2));
  };

  const handleAdd = () => {
    notifyChange([...items, { image: '', link: '' }]);
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

  const handleUpload = async (index, file) => {
    if (!file) return;
    setUploadingIndex(index);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        handleUpdate(index, 'image', data.url);
      } else {
        alert(data.error || 'Upload thất bại');
      }
    } catch (err) {
      alert('Lỗi upload: ' + err.message);
    } finally {
      setUploadingIndex(null);
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
          {/* Nút kéo thả (Giả lập, tạm thời chưa support drag and drop phức tạp) */}
          <div style={{ padding: '8px 4px', cursor: 'grab', color: 'var(--text-muted)' }}>
            <GripVertical size={20} />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Ảnh */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ 
                width: '120px', 
                height: '68px', 
                background: '#e5e7eb',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {item.image ? (
                  <img src={item.image} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={24} color="#9ca3af" />
                )}
                {uploadingIndex === index && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: '20px', height: '20px' }} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hình ảnh (URL hoặc Tải lên)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={item.image} 
                    onChange={(e) => handleUpdate(index, 'image', e.target.value)}
                    placeholder="/uploads/..."
                    style={{ flex: 1 }}
                  />
                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', padding: '0 12px' }}>
                    <Upload size={16} /> Tải ảnh
                    <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(index, e.target.files[0])} />
                  </label>
                </div>
              </div>
            </div>

            {/* Link */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Đường dẫn liên kết (Link)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LinkIcon size={16} color="var(--text-muted)" />
                <input 
                  type="text" 
                  className="form-input" 
                  value={item.link} 
                  onChange={(e) => handleUpdate(index, 'link', e.target.value)}
                  placeholder="Ví dụ: https://ecdc.vnos.org/ hoặc /services"
                />
              </div>
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ padding: '8px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
            onClick={() => handleRemove(index)}
          >
            <Trash2 size={20} />
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-outline" onClick={handleAdd} style={{ alignSelf: 'flex-start' }}>
        <Plus size={16} style={{ marginRight: '6px' }} /> Thêm Banner
      </button>
    </div>
  );
}
