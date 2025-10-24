import createField from './form-fields.js';
import { sampleRUM, decorateIcons } from '../../scripts/aem.js';
import { openModal } from '../modal/modal.js';

async function createForm(formHref) {
  const { pathname } = new URL(formHref);
  const resp = await fetch(pathname);
  const json = await resp.json();

  const form = document.createElement('form');
  // eslint-disable-next-line prefer-destructuring
  form.dataset.action = pathname.split('.json')[0];

  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

  // group fields into fieldsets
  const fieldsets = form.querySelectorAll('fieldset');
  fieldsets.forEach((fieldset) => {
    form.querySelectorAll(`[data-fieldset="${fieldset.name}"`).forEach((field) => {
      fieldset.append(field);
    });
  });

  return form;
}

function generatePayload(form) {
  const payload = {};

  [...form.elements].forEach((field) => {
    if (field.name && field.type !== 'submit' && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${field.value}` : field.value;
      } else {
        payload[field.name] = field.value;
      }
    }
  });
  return payload;
}

function handleSubmitError(form, error) {
  // eslint-disable-next-line no-console
  console.error(error);
  form.querySelector('button[type="submit"]').disabled = false;
  sampleRUM('form:error', { source: '.form', target: error.stack || error.message || 'unknown error' });
}

async function handleSubmit(form) {
  if (form.getAttribute('data-submitting') === 'true') return;

  // subscription related chages starts
  const isSubscribe = form.parentElement.classList.contains('subscription-form');
  // subscription related chages ends

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.disabled = true;

    // create payload
    const payload = generatePayload(form);
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      sampleRUM('form:submit', { source: '.form', target: form.dataset.action });
      if (form.dataset.confirmation) {
        // subscription related chages starts
        if (isSubscribe) {
          const parentModalLink = form.dataset.confirmation.replace('.plain.html', '');
          await openModal(parentModalLink);

          form.reset();
          form.setAttribute('data-submitting', 'false');
          submit.disabled = false;
          // subscription related chages ends
        } else {
          window.location.href = form.dataset.confirmation;
        }
      }
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (e) {
    handleSubmitError(form, e);
  } finally {
    form.setAttribute('data-submitting', 'false');
  }
}

function replaceIconPatternWithSpan(element) {
  // Define a regular expression to match patterns like :asd: or :anytext:
  const icons = [...element.querySelectorAll('label')];
  icons.forEach((label) => {
    // decorateIcon(span, prefix);
    let labelHtml = label.innerHTML;
    const regex = /:(\w+):/g;
    // Replace the matched patterns with the desired <span> format
    labelHtml = labelHtml.replace(regex, (match, p1) => `<span class="icon icon-${p1}"> </span>`);
    // console.log(label.innerHTML);
    label.innerHTML = labelHtml;
  });
}

export default async function decorate(block) {
  const formLink = block.querySelector('a[href$=".json"]');
  if (!formLink) return;

  const form = await createForm(formLink.href);
  replaceIconPatternWithSpan(form);
  decorateIcons(form);
  // console.log("test ** ", form)
  block.replaceChildren(form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = form.checkValidity();
    if (valid) {
      handleSubmit(form);
    } else {
      const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
      if (firstInvalidEl) {
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}
