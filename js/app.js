(() => {
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    list: $("#keyList"), empty: $("#emptyState"), modal: $("#keyModal"),
    form: $("#keyForm"), name: $("#keyName"), value: $("#keyValue"),
    id: $("#keyId"), limited: $("#keyLimited"), search: $("#searchInput"),
    total: $("#totalCount"), available: $("#availableCount"),
    limitedCount: $("#limitedCount"), allTab: $("#allTabCount"),
    result: $("#resultLabel"), toast: $("#toast")
  };

  let keys = KeyStorage.getAll();
  let activeFilter = "all";
  let revealed = new Set();
  let toastTimer;

  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  function persist() {
    try {
      KeyStorage.saveAll(keys);
      return true;
    } catch (error) {
      showToast("Gagal menyimpan. Penyimpanan browser mungkin penuh.");
      return false;
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2300);
  }

  function maskKey(value) {
    if (value.length <= 8) return "•".repeat(Math.max(value.length, 4));
    return `${value.slice(0, 4)}${"•".repeat( Math.min(value.length - 8, 18) )}${value.slice(-4)}`;
  }

  function render() {
    const total = keys.length;
    const limited = keys.filter(key => key.limited).length;
    elements.total.textContent = total;
    elements.available.textContent = total - limited;
    elements.limitedCount.textContent = limited;
    elements.allTab.textContent = total;

    const term = elements.search.value.trim().toLowerCase();
    const filtered = keys.filter(key => {
      const matchesFilter = activeFilter === "all" ||
        (activeFilter === "limited" ? key.limited : !key.limited);
      return matchesFilter && (key.name.toLowerCase().includes(term));
    });

    elements.result.textContent = `${filtered.length} item`;
    elements.list.innerHTML = filtered.map(key => {
      const isRevealed = revealed.has(key.id);
      const displayed = isRevealed ? key.value : maskKey(key.value);
      return `
        <article class="key-card" data-id="${escapeHTML(key.id)}">
          <div>
            <p class="key-name">${escapeHTML(key.name)}</p>
            <p class="key-provider">${key.limited ? "Kuota telah mencapai limit" : "API credential"}</p>
          </div>
          <div class="secret-line">
            <span class="secret-value" title="${isRevealed ? "API Key terlihat" : "API Key disamarkan"}">${escapeHTML(displayed)}</span>
            <button class="small-icon" type="button" data-action="reveal" aria-label="${isRevealed ? "Sembunyikan" : "Tampilkan"} API key">
              ${isRevealed ? eyeOffIcon() : eyeIcon()}
            </button>
            <button class="small-icon" type="button" data-action="copy" aria-label="Salin API key">${copyIcon()}</button>
          </div>
          <div class="key-actions">
            <label class="status-control" title="Tandai jika API key sudah limit">
              <input type="checkbox" data-action="limit" ${key.limited ? "checked" : ""}>
              <span>Limit</span>
            </label>
            <button class="small-icon" type="button" data-action="edit" aria-label="Edit API key">${editIcon()}</button>
            <button class="small-icon" type="button" data-action="delete" aria-label="Hapus API key">${trashIcon()}</button>
          </div>
        </article>`;
    }).join("");

    elements.empty.hidden = filtered.length > 0;
    elements.list.hidden = filtered.length === 0;
    if (total === 0 && !term && activeFilter === "all") {
      elements.empty.querySelector("h3").textContent = "Belum ada API Key";
      elements.empty.querySelector("p").textContent = "Tambahkan API key pertamamu untuk mulai mengelolanya.";
    } else if (filtered.length === 0) {
      elements.empty.querySelector("h3").textContent = "Tidak ada hasil";
      elements.empty.querySelector("p").textContent = "Coba ubah kata pencarian atau filter yang dipilih.";
    }
    document.querySelectorAll(".filter-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.filter === activeFilter);
    });
  }

  function openModal(key = null) {
    elements.form.reset();
    elements.id.value = key?.id || "";
    elements.name.value = key?.name || "";
    elements.value.value = key?.value || "";
    elements.limited.checked = key?.limited || false;
    elements.value.type = "password";
    $("#toggleSecretBtn").textContent = "Lihat";
    $("#modalTitle").textContent = key ? "Edit API Key" : "Tambah API Key";
    $("#saveBtn").textContent = key ? "Simpan Perubahan" : "Simpan API Key";
    elements.modal.showModal();
    elements.name.focus();
  }

  function closeModal() {
    elements.modal.close();
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }
    const temp = document.createElement("textarea");
    temp.value = value;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    const success = document.execCommand("copy");
    temp.remove();
    return success ? Promise.resolve() : Promise.reject(new Error("Copy gagal"));
  }

  elements.form.addEventListener("submit", event => {
    event.preventDefault();
    const name = elements.name.value.trim();
    const value = elements.value.value.trim();
    if (!name || !value) return;

    const id = elements.id.value;
    const previous = id ? keys.find(key => key.id === id) : null;
    const next = {
      id: id || makeId(), name, value,
      limited: elements.limited.checked,
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (id) keys = keys.map(key => key.id === id ? next : key);
    else keys.unshift(next);

    if (!persist()) return;
    closeModal();
    render();
    showToast(id ? "API key berhasil diperbarui." : "API key berhasil ditambahkan.");
  });

  elements.list.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".key-card");
    const key = keys.find(item => item.id === card?.dataset.id);
    if (!key) return;

    switch (button.dataset.action) {
      case "reveal":
        revealed.has(key.id) ? revealed.delete(key.id) : revealed.add(key.id);
        render();
        break;
      case "copy":
        try {
          await copyText(key.value);
          showToast("API key berhasil disalin.");
        } catch {
          showToast("Tidak dapat menyalin API key.");
        }
        break;
      case "edit":
        openModal(key);
        break;
      case "delete":
        if (confirm(`Hapus API key "${key.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
          keys = keys.filter(item => item.id !== key.id);
          revealed.delete(key.id);
          if (persist()) {
            render();
            showToast("API key berhasil dihapus.");
          }
        }
        break;
    }
  });

  elements.list.addEventListener("change", event => {
    if (event.target.dataset.action !== "limit") return;
    const card = event.target.closest(".key-card");
    const key = keys.find(item => item.id === card?.dataset.id);
    if (!key) return;
    key.limited = event.target.checked;
    key.updatedAt = new Date().toISOString();
    if (persist()) {
      render();
      showToast(key.limited ? "Ditandai sudah limit." : "Status kembali available.");
    }
  });

  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activeFilter = tab.dataset.filter;
      render();
    });
  });

  elements.search.addEventListener("input", render);
  $("#openAddBtn").addEventListener("click", () => openModal());
  $("#emptyAddBtn").addEventListener("click", () => openModal());
  $("#closeModalBtn").addEventListener("click", closeModal);
  $("#cancelBtn").addEventListener("click", closeModal);
  elements.modal.addEventListener("click", event => {
    if (event.target === elements.modal) closeModal();
  });
  $("#toggleSecretBtn").addEventListener("click", () => {
    const visible = elements.value.type === "text";
    elements.value.type = visible ? "password" : "text";
    $("#toggleSecretBtn").textContent = visible ? "Lihat" : "Sembunyikan";
  });

  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(keys, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `keyvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Backup JSON berhasil dibuat.");
  });

  function eyeIcon() { return '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'; }
  function eyeOffIcon() { return '<svg viewBox="0 0 24 24"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3-.5"/></svg>'; }
  function copyIcon() { return '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>'; }
  function editIcon() { return '<svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"/></svg>'; }
  function trashIcon() { return '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>'; }

  render();
})();
