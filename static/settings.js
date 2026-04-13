/* settings.js */

// ── Auto-save preference ─────────────────────────────────

const toggle = document.getElementById('autoSaveToggle');
toggle.checked = localStorage.getItem('signage_autosave') !== 'false';

function setAutoSave(val) {
  localStorage.setItem('signage_autosave', val ? 'true' : 'false');
}

// ── Asset Library ────────────────────────────────────────

async function loadAssets() {
  const grid = document.getElementById('assetGrid');
  const countEl = document.getElementById('assetCount');

  try {
    const r = await fetch('api.php?action=assets');
    const files = await r.json();

    countEl.textContent = files.length;

    if (!files.length) {
      grid.innerHTML = '<div class="asset-loading">No assets uploaded yet.</div>';
      return;
    }

    grid.innerHTML = '';
    files.forEach(f => {
      const card = document.createElement('div');
      card.className = 'asset-card';

      const isVideo = /\.(mp4|webm|ogg)$/i.test(f.name);
      const isImg   = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name);

      let preview;
      if (isImg) {
        preview = `<img class="asset-preview" src="${f.path}" loading="lazy">`;
      } else if (isVideo) {
        preview = `<video class="asset-preview" src="${f.path}" muted></video>`;
      } else {
        preview = `<div class="asset-preview asset-preview-icon">📄</div>`;
      }

      const kb = (f.size / 1024).toFixed(0);
      const sizeLabel = f.size > 1024 * 1024 ? (f.size / 1048576).toFixed(1) + ' MB' : kb + ' KB';

      card.innerHTML = `
        ${preview}
        <div class="asset-info">
          <div class="asset-name" title="${f.name}">${f.name}</div>
          <div class="asset-meta">${sizeLabel} · ${f.type.split('/')[1] || 'file'}</div>
        </div>
        <button class="asset-del" onclick="deleteAsset('${f.path}', this)" title="Delete from server">✕</button>
      `;

      grid.appendChild(card);
    });
  } catch (e) {
    grid.innerHTML = '<div class="asset-loading">Error loading assets.</div>';
  }
}

async function deleteAsset(path, btn) {
  if (!confirm(`Delete "${path.split('/').pop()}" from the server?\nThis cannot be undone.`)) return;
  btn.disabled = true;
  btn.textContent = '…';
  const r = await fetch('api.php?action=delete_asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'path=' + encodeURIComponent(path)
  });
  const data = await r.json();
  if (data.ok) {
    btn.closest('.asset-card').remove();
    const count = document.getElementById('assetCount');
    count.textContent = +count.textContent - 1;
  } else {
    alert('Delete failed: ' + (data.error || 'unknown error'));
    btn.disabled = false;
    btn.textContent = '✕';
  }
}

loadAssets();
