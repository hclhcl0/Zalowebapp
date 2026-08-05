const enrichedAllFollowers = [
  { id: 1, phone: '0946947500', displayName: 'Thắng Cdc Dna', userType: 'staff', followedAt: '2026-08-05' },
  { id: 2, phone: '0946947500', displayName: 'Bùi Thức Thắng', userType: 'staff', followedAt: '2026-07-28' },
];
const cleanPhone = (p) => {
  if (!p) return '';
  let s = String(p).replace(/\D/g, '');
  if (s.startsWith('84')) s = '0' + s.substring(2);
  return s;
};
const finalMap = new Map();
for (const f of enrichedAllFollowers) {
  const phoneKey = cleanPhone(f.phone);
  const nameKey = f.displayName + '|' + (f.avatarUrl || 'no-avatar');
  let existingKey = null;
  if (phoneKey && finalMap.has(phoneKey)) {
    existingKey = phoneKey;
  } else if (finalMap.has(nameKey)) {
    existingKey = nameKey;
  }
  const targetKey = existingKey || (phoneKey || nameKey);
  if (finalMap.has(targetKey)) {
    const existing = finalMap.get(targetKey);
    if (f.staffLink && !existing.staffLink) {
      finalMap.set(targetKey, f);
    } else if (f.userType === 'staff' && existing.userType !== 'staff') {
      finalMap.set(targetKey, f);
    } else if (new Date(f.followedAt || 0) > new Date(existing.followedAt || 0) && (!existing.staffLink || f.staffLink)) {
      finalMap.set(targetKey, f);
    }
  } else {
    finalMap.set(targetKey, f);
  }
}
const finalGroupedFollowers = Array.from(finalMap.values());
console.log(finalGroupedFollowers.length);
console.log(finalGroupedFollowers);
