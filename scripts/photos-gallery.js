const repoOwner = 'ccnjh97wh7-arch';
const repoName = 'ccnjh97wh7-arch.github.io';
const branch = 'main';
const gallery = document.getElementById('photo-gallery');

function formatLabel(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function createPhotoCard(photo) {
  const figure = document.createElement('figure');
  figure.className = 'photo-card';

  const img = document.createElement('img');
  img.src = photo.download_url;
  img.alt = photo.name;
  img.loading = 'lazy';

  const figcaption = document.createElement('figcaption');
  figcaption.textContent = formatLabel(photo.name);

  figure.appendChild(img);
  figure.appendChild(figcaption);
  return figure;
}

async function loadPhotos() {
  if (!gallery) {
    return;
  }

  gallery.innerHTML = '<p class="gallery-loading">Loading photos…</p>';

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/images?ref=${branch}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API request failed with ${response.status}`);
    }

    const items = await response.json();
    const imageFiles = items
      .filter((item) => item.type === 'file' && /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(item.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    gallery.innerHTML = '';

    if (!imageFiles.length) {
      gallery.innerHTML = '<p class="gallery-empty">No photos yet. Add images to the images folder and push the change.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    imageFiles.forEach((photo) => fragment.appendChild(createPhotoCard(photo)));
    gallery.appendChild(fragment);
  } catch (error) {
    gallery.innerHTML = '<p class="gallery-empty">Photos could not be loaded right now. Please refresh the page.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadPhotos);
