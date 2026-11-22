const repository = 'kokotao/termTool';
const fallbackVersion = '0.1.6';
const releasePage = `https://github.com/${repository}/releases/latest`;
const downloadBase = `https://github.com/${repository}/releases/download`;

const assetNames = (version) => ({
  'mac-arm64': `termTool-${version}-arm64.dmg`,
  'mac-x64': `termTool-${version}.dmg`,
  windows: `termTool.Setup.${version}.exe`,
  linux: `termTool-${version}.AppImage`,
});

function setRelease(version, assets = [], publishedAt = '') {
  const normalizedVersion = String(version || fallbackVersion).replace(/^v/, '');
  const releaseTag = `v${normalizedVersion}`;
  const names = assetNames(normalizedVersion);
  const available = new Set(assets.map((asset) => typeof asset === 'string' ? asset : asset.name));

  document.querySelectorAll('[data-asset]').forEach((link) => {
    const assetName = names[link.dataset.asset];
    const exists = !assets.length || available.has(assetName);
    link.hidden = !exists;
    if (exists) link.href = `${downloadBase}/${releaseTag}/${encodeURIComponent(assetName)}`;
  });

  document.querySelectorAll('#latest-version, #download-version').forEach((element) => {
    element.textContent = releaseTag;
  });

  const dateLabel = document.querySelector('#release-date');
  if (dateLabel && publishedAt) {
    const date = new Date(publishedAt);
    dateLabel.textContent = Number.isNaN(date.getTime())
      ? 'GitHub Releases'
      : `发布于 ${new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)}`;
  }

  const downloadKey = detectDownloadKey();
  const primary = document.querySelector('#primary-download');
  const label = document.querySelector('#primary-download-label');
  const preferredName = downloadKey ? names[downloadKey] : null;
  const preferredAvailable = !preferredName || !assets.length || available.has(preferredName);
  if (primary && label && downloadKey && preferredAvailable) {
    primary.href = `${downloadBase}/${releaseTag}/${encodeURIComponent(preferredName)}`;
    label.textContent = `下载 ${platformLabel(downloadKey)}`;
  } else if (primary && label) {
    primary.href = downloadKey ? releasePage : '#downloads';
    label.textContent = downloadKey ? '查看所有下载' : '选择 macOS 版本';
  }
}

function detectDownloadKey() {
  const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
  const value = String(platform).toLowerCase();
  if (value.includes('win')) return 'windows';
  if (value.includes('linux')) return 'linux';
  if (value.includes('mac') || value.includes('darwin')) return null;
  return null;
}

function platformLabel(key) {
  return ({
    'mac-arm64': 'macOS · Apple 芯片',
    'mac-x64': 'macOS · Intel',
    windows: 'Windows · x64',
    linux: 'Linux · AppImage',
  })[key] || 'termTool';
}

function observeSections() {
  const sections = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    sections.forEach((section) => section.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.16 });

  sections.forEach((section) => observer.observe(section));
}

document.querySelector('#current-year').textContent = String(new Date().getFullYear());
setRelease(fallbackVersion);
observeSections();

fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
  headers: { Accept: 'application/vnd.github+json' },
})
  .then((response) => {
    if (!response.ok) throw new Error(`Release lookup failed: ${response.status}`);
    return response.json();
  })
  .then((release) => {
    if (!release || release.draft || release.prerelease) return;
    setRelease(release.tag_name, release.assets || [], release.published_at);
  })
  .catch(() => {
    // Keep the checked-in release links available when the GitHub API is unavailable.
  });
