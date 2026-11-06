(() => {
  const STORAGE_KEY = "keyvault_api_keys_v1";

  function getAll() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveAll(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  window.KeyStorage = { getAll, saveAll, STORAGE_KEY };
})();
