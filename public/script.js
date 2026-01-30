const stage = document.getElementById("stage");
const trash = document.getElementById("trash");
let currentFrame = null;
let editMode = false;
let maxZ = 100;
let editingElement = null; 

let lastColumn = 1; // Armazena a última coluna disparada

// --- FUNÇÃO DE NAVEGAÇÃO ---
function changeColumn(delta) {
    // Calcula a nova coluna (garante que não seja menor que 1)
    let targetCol = parseInt(lastColumn) + delta;
    if (targetCol < 1) targetCol = 1;

    console.log(`Navegando para coluna: ${targetCol}`);
    
    // Dispara a coluna no Resolume (passando null no layer para disparar a coluna inteira)
    triggerResolume(null, targetCol);
}

// --- DISPARO RESOLUME (ATUALIZADA) ---
async function triggerResolume(layer, col, isChangeColums = true) {
    // SEMPRE atualiza a última coluna clicada
    if (isChangeColums) lastColumn = parseInt(col); 
    
    const RESOLUME_API = "http://127.0.0.1:8080/api/v1";
    let url = (layer && layer.trim() !== "") 
        ? `${RESOLUME_API}/composition/layers/${layer}/clips/${col}/connect`
        : `${RESOLUME_API}/composition/columns/${col}/connect`;

    try {
        await fetch(url, { method: 'POST', mode: 'no-cors' });
        
        // Feedback visual opcional: destacar botões da coluna ativa
        document.querySelectorAll(".button").forEach(b => {
            b.classList.toggle("active-col", b.dataset.col == lastColumn);
        });
    } catch (e) {
        console.error("Erro ao conectar com Resolume.");
    }
}

// // --- DISPARO RESOLUME ---
// async function triggerResolume(layer, col) {
//     const RESOLUME_API = "http://127.0.0.1:8080/api/v1";
//     let url = (layer && layer.trim() !== "") 
//         ? `${RESOLUME_API}/composition/layers/${layer}/clips/${col}/connect`
//         : `${RESOLUME_API}/composition/columns/${col}/connect`;
//     try { await fetch(url, { method: 'POST', mode: 'no-cors' }); } catch (e) { console.error("Resolume Offline"); }
// }

// --- CONTROLE DE INTERFACE ---
document.getElementById("editToggle").onclick = () => {
    editMode = !editMode;
    document.body.classList.toggle("edit-mode", editMode);
    trash.classList.toggle("hidden", !editMode);
    document.getElementById("editToggle").innerText = editMode ? "▶ SHOW" : "⚙️ EDIT";
};

function closeModal(id) { document.getElementById(id).classList.add("hidden"); editingElement = null; }

/* =====================
   LÓGICA DE MODAIS
===================== */
function openFrameModal(isEdit = false) {
    const modal = document.getElementById("frameModal");
    const title = document.getElementById("frameModalTitle");
    const btn = document.getElementById("btnFrameConfirm");
    
    if (isEdit && editingElement) {
        title.innerText = "Editar Frame";
        btn.innerText = "Atualizar";
        document.getElementById("frameName").value = editingElement.querySelector("h2").innerText;
        document.getElementById("frameColor").value = editingElement.querySelector(".drag-handle").style.background;
    } else {
        title.innerText = "Novo Frame";
        btn.innerText = "Criar";
        document.getElementById("frameName").value = "";
    }
    modal.classList.remove("hidden");
}

function confirmFrameAction() {
    const name = document.getElementById("frameName").value;
    const color = document.getElementById("frameColor").value;
    if (!name) return alert("Nome obrigatório");

    if (editingElement) {
        editingElement.querySelector("h2").innerText = name;
        editingElement.querySelector(".drag-handle").style.background = color;
        editingElement.style.borderColor = color;
    } else {
        createFrame({ name, color });
    }
    closeModal('frameModal');
}

async function openButtonModal(isEdit = false) {
    if (!currentFrame && !isEdit) return alert("Selecione um Frame clicando nele!");
    
    const modal = document.getElementById("buttonModal");
    document.getElementById("buttonModalTitle").innerText = isEdit ? "Editar Botão" : "Novo Botão";

    if (isEdit && editingElement) {
        document.getElementById("btnCol").value = editingElement.dataset.col;
        document.getElementById("btnLayer").value = editingElement.dataset.layer;
    }

    const grid = document.getElementById("iconGrid");
    grid.innerHTML = "Carregando...";
    modal.classList.remove("hidden");
    
    const icons = await fetch("/icons").then(r => r.json());
    grid.innerHTML = "";
    icons.forEach(icon => {
        const img = document.createElement("img");
        img.src = `icons/${icon}`;
        img.onclick = () => {
            const col = document.getElementById("btnCol").value;
            const layer = document.getElementById("btnLayer").value;
            
            if (editingElement) {
                editingElement.dataset.col = col;
                editingElement.dataset.layer = layer;
                editingElement.querySelector("img").src = img.src;
                const label = (layer !== "") ? `L${layer} C${col}` : `COL ${col}`;
                editingElement.querySelector(".btn-badge").innerText = label;
            } else {
                createButton(col, layer, img.src);
            }
            closeModal("buttonModal");
        };
        grid.appendChild(img);
    });
}

async function takevMixResolume(){
    triggerResolume(null, 2, false);
    lastColumn = 2;
    fetch("http://172.16.2.38:8088/api/?Function=OverlayInput4In&Input=ART_BANCADA_01.gtzip", { mode: 'no-cors' });
}

/* =====================
   CRIAÇÃO E ARRASTO
===================== */
function createFrame(data = null) {
    const frame = document.createElement("div");
    frame.className = "frame";
    frame.style.left = data.left || "100px";
    frame.style.top = data.top || "100px";
    frame.style.width = data.width || "300px";
    frame.style.height = data.height || "200px";
    frame.style.borderColor = data.color;

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.style.background = data.color;
    handle.innerHTML = `<h2>${data.name}</h2>`;

    const content = document.createElement("div");
    content.className = "frame-content";

    frame.append(handle, content);
    stage.appendChild(frame);

    frame.addEventListener("mousedown", () => {
        maxZ++;
        frame.style.zIndex = maxZ;
        document.querySelectorAll(".frame").forEach(f => f.classList.remove("active"));
        frame.classList.add("active");
        currentFrame = content;
    });

    enableDrag(frame, handle, true);
    return content;
}

function createButton(col, layer, imgSrc, targetContent = null) {
    const btn = document.createElement("div");
    btn.className = "button";
    btn.dataset.col = col;
    btn.dataset.layer = layer || "";
    
    const label = (layer !== "") ? `L${layer} C${col}` : `COL ${col}`;
    btn.innerHTML = `<img src="${imgSrc}"><div class="btn-badge">${label}</div>`;

    enableDrag(btn, btn, false);
    const parent = targetContent || currentFrame;
    if (parent) parent.appendChild(btn);
}

function enableDrag(el, handle, isFrame) {
    let ox, oy, dragging = false;
    let originalParent = null;
    let nextSibling = null; // Para salvar a ordem original
    let startX, startY, moved = false;

    handle.onmousedown = e => {
        if (!editMode && !isFrame) { triggerResolume(el.dataset.layer, el.dataset.col); return; }
        if (!editMode) return;

        dragging = true; moved = false;
        startX = e.clientX; startY = e.clientY;

        if (!isFrame) {
            originalParent = el.parentElement;
            nextSibling = el.nextSibling; // Salva quem estava depois dele
            
            const rect = el.getBoundingClientRect();
            el.style.position = "fixed";
            el.style.width = rect.width + "px"; el.style.height = rect.height + "px";
            el.style.left = rect.left + "px"; el.style.top = rect.top + "px";
            stage.appendChild(el);
        }
        ox = e.clientX - el.offsetLeft; oy = e.clientY - el.offsetTop;
        el.style.zIndex = 20000;
        e.stopPropagation();
    };

    document.addEventListener("mousemove", e => {
        if (!dragging) return;
        if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) moved = true;
        el.style.left = (e.clientX - ox) + "px"; el.style.top = (e.clientY - oy) + "px";
        trash.classList.toggle("drag-over", e.clientX > trash.offsetLeft && e.clientX < trash.offsetLeft + trash.offsetWidth && e.clientY > trash.offsetTop);
    });

    document.addEventListener("mouseup", e => {
        if (!dragging) return;
        dragging = false;

        const tr = trash.getBoundingClientRect();
        const overTrash = e.clientX > tr.left && e.clientX < tr.right && e.clientY > tr.top && e.clientY < tr.bottom;

        if (overTrash) { el.remove(); return; }

        if (!moved) {
            editingElement = el;
            if (isFrame) openFrameModal(true);
            else {
                // Se foi só um clique, devolve ele para a posição original antes de abrir o modal
                el.style.position = "relative";
                el.style.left = "0"; el.style.top = "0"; el.style.width = ""; el.style.height = "";
                originalParent.insertBefore(el, nextSibling);
                openButtonModal(true);
            }
        } else if (!isFrame) {
            // Se moveu, tenta encontrar novo destino
            el.style.display = "none";
            let dropTarget = document.elementFromPoint(e.clientX, e.clientY);
            el.style.display = "block";
            let targetContent = dropTarget?.closest(".frame-content");
            
            el.style.position = "relative";
            el.style.left = "0"; el.style.top = "0"; el.style.width = ""; el.style.height = "";
            
            if (targetContent) targetContent.appendChild(el);
            else originalParent.insertBefore(el, nextSibling); // Volta para onde estava se soltou no vazio
        }
        trash.classList.remove("drag-over");
    });
}

// --- PERSISTÊNCIA ---
function serializeLayout() {
    return [...document.querySelectorAll(".frame")].map(f => ({
        name: f.querySelector("h2").innerText,
        color: f.querySelector(".drag-handle").style.background,
        left: f.style.left, top: f.style.top,
        width: f.offsetWidth + "px", height: f.offsetHeight + "px",
        buttons: [...f.querySelectorAll(".button")].map(b => ({ col: b.dataset.col, layer: b.dataset.layer, icon: b.querySelector("img").src }))
    }));
}

async function savePresetOverwrite() {
    const name = document.getElementById("presetSelect").value;
    if (!name) return alert("Selecione um preset!");
    await fetch("/presets/save", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name, data: serializeLayout()}) });
    alert("Salvo!");
}

async function savePresetAs() {
    const name = prompt("Nome do novo preset:");
    if (!name) return;
    await fetch("/presets/save", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name, data: serializeLayout()}) });
    refreshPresetList();
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