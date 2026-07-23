const gallery = document.getElementById('photo-gallery');
const photoListUrl = 'scripts/photos-list.json';

const featuredFiles = ['eric-in-the-woods.jpg', 'buddy-sleeping.jpg', 'water-tower-sunset.jpg', 'downtown-greenville.jpg'];
const displayNameOverrides = {
  'eric-in-the-woods.jpg': 'Eric in the Woods',
  'buddy-sleeping.jpg': 'Buddy Sleeping',
  'water-tower-sunset.jpg': 'Water Tower Sunset',
  'downtown-greenville.jpg': 'Downtown Greenville',
};

function formatLabel(fileName) {
  if (displayNameOverrides[fileName]) {
    return displayNameOverrides[fileName];
  }

  const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (/^\d+$/.test(baseName)) {
    return `Photo ${baseName.padStart(2, '0')}`;
  }

  return baseName;
}

function createPhotoCard(photo) {
  const figure = document.createElement('figure');
  figure.className = `photo-card${featuredFiles.includes(photo.name) ? ' featured' : ''}`;

  const img = document.createElement('img');
  img.src = photo.download_url;
  img.alt = photo.name;
  img.loading = 'lazy';

  const figcaption = document.createElement('figcaption');
  const label = document.createElement('span');
  label.className = 'photo-card-label';
  label.textContent = featuredFiles.includes(photo.name) ? 'Featured' : 'Archive';

  const title = document.createElement('span');
  title.className = 'photo-card-title';
  title.textContent = formatLabel(photo.name);

  figcaption.appendChild(label);
  figcaption.appendChild(title);

  figure.appendChild(img);
  figure.appendChild(figcaption);
  return figure;
}

function buildPhotoSections(photos) {
  const featured = [];
  const archive = [];

  photos.forEach((photo) => {
    if (featuredFiles.includes(photo.name)) {
      featured.push(photo);
    } else {
      archive.push(photo);
    }
  });

  const featuredOrder = featuredFiles
    .map((fileName) => featured.find((photo) => photo.name === fileName))
    .filter(Boolean);

  const archiveOrder = archive.sort((a, b) => a.name.localeCompare(b.name));
  return [...featuredOrder, ...archiveOrder];
}

function createPhotoObjects(fileNames) {
  return fileNames.map((name) => ({
    name,
    download_url: `images/${encodeURIComponent(name)}`,
  }));
}

async function loadPhotos() {
  if (!gallery) {
    return;
  }

  gallery.innerHTML = '<p class="gallery-loading">Loading photos…</p>';

  try {
    let fileNames;

    if (typeof photoFileNames !== 'undefined' && Array.isArray(photoFileNames)) {
      fileNames = photoFileNames;
    } else {
      const response = await fetch(photoListUrl);
      if (!response.ok) {
        throw new Error(`Local photo list request failed with ${response.status}`);
      }
      fileNames = await response.json();
    }

    const imageFiles = fileNames.filter((name) => /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(name));
    const photos = createPhotoObjects(imageFiles);
    const sortedPhotos = buildPhotoSections(photos);

    gallery.innerHTML = '';

    if (!sortedPhotos.length) {
      gallery.innerHTML = '<p class="gallery-empty">No photos yet. Add images to the images folder and push the change.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    sortedPhotos.forEach((photo) => fragment.appendChild(createPhotoCard(photo)));
    gallery.appendChild(fragment);
  } catch (error) {
    console.error(error);
    gallery.innerHTML = '<p class="gallery-empty">Photos could not be loaded right now. Please refresh the page.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadPhotos);
