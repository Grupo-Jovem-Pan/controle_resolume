const stage = document.getElementById("stage");
const trash = document.getElementById("trash");
let currentFrame = null;
let editMode = false;

// Modo EDIT
document.getElementById("editToggle").onclick = () => {
  editMode = !editMode;
  document.body.classList.toggle("edit-mode", editMode);
  trash.classList.toggle("hidden", !editMode);
  document.getElementById("editToggle").innerText = editMode ? "▶ SHOW" : "⚙️ EDIT";
};

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function openFrameModal() { document.getElementById("frameModal").classList.remove("hidden"); }

async function openButtonModal() {
  if (!currentFrame) return alert("Selecione um Frame clicando nele!");
  const grid = document.getElementById("iconGrid");
  grid.innerHTML = "Carregando...";
  document.getElementById("buttonModal").classList.remove("hidden");
  
  const icons = await fetch("/icons").then(r => r.json());
  grid.innerHTML = "";
  icons.forEach(icon => {
    const img = document.createElement("img");
    img.src = `icons/${icon}`;
    img.onclick = () => {
      createButton(document.getElementById("btnCol").value, document.getElementById("btnLayer").value, img.src);
      closeModal("buttonModal");
    };
    grid.appendChild(img);
  });
}

// DISPARO VIA SERVIDOR NODE (Resolve CORS)
async function triggerResolume(layer, col) {
  try {
    await fetch("/trigger", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layer, col })
    });
  } catch (e) {
    console.error("Erro ao enviar comando");
  }
}

function createFrame(data = null) {
  const name = data ? data.name : document.getElementById("frameName").value;
  const color = data ? data.color : document.getElementById("frameColor").value;
  const frame = document.createElement("div");
  frame.className = "frame";
  frame.style.left = data ? data.left : "100px";
  frame.style.top = data ? data.top : "100px";
  frame.style.borderColor = color;
  const title = document.createElement("h2");
  title.innerText = name; title.style.background = color;
  const content = document.createElement("div");
  content.className = "frame-content";
  frame.append(title, content);
  stage.appendChild(frame);
  frame.addEventListener("mousedown", () => {
    document.querySelectorAll(".frame").forEach(f => f.classList.remove("active"));
    frame.classList.add("active");
    currentFrame = content;
  });
  enableDrag(frame, title, true);
  if(!data) closeModal("frameModal");
  return content;
}

function createButton(col, layer, imgSrc, targetContent = null) {
  const btn = document.createElement("div");
  btn.className = "button";
  btn.dataset.col = col; btn.dataset.layer = layer || "";
  const label = (layer && layer !== "") ? `L${layer} C${col}` : `COL ${col}`;
  btn.innerHTML = `<img src="${imgSrc}"><div class="btn-badge">${label}</div>`;
  btn.onclick = () => {
    if (editMode) {
      const nCol = prompt("Nova Coluna:", btn.dataset.col);
      const nLay = prompt("Nova Linha:", btn.dataset.layer);
      if(nCol !== null) btn.dataset.col = nCol;
      if(nLay !== null) btn.dataset.layer = nLay;
      btn.querySelector(".btn-badge").innerText = (btn.dataset.layer !== "") ? `L${btn.dataset.layer} C${btn.dataset.col}` : `COL ${btn.dataset.col}`;
    } else {
      triggerResolume(btn.dataset.layer, btn.dataset.col);
    }
  };
  enableDrag(btn, btn, false);
  (targetContent || currentFrame).appendChild(btn);
}

function enableDrag(el, handle, isFrame) {
  let ox, oy, dragging = false;
  handle.onmousedown = e => {
    if (!editMode) return;
    dragging = true; ox = e.clientX - el.offsetLeft; oy = e.clientY - el.offsetTop;
    el.style.zIndex = 1000; e.stopPropagation();
  };
  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    el.style.left = (e.clientX - ox) + "px"; el.style.top = (e.clientY - oy) + "px";
    const tr = trash.getBoundingClientRect();
    trash.classList.toggle("drag-over", e.clientX > tr.left && e.clientX < tr.right && e.clientY > tr.top && e.clientY < tr.bottom);
  });
  document.addEventListener("mouseup", e => {
    if (!dragging) return;
    dragging = false;
    const tr = trash.getBoundingClientRect();
    if (e.clientX > tr.left && e.clientX < tr.right && e.clientY > tr.top && e.clientY < tr.bottom) el.remove();
    trash.classList.remove("drag-over");
  });
}

// --- PERSISTÊNCIA ---
function serializeLayout() {
  return [...document.querySelectorAll(".frame")].map(f => ({
    name: f.querySelector("h2").innerText,
    color: f.querySelector("h2").style.background,
    left: f.style.left, top: f.style.top,
    buttons: [...f.querySelectorAll(".button")].map(b => ({ col: b.dataset.col, layer: b.dataset.layer, icon: b.querySelector("img").src }))
  }));
}

async function savePresetAs() {
  const name = prompt("Nome do novo preset:");
  if (!name) return;
  await fetch("/presets/save", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name, data: serializeLayout()}) });
  refreshPresetList();
}

async function savePresetOverwrite() {
  const name = document.getElementById("presetSelect").value;
  if (!name) return alert("Selecione um preset para salvar");
  await fetch("/presets/save", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name, data: serializeLayout()}) });
  alert("Salvo!");
}

async function loadPresetFromSelect() {
  const name = document.getElementById("presetSelect").value;
  if (!name) return;
  const data = await fetch("/presets/load/" + name).then(r => r.json());
  stage.innerHTML = "";
  data.forEach(fData => {
    const cont = createFrame(fData);
    fData.buttons.forEach(b => createButton(b.col, b.layer, b.icon, cont));
  });
}

async function refreshPresetList() {
  const select = document.getElementById("presetSelect");
  const presets = await fetch("/presets").then(r => r.json());
  select.innerHTML = '<option value="">-- selecionar preset --</option>';
  presets.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p; opt.innerText = p;
    select.appendChild(opt);
  });
}

window.onload = refreshPresetList;