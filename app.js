(function () {
  const STORAGE_KEY = "glass_todo_board_tasks_v1";

  /** @typedef {{ id:string, title:string, description:string, dueDate:string, completed:boolean, createdAt:number, order:{all:number,active:number,completed:number} }} Task */

  /** @type {Task[]} */
  let tasks = [];

  // Elements
  const listAll = document.getElementById("list-all");
  const listActive = document.getElementById("list-active");
  const listCompleted = document.getElementById("list-completed");
  const openAddModalBtn = document.getElementById("openAddModalBtn");

  const taskModal = document.getElementById("taskModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const taskForm = document.getElementById("taskForm");
  const modalTitle = document.getElementById("modalTitle");
  const taskIdInput = document.getElementById("taskId");
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");
  const dueDateInput = document.getElementById("dueDate");

  const detailsModal = document.getElementById("detailsModal");
  const detailsBody = document.getElementById("detailsBody");
  const closeDetailsBtn = document.getElementById("closeDetailsBtn");
  const detailsCloseAction = document.getElementById("detailsCloseAction");
  const confirmModal = document.getElementById("confirmModal");
  const closeConfirmBtn = document.getElementById("closeConfirmBtn");
  const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const toastContainer = document.getElementById("toastContainer");
  let pendingDeleteId = null;

  function uid() {
    return (
      "t_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    );
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function openModal(editingTask) {
    if (editingTask) {
      modalTitle.textContent = "Edit Task";
      taskIdInput.value = editingTask.id;
      titleInput.value = editingTask.title;
      descriptionInput.value = editingTask.description;
      dueDateInput.value = editingTask.dueDate;
    } else {
      modalTitle.textContent = "Add Task";
      taskIdInput.value = "";
      taskForm.reset();
    }
    taskModal.classList.remove("hidden");
    taskModal.setAttribute("aria-hidden", "false");
    titleInput.focus();
  }

  function closeModal() {
    taskModal.classList.add("hidden");
    taskModal.setAttribute("aria-hidden", "true");
  }

  function openDetails(task) {
    detailsBody.innerHTML =
      "" +
      `<div class="form-row"><strong>Title:</strong> ${escapeHtml(
        task.title
      )}</div>` +
      `<div class="form-row"><strong>Description:</strong><br>${nl2br(
        escapeHtml(task.description)
      )}</div>` +
      `<div class="form-row"><strong>Due:</strong> ${formatDate(
        task.dueDate
      )}</div>` +
      `<div class="form-row"><strong>Status:</strong> ${
        task.completed ? "Completed" : "Active"
      }</div>` +
      `<div class="form-row"><strong>Created:</strong> ${new Date(
        task.createdAt
      ).toLocaleString()}</div>`;
    detailsModal.classList.remove("hidden");
    detailsModal.setAttribute("aria-hidden", "false");
  }

  function closeDetails() {
    detailsModal.classList.add("hidden");
    detailsModal.setAttribute("aria-hidden", "true");
  }

  function openConfirm(id) {
    pendingDeleteId = id;
    confirmModal.classList.remove("hidden");
    confirmModal.setAttribute("aria-hidden", "false");
  }
  function closeConfirm() {
    pendingDeleteId = null;
    confirmModal.classList.add("hidden");
    confirmModal.setAttribute("aria-hidden", "true");
  }

  function showToast(message, type = "info") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 5000);
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  }

  function escapeHtml(s) {
    return s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  }

  function nl2br(s) {
    return s.replace(/\n/g, "<br>");
  }

  function addTask({ title, description, dueDate }) {
    const id = uid();
    const createdAt = Date.now();
    const orderIndex = {
      all: (getOrdered("all").slice(-1)[0]?.order.all ?? -1) + 1,
      active: (getOrdered("active").slice(-1)[0]?.order.active ?? -1) + 1,
      completed:
        (getOrdered("completed").slice(-1)[0]?.order.completed ?? -1) + 1,
    };
    const task = {
      id,
      title,
      description,
      dueDate,
      completed: false,
      createdAt,
      order: orderIndex,
    };
    tasks.push(task);
    save();
    render();
  }

  function updateTask(id, partial) {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tasks[idx] = { ...tasks[idx], ...partial };
    save();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    save();
    render();
  }

  function getOrdered(section) {
    const copy = tasks.slice();
    if (section === "active")
      return copy
        .filter((t) => !t.completed)
        .sort((a, b) => a.order.active - b.order.active);
    if (section === "completed")
      return copy
        .filter((t) => t.completed)
        .sort((a, b) => a.order.completed - b.order.completed);
    return copy.sort((a, b) => a.order.all - b.order.all);
  }

  function render() {
    renderSection("all", listAll);
    renderSection("active", listActive);
    renderSection("completed", listCompleted);
  }

  function renderSection(section, ul) {
    ul.innerHTML = "";
    const items = getOrdered(section);
    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.textContent = "No tasks";
      ul.appendChild(empty);
      return;
    }
    for (const t of items) {
      const li = document.createElement("li");
      li.className = "task-item";
      li.draggable = true;
      li.dataset.id = t.id;
      li.innerHTML = `
        <button class="status-btn ${
          t.completed ? "status-completed" : "status-active"
        }">${t.completed ? "Completed" : "Active"}</button>
        <div class="content">
          <div class="title-row">
            <span class="title">${escapeHtml(t.title)}</span>
          </div>
          <div class="meta">Due ${formatDate(t.dueDate)}</div>
        </div>
        <div class="task-actions">
          <div class="menu">
            <button class="menu-btn" aria-haspopup="true" aria-expanded="false">⋯</button>
            <div class="menu-list" role="menu">
              <button class="menu-item view-btn" role="menuitem">Details</button>
              <button class="menu-item edit-btn" role="menuitem">Edit</button>
              <button class="menu-item delete-btn" role="menuitem">Delete</button>
            </div>
          </div>
        </div>
      `;

      // status button toggle
      li.querySelector(".status-btn").addEventListener("click", () => {
        const isCompleted = !t.completed;
        if (isCompleted) {
          const last = getOrdered("completed").slice(-1)[0];
          const nextOrder = (last?.order.completed ?? -1) + 1;
          updateTask(t.id, {
            completed: true,
            order: { ...t.order, completed: nextOrder },
          });
        } else {
          const last = getOrdered("active").slice(-1)[0];
          const nextOrder = (last?.order.active ?? -1) + 1;
          updateTask(t.id, {
            completed: false,
            order: { ...t.order, active: nextOrder },
          });
        }
      });
      li.querySelector(".view-btn").addEventListener("click", () =>
        openDetails(t)
      );
      li.querySelector(".edit-btn").addEventListener("click", () =>
        openModal(t)
      );
      li.querySelector(".delete-btn").addEventListener("click", () =>
        openConfirm(t.id)
      );

      // kebab menu toggle
      const menu = li.querySelector(".menu");
      const menuBtn = li.querySelector(".menu-btn");
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = menu.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("click", (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.remove("open");
          menuBtn.setAttribute("aria-expanded", "false");
        }
      });

      // drag events
      li.addEventListener("dragstart", () => {
        li.classList.add("dragging");
      });
      li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
      });
      ul.appendChild(li);
    }

    enableDragSort(ul, section);
  }

  function enableDragSort(ul, section) {
    ul.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = ul.querySelector(".dragging");
      if (!dragging) return;
      const after = getDragAfterElement(ul, e.clientY);
      if (after == null) {
        ul.appendChild(dragging);
      } else {
        ul.insertBefore(dragging, after);
      }
    });

    ul.addEventListener("drop", () => {
      const ids = Array.from(ul.querySelectorAll(".task-item")).map(
        (li) => li.dataset.id
      );
      // Rewrite order for the specific section and All
      ids.forEach((id, index) => {
        const t = tasks.find((x) => x.id === id);
        if (!t) return;
        if (section === "active" && t.completed) return; // should not happen
        if (section === "completed" && !t.completed) return;
        t.order = { ...t.order, [section]: index };
        // Keep All order grouped: put All reflecting interleaved across all tasks relative positions
        if (section === "all") {
          t.order.all = index;
        }
      });
      // Also recompute all-section order always by current DOM of list-all to keep consistent
      const allIds = Array.from(listAll.querySelectorAll(".task-item")).map(
        (li) => li.dataset.id
      );
      allIds.forEach((id, idx) => {
        const t = tasks.find((x) => x.id === id);
        if (t) t.order.all = idx;
      });
      save();
    });
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".task-item:not(.dragging)"),
    ];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  // Event wiring
  openAddModalBtn.addEventListener("click", () => openModal());
  closeModalBtn.addEventListener("click", closeModal);
  cancelModalBtn.addEventListener("click", closeModal);
  closeDetailsBtn.addEventListener("click", closeDetails);
  detailsCloseAction.addEventListener("click", closeDetails);
  closeConfirmBtn.addEventListener("click", closeConfirm);
  cancelConfirmBtn.addEventListener("click", closeConfirm);
  confirmDeleteBtn.addEventListener("click", () => {
    if (pendingDeleteId) {
      deleteTask(pendingDeleteId);
      showToast("Task deleted", "success");
      closeConfirm();
    }
  });

  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = taskIdInput.value.trim();
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const dueDate = dueDateInput.value;
    if (!title || !description || !dueDate) return;
    if (id) {
      updateTask(id, { title, description, dueDate });
    } else {
      addTask({ title, description, dueDate });
      showToast("Task created", "info");
    }
    closeModal();
  });

  // Init
  tasks = load();
  render();
})();
