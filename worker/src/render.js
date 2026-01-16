export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderFeedCard(item) {
  let firstImage = null;
  if (item.images && item.images[0]) {
    const imageName = item.images[0];
    const compressedName = `compressed-${imageName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '.jpg')}`;
    firstImage = `__IMAGE_URL__/responses/${item.id}/${compressedName}`;
  }
  const message = item.message || '';
  const text = message.length > 150 ? message.substring(0, message.lastIndexOf(' ', 150)) + '...' : message;
  const itemJson = JSON.stringify(item).replace(/'/g, '&apos;');

  return `
<div class="feed-card" data-item='${itemJson}' data-timestamp='${item.createdAt || ''}'>
    ${firstImage ? `<img class="card-image" src="${escapeHtml(firstImage)}" alt="">` : '<div class="card-image"></div>'}
    <div class="card-content">
        <div class="card-meta card-meta-timestamp"></div>
        <div class="card-text">${escapeHtml(text)}</div>
    </div>
</div>`;
}

export function renderResponses(items) {
  if (!items.length) {
    return '<div class="response-empty">Noch keine Einsendungen.</div>';
  }
  return items.map(renderFeedCard).join('\n');
}

export function renderIndexHtml(template, items) {
  const renderedResponses = renderResponses(items);
  return template.replace('<!-- RESPONSES_PLACEHOLDER -->', renderedResponses);
}
