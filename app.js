const STORAGE_KEY = 'promptLibrary.prompts.v1';

const seedPrompts = [
  {
    handle: 'product_copilot',
    title: 'Product Copilot',
    instructions:
      'Act as a senior product manager. Clarify goals, list assumptions, and provide concise, prioritized recommendations.',
    tags: ['product', 'planning'],
    updatedAt: new Date().toISOString(),
  },
  {
    handle: 'ux_reviewer',
    title: 'UX Reviewer',
    instructions:
      'Review interfaces for usability concerns. Focus on clarity, accessibility, and reducing user friction with practical suggestions.',
    tags: ['ux', 'design', 'accessibility'],
    updatedAt: new Date().toISOString(),
  },
  {
    handle: 'writing_assistant',
    title: 'Writing Assistant',
    instructions:
      'Improve grammar and style while preserving meaning. Return polished text plus 2-3 optional alternative phrasings.',
    tags: ['writing', 'editing'],
    updatedAt: new Date().toISOString(),
  },
];

const state = {
  prompts: loadPrompts(),
  messages: [],
  currentRoute: 'chat',
  autocomplete: {
    open: false,
    items: [],
    selected: 0,
    start: -1,
    end: -1,
    query: '',
  },
};

const el = {
  navLinks: document.querySelectorAll('.nav-link'),
  views: document.querySelectorAll('.view'),
  tableBody: document.getElementById('promptTableBody'),
  newPromptBtn: document.getElementById('newPromptBtn'),
  modal: document.getElementById('promptModal'),
  modalTitle: document.getElementById('modalTitle'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  promptForm: document.getElementById('promptForm'),
  originalHandle: document.getElementById('editingOriginalHandle'),
  handleInput: document.getElementById('handleInput'),
  titleInput: document.getElementById('titleInput'),
  instructionsInput: document.getElementById('instructionsInput'),
  tagsInput: document.getElementById('tagsInput'),
  formError: document.getElementById('formError'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  composer: document.getElementById('composer'),
  sendBtn: document.getElementById('sendBtn'),
  messageList: document.getElementById('messageList'),
  autocomplete: document.getElementById('autocomplete'),
  appliedPrompts: document.getElementById('appliedPrompts'),
  injectedInstructions: document.getElementById('injectedInstructions'),
  rawMessage: document.getElementById('rawMessage'),
  popover: document.getElementById('popover'),
};

init();

function init() {
  bindEvents();
  renderAll();
}

function bindEvents() {
  el.navLinks.forEach((btn) => {
    btn.addEventListener('click', () => setRoute(btn.dataset.route));
  });

  el.newPromptBtn.addEventListener('click', () => openPromptModal());
  el.closeModalBtn.addEventListener('click', closePromptModal);
  el.cancelModalBtn.addEventListener('click', closePromptModal);
  el.modal.addEventListener('click', (event) => {
    if (event.target === el.modal) closePromptModal();
  });

  el.promptForm.addEventListener('submit', onSavePrompt);
  el.handleInput.addEventListener('blur', () => {
    el.handleInput.value = normalizeHandle(el.handleInput.value);
  });

  el.exportBtn.addEventListener('click', exportPrompts);
  el.importInput.addEventListener('change', importPrompts);

  el.sendBtn.addEventListener('click', onSendMessage);

  el.composer.addEventListener('input', onComposerInput);
  el.composer.addEventListener('keydown', onComposerKeydown);
  document.addEventListener('click', (event) => {
    if (!el.autocomplete.contains(event.target) && event.target !== el.composer) {
      closeAutocomplete();
    }
  });
}

function setRoute(route) {
  state.currentRoute = route;
  renderRoute();
}

function renderRoute() {
  el.navLinks.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === state.currentRoute);
  });
  el.views.forEach((view) => {
    view.classList.toggle('hidden', view.dataset.view !== state.currentRoute);
  });
}

function renderAll() {
  renderRoute();
  renderPromptTable();
  renderMessages();
}

function loadPrompts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedPrompts));
    return [...seedPrompts];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid storage format');
    return parsed.map(sanitizePrompt).filter(Boolean);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedPrompts));
    return [...seedPrompts];
  }
}

function savePrompts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.prompts));
}

function sanitizePrompt(p) {
  if (!p || typeof p !== 'object') return null;
  const handle = normalizeHandle(String(p.handle || ''));
  if (!handle) return null;
  return {
    handle,
    title: String(p.title || '').trim() || handle,
    instructions: String(p.instructions || '').trim(),
    tags: Array.isArray(p.tags)
      ? p.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : String(p.tags || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function normalizeHandle(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function renderPromptTable() {
  if (!state.prompts.length) {
    el.tableBody.innerHTML = '<tr><td colspan="5" class="muted">No prompts yet.</td></tr>';
    return;
  }

  const sorted = [...state.prompts].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  el.tableBody.innerHTML = sorted
    .map(
      (prompt) => `
      <tr>
        <td><strong>@${escapeHtml(prompt.handle)}</strong></td>
        <td>${escapeHtml(prompt.title)}</td>
        <td>${new Date(prompt.updatedAt).toLocaleString()}</td>
        <td>
          <div class="chips">
            ${prompt.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('') || '<span class="muted">—</span>'}
          </div>
        </td>
        <td>
          <div class="row-actions">
            <button class="link-btn" data-action="edit" data-handle="${prompt.handle}">Edit</button>
            <button class="link-btn delete" data-action="delete" data-handle="${prompt.handle}">Delete</button>
          </div>
        </td>
      </tr>`
    )
    .join('');

  el.tableBody.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prompt = state.prompts.find((p) => p.handle === btn.dataset.handle);
      if (prompt) openPromptModal(prompt);
    });
  });

  el.tableBody.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const handle = btn.dataset.handle;
      const confirmed = window.confirm(`Delete @${handle}? This cannot be undone.`);
      if (!confirmed) return;
      state.prompts = state.prompts.filter((prompt) => prompt.handle !== handle);
      savePrompts();
      renderPromptTable();
    });
  });
}

function openPromptModal(prompt) {
  const editing = Boolean(prompt);
  el.modalTitle.textContent = editing ? 'Edit Prompt' : 'New Prompt';
  el.originalHandle.value = editing ? prompt.handle : '';
  el.handleInput.value = editing ? prompt.handle : '';
  el.titleInput.value = editing ? prompt.title : '';
  el.instructionsInput.value = editing ? prompt.instructions : '';
  el.tagsInput.value = editing ? prompt.tags.join(', ') : '';
  clearFormError();
  el.modal.classList.remove('hidden');
  setTimeout(() => el.handleInput.focus(), 0);
}

function closePromptModal() {
  el.modal.classList.add('hidden');
  el.promptForm.reset();
  clearFormError();
}

function setFormError(message) {
  el.formError.textContent = message;
  el.formError.classList.remove('hidden');
}

function clearFormError() {
  el.formError.classList.add('hidden');
  el.formError.textContent = '';
}

function onSavePrompt(event) {
  event.preventDefault();
  clearFormError();

  const originalHandle = el.originalHandle.value;
  const handle = normalizeHandle(el.handleInput.value);
  const title = el.titleInput.value.trim();
  const instructions = el.instructionsInput.value.trim();
  const tags = el.tagsInput.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!handle) {
    setFormError('Handle is required and can only contain letters, numbers, and underscore.');
    return;
  }
  if (!title) {
    setFormError('Title is required.');
    return;
  }
  if (!instructions) {
    setFormError('Instructions are required.');
    return;
  }

  const duplicate = state.prompts.find((p) => p.handle === handle && p.handle !== originalHandle);
  if (duplicate) {
    setFormError(`Handle @${handle} already exists. Please choose another.`);
    return;
  }

  const nextPrompt = {
    handle,
    title,
    instructions,
    tags,
    updatedAt: new Date().toISOString(),
  };

  if (originalHandle) {
    state.prompts = state.prompts.map((p) => (p.handle === originalHandle ? nextPrompt : p));
  } else {
    state.prompts.push(nextPrompt);
  }

  savePrompts();
  closePromptModal();
  renderPromptTable();
}

function onComposerInput() {
  const trigger = getActiveHandleTrigger(el.composer.value, el.composer.selectionStart);

  if (!trigger) {
    closeAutocomplete();
    return;
  }

  const filtered = state.prompts.filter((prompt) => {
    const q = trigger.query.toLowerCase();
    return prompt.handle.includes(q) || prompt.title.toLowerCase().includes(q);
  });

  if (!filtered.length) {
    closeAutocomplete();
    return;
  }

  state.autocomplete = {
    open: true,
    items: filtered,
    selected: 0,
    start: trigger.start,
    end: trigger.end,
    query: trigger.query,
  };

  renderAutocomplete();
}

function onComposerKeydown(event) {
  if (!state.autocomplete.open) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    state.autocomplete.selected = (state.autocomplete.selected + 1) % state.autocomplete.items.length;
    renderAutocomplete();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    state.autocomplete.selected =
      (state.autocomplete.selected - 1 + state.autocomplete.items.length) % state.autocomplete.items.length;
    renderAutocomplete();
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault();
    const selectedPrompt = state.autocomplete.items[state.autocomplete.selected];
    if (selectedPrompt) insertHandle(selectedPrompt.handle);
  } else if (event.key === 'Escape') {
    closeAutocomplete();
  }
}

function getActiveHandleTrigger(text, cursorPos) {
  const left = text.slice(0, cursorPos);
  const atIndex = left.lastIndexOf('@');
  if (atIndex === -1) return null;

  const beforeAt = atIndex === 0 ? ' ' : left[atIndex - 1];
  if (!/\s|[([{]/.test(beforeAt)) return null;

  const query = left.slice(atIndex + 1);
  if (/\s/.test(query)) return null;

  return {
    start: atIndex,
    end: cursorPos,
    query,
  };
}

function renderAutocomplete() {
  if (!state.autocomplete.open) {
    closeAutocomplete();
    return;
  }

  const { items, selected } = state.autocomplete;
  el.autocomplete.innerHTML = items
    .map(
      (prompt, index) => `
      <div class="autocomplete-item ${index === selected ? 'active' : ''}" data-idx="${index}">
        <strong>@${escapeHtml(prompt.handle)}</strong>
        <small>${escapeHtml(prompt.title)}</small>
      </div>`
    )
    .join('');

  el.autocomplete.classList.remove('hidden');

  el.autocomplete.querySelectorAll('.autocomplete-item').forEach((item) => {
    item.addEventListener('mousedown', (event) => {
      event.preventDefault();
      const idx = Number(item.dataset.idx);
      const prompt = state.autocomplete.items[idx];
      if (prompt) insertHandle(prompt.handle);
    });
  });
}

function closeAutocomplete() {
  state.autocomplete.open = false;
  el.autocomplete.classList.add('hidden');
  el.autocomplete.innerHTML = '';
}

function insertHandle(handle) {
  const { start, end } = state.autocomplete;
  const current = el.composer.value;
  const inserted = `${current.slice(0, start)}@${handle} ${current.slice(end)}`;
  el.composer.value = inserted;

  const cursor = start + handle.length + 2;
  el.composer.focus();
  el.composer.setSelectionRange(cursor, cursor);
  closeAutocomplete();
}

function onSendMessage() {
  const text = el.composer.value.trim();
  if (!text) return;

  const message = {
    text,
    sentAt: new Date().toISOString(),
  };

  state.messages.push(message);
  el.composer.value = '';
  closeAutocomplete();
  renderMessages();
  updatePreview(text);
}

function renderMessages() {
  if (!state.messages.length) {
    el.messageList.innerHTML = '<p class="muted">No messages yet. Send one to preview prompt injection.</p>';
    return;
  }

  el.messageList.innerHTML = state.messages
    .map((message) => `<div class="message self">${escapeHtml(message.text)}</div>`)
    .join('');
  el.messageList.scrollTop = el.messageList.scrollHeight;
}

function extractAppliedPrompts(text) {
  const handles = Array.from(text.matchAll(/(^|\s)@([a-zA-Z0-9_]+)/g)).map((m) => m[2].toLowerCase());
  const unique = [...new Set(handles)];
  return unique
    .map((handle) => state.prompts.find((p) => p.handle === handle))
    .filter(Boolean);
}

function updatePreview(text) {
  const applied = extractAppliedPrompts(text);
  el.rawMessage.textContent = text || 'None yet.';

  if (!applied.length) {
    el.appliedPrompts.innerHTML = '<span class="muted">No prompts applied.</span>';
    el.injectedInstructions.textContent = 'None.';
    return;
  }

  el.appliedPrompts.innerHTML = applied
    .map(
      (prompt) =>
        `<span class="chip handle" data-handle="${prompt.handle}">@${escapeHtml(prompt.handle)}</span>`
    )
    .join('');

  el.injectedInstructions.textContent = applied.map((p) => `[${p.handle}] ${p.instructions}`).join('\n\n');

  wirePromptPopover(applied);
}

function wirePromptPopover(prompts) {
  const map = new Map(prompts.map((p) => [p.handle, p.instructions]));

  el.appliedPrompts.querySelectorAll('.chip.handle').forEach((chip) => {
    chip.addEventListener('mouseenter', () => {
      const handle = chip.dataset.handle;
      const instructions = map.get(handle);
      if (!instructions) return;
      el.popover.textContent = instructions;
      el.popover.classList.remove('hidden');
      const rect = chip.getBoundingClientRect();
      el.popover.style.top = `${rect.bottom + 8}px`;
      el.popover.style.left = `${rect.left}px`;
    });

    chip.addEventListener('mouseleave', () => {
      el.popover.classList.add('hidden');
    });
  });
}

function exportPrompts() {
  const blob = new Blob([JSON.stringify(state.prompts, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt-library-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importPrompts(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Import file must be an array of prompts.');

    const incoming = data.map(sanitizePrompt).filter(Boolean);
    if (!incoming.length) throw new Error('No valid prompts found in file.');

    const merged = new Map(state.prompts.map((p) => [p.handle, p]));
    incoming.forEach((p) => {
      merged.set(p.handle, {
        ...p,
        updatedAt: new Date().toISOString(),
      });
    });

    state.prompts = Array.from(merged.values());
    savePrompts();
    renderPromptTable();
    alert(`Imported ${incoming.length} prompt(s).`);
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  } finally {
    event.target.value = '';
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
