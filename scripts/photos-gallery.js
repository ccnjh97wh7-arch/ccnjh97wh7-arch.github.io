const repoOwner = 'ccnjh97wh7-arch';
const repoName = 'ccnjh97wh7-arch.github.io';
const branch = 'main';
const gallery = document.getElementById('photo-gallery');

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

async function getPhotoDate(photo) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/commits?path=${encodeURIComponent(photo.path)}&per_page=1`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Commit lookup failed with ${response.status}`);
    }

    const commits = await response.json();
    if (commits.length) {
      return new Date(commits[0].commit.committer.date).getTime();
    }
  } catch (error) {
    return 0;
  }

  return 0;
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
    const imageFiles = items.filter((item) => item.type === 'file' && /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(item.name));

    const photosWithDates = await Promise.all(
      imageFiles.map(async (photo) => ({
        ...photo,
        sortDate: await getPhotoDate(photo),
      }))
    );

    const sortedPhotos = buildPhotoSections(photosWithDates);

    gallery.innerHTML = '';

    if (!sortedPhotos.length) {
      gallery.innerHTML = '<p class="gallery-empty">No photos yet. Add images to the images folder and push the change.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    sortedPhotos.forEach((photo) => fragment.appendChild(createPhotoCard(photo)));
    gallery.appendChild(fragment);
  } catch (error) {
    gallery.innerHTML = '<p class="gallery-empty">Photos could not be loaded right now. Please refresh the page.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadPhotos);
