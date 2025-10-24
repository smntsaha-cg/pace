import { createOptimizedPicture } from '../../scripts/aem.js';
import { openModal } from '../modal/modal.js';
import vdecorate from '../video/video.js';

async function openVideoModal(_videoUrl) {
  const parentModalLink = '/pace/modals/videomodal';
  await openModal(parentModalLink);
  // setTimeout(async () => {
  const block = document.querySelector('.modal-content .video.block');
  const link = document.createElement('a');

  // Set the href attribute
  link.href = _videoUrl;
  block.append(link);
  await vdecorate(block);
  // });
}

function bindVideoEvent(block) {
  const videoCardBtn = block.querySelector('.videocards .cards-card-body .button-container a');
  if (!videoCardBtn) return;
  block.querySelectorAll('.videocards .cards-card-body .button-container a').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const videoUrl = e.target.getAttribute('href');
      openVideoModal(videoUrl);
    });
  });
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);
  bindVideoEvent(block);
}
