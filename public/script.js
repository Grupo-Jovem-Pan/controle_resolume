const stage = document.getElementById("stage");
let currentFrame = null;
let editMode = false;

/* =====================
   EDIT / SHOW
===================== */
document.getElementById("editToggle").onclick = () => {
  editMode = !editMode;
  document.body.classList.toggle("edit-mode", editMode);
  document.getElementById("editToggle").innerText =
    editMode ? "▶ SHOW" : "⚙️ EDIT";

  document.querySelectorAll(".button").forEach(btn => {
    btn.draggable = editMode;
  });
};

/* =====================
   FRAME MODAL
===================== */
function openFrameModal() {
  document.getElementById("frameModal").classList.remove("hidden");
}

function closeFrameModal() {
  document.getElementById("frameModal").classList.add("hidden");
}

/* =====================
   FRAME
===================== */
function createFrame() {
  const name = document.getElementById("frameName").value;
  const color = document.getElementById("frameColor").value;
  if (!name) return alert("Nome obrigatório");

  closeFrameModal();

  const frame = document.createElement("div");
  frame.className = "frame";
  frame.style.left = "100px";
  frame.style.top = "100px";
  frame.style.borderColor = color;

  const title = document.createElement("h2");
  title.innerText = name;
  title.style.background = color;

  const content = document.createElement("div");
  content.className = "frame-content";

  frame.append(title, content);
  stage.appendChild(frame);

  frame.addEventListener("mousedown", () =>
    selectFrame(frame, content)
  );

  selectFrame(frame, content);
  enableFrameDrag(frame, title);

  document.getElementById("frameName").value = "";
}

/* =====================
   FRAME SELECT
===================== */
function selectFrame(frame, content) {
  document.querySelectorAll(".frame").forEach(f =>
    f.classList.remove("active")
  );
  frame.classList.add("active");
  currentFrame = content;
}

/* =====================
   DRAG FRAME
===================== */
function enableFrameDrag(frame, handle) {
  let offsetX, offsetY, dragging = false;

  handle.addEventListener("mousedown", e => {
    if (!editMode) return;
    dragging = true;
    offsetX = e.clientX - frame.offsetLeft;
    offsetY = e.clientY - frame.offsetTop;
    e.stopPropagation();
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    frame.style.left = e.clientX - offsetX + "px";
    frame.style.top = e.clientY - offsetY + "px";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}

/* =====================
   BOTÃO
===================== */
async function addButton() {
  if (!currentFrame) return alert("Selecione um frame");

  const col = prompt("Coluna");
  if (!col) return;

  const icons = await fetch("/icons").then(r => r.json());
  const chooser = document.createElement("div");
  chooser.className = "icon-chooser";

  icons.forEach(icon => {
    const img = document.createElement("img");
    img.src = "icons/" + icon;
    img.onclick = () => {
      createButton(col, img.src);
      chooser.remove();
    };
    chooser.appendChild(img);
  });

  document.body.appendChild(chooser);
}

function createButton(column, img) {
  const btn = document.createElement("div");
  btn.className = "button";
  btn.dataset.column = column;
  btn.draggable = editMode;

  btn.innerHTML = `
    <img src="${img}">
    <input class="col-input" type="number" value="${column}">
  `;

  btn.querySelector(".col-input").oninput = e => {
    btn.dataset.column = e.target.value;
  };

  btn.onclick = () => {
    if (editMode) return;
    fetch("/column", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column: btn.dataset.column })
    });
  };

  currentFrame.appendChild(btn);
}

/* =====================
   DRAG BOTÕES
===================== */
document.addEventListener("dragstart", e => {
  if (!editMode) return;
  if (!e.target.classList.contains("button")) return;
  e.target.classList.add("dragging");
});

document.addEventListener("dragend", e => {
  if (e.target.classList.contains("button")) {
    e.target.classList.remove("dragging");
  }
});

document.addEventListener("dragover", e => {
  if (!editMode) return;

  const container = e.target.closest(".frame-content");
  if (!container) return;

  e.preventDefault();

  const dragging = document.querySelector(".button.dragging");
  if (!dragging) return;

  const buttons = [...container.querySelectorAll(".button:not(.dragging)")];

  const next = buttons.find(btn => {
    const box = btn.getBoundingClientRect();
    return e.clientX < box.left + box.width / 2;
  });

  if (next) container.insertBefore(dragging, next);
  else container.appendChild(dragging);
});

/* =====================
   PRESETS
===================== */
function serializeLayout() {
  return [...document.querySelectorAll(".frame")].map(frame => ({
    name: frame.querySelector("h2").innerText,
    color: frame.querySelector("h2").style.background,
    left: frame.style.left,
    top: frame.style.top,
    buttons: [...frame.querySelectorAll(".button")].map(btn => ({
      column: btn.dataset.column,
      icon: btn.querySelector("img").src
    }))
  }));
}

function clearStage() {
  document.querySelectorAll(".frame").forEach(f => f.remove());
  currentFrame = null;
}

function savePreset() {
  const name = prompt("Nome do preset");
  if (!name) return;

  fetch("/presets/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      data: serializeLayout()
    })
  }).then(() => alert("Preset salvo"));
}

async function loadPreset() {

  const presets = await fetch("/presets").then(r => r.json());
  if (!presets.length) return alert("Nenhum preset encontrado");

  const name = prompt("Preset:\n" + presets.join("\n"));
  if (!name) return;

  const data = await fetch("/presets/load/" + name).then(r => r.json());
  clearStage();

  data.forEach(frameData => {
    const frame = document.createElement("div");
    frame.className = "frame";
    frame.style.left = frameData.left;
    frame.style.top = frameData.top;
    frame.style.borderColor = frameData.color;

    const title = document.createElement("h2");
    title.innerText = frameData.name;
    title.style.background = frameData.color;

    const content = document.createElement("div");
    content.className = "frame-content";

    frame.append(title, content);
    stage.appendChild(frame);

    frame.addEventListener("mousedown", () =>
      selectFrame(frame, content)
    );

    enableFrameDrag(frame, title);

    frameData.buttons.forEach(btnData => {
      const btn = document.createElement("div");
      btn.className = "button";
      btn.dataset.column = btnData.column;
      btn.draggable = editMode;

      btn.innerHTML = `
        <img src="${btnData.icon}">
        <input class="col-input" type="number" value="${btnData.column}">
      `;

      btn.querySelector(".col-input").oninput = e => {
        btn.dataset.column = e.target.value;
      };

      btn.onclick = () => {
        if (editMode) return;
        fetch("/column", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ column: btn.dataset.column })
        });
      };

      content.appendChild(btn);
    });
  });
}



/* =====================
   PRESET UI
===================== */

async function refreshPresetList() {
  const select = document.getElementById("presetSelect");
  select.innerHTML = `<option value="">-- selecionar preset --</option>`;

  const presets = await fetch("/presets").then(r => r.json());
  presets.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.innerText = name;
    select.appendChild(opt);
  });
}

// carrega automaticamente ao abrir
window.addEventListener("load", refreshPresetList);

/* =====================
   LOAD
===================== */

async function loadPresetFromSelect() {
  const select = document.getElementById("presetSelect");
  const name = select.value;
  if (!name) return alert("Selecione um preset");

  const data = await fetch("/presets/load/" + name).then(r => r.json());
  clearStage();

  data.forEach(frameData => {
    const frame = document.createElement("div");
    frame.className = "frame";
    frame.style.left = frameData.left;
    frame.style.top = frameData.top;
    frame.style.borderColor = frameData.color;

    const title = document.createElement("h2");
    title.innerText = frameData.name;
    title.style.background = frameData.color;

    const content = document.createElement("div");
    content.className = "frame-content";

    frame.append(title, content);
    stage.appendChild(frame);

    frame.addEventListener("mousedown", () =>
      selectFrame(frame, content)
    );

    enableFrameDrag(frame, title);

    frameData.buttons.forEach(btnData => {
      const btn = document.createElement("div");
      btn.className = "button";
      btn.dataset.column = btnData.column;
      btn.draggable = editMode;

      btn.innerHTML = `
        <img src="${btnData.icon}">
        <input class="col-input" type="number" value="${btnData.column}">
      `;

      btn.querySelector(".col-input").oninput = e => {
        btn.dataset.column = e.target.value;
      };

      btn.onclick = () => {
        if (editMode) return;
        fetch("/column", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ column: btn.dataset.column })
        });
      };

      content.appendChild(btn);
    });
  });
}

/* =====================
   SAVE
===================== */

function savePresetOverwrite() {
  const select = document.getElementById("presetSelect");
  const name = select.value;
  if (!name) return alert("Nenhum preset selecionado");

  fetch("/presets/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      data: serializeLayout()
    })
  }).then(() => alert("Preset atualizado"));
}

function savePresetAs() {
  const name = prompt("Nome do novo preset");
  if (!name) return;

  fetch("/presets/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      data: serializeLayout()
    })
  }).then(() => {
    refreshPresetList();
    document.getElementById("presetSelect").value = name;
    alert("Novo preset salvo");
  });
}

/* =====================
   GLOBAL (SEGURANÇA)
===================== */
window.loadPresetFromSelect = loadPresetFromSelect;
window.savePresetOverwrite = savePresetOverwrite;
window.savePresetAs = savePresetAs;
