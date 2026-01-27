const stage = document.getElementById("stage");
const trash = document.getElementById("trash");
let currentFrame = null;
let editMode = false;
let maxZ = 100;

// --- DISPARO RESOLUME (CORS BYPASS VIA NO-CORS) ---
async function triggerResolume(layer, col) {
    const RESOLUME_API = "http://127.0.0.1:8080/api/v1";
    let url = (layer && layer.trim() !== "") 
        ? `${RESOLUME_API}/composition/layers/${layer}/clips/${col}/connect`
        : `${RESOLUME_API}/composition/columns/${col}/connect`;

    try {
        await fetch(url, { method: 'POST', mode: 'no-cors' });
    } catch (e) {
        console.error("Erro ao conectar com Resolume.");
    }
}

// --- CONTROLE DE INTERFACE ---
document.getElementById("editToggle").onclick = () => {
    editMode = !editMode;
    document.body.classList.toggle("edit-mode", editMode);
    trash.classList.toggle("hidden", !editMode);
    document.getElementById("editToggle").innerText = editMode ? "▶ SHOW" : "⚙️ EDIT";
};

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function openFrameModal() { document.getElementById("frameModal").classList.remove("hidden"); }

async function openButtonModal() {
    if (!currentFrame) return alert("Selecione um Frame clicando nele primeiro!");
    
    const grid = document.getElementById("iconGrid");
    grid.innerHTML = "Carregando...";
    document.getElementById("buttonModal").classList.remove("hidden");
    
    try {
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
    } catch (e) {
        grid.innerHTML = "Erro ao carregar ícones.";
    }
}

// --- CRIAÇÃO DE ELEMENTOS ---
function createFrame(data = null) {
    const name = data ? data.name : document.getElementById("frameName").value;
    const color = data ? data.color : document.getElementById("frameColor").value;
    
    const frame = document.createElement("div");
    frame.className = "frame";
    
    // Posição e Tamanho
    frame.style.left = data ? data.left : "100px";
    frame.style.top = data ? data.top : "100px";
    frame.style.width = data ? data.width : "300px";
    frame.style.height = data ? data.height : "200px";
    frame.style.borderColor = color;

    // Alça para arrastar (Handle)
    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.style.background = color;
    handle.innerHTML = `<h2>${name}</h2>`;

    const content = document.createElement("div");
    content.className = "frame-content";

    frame.append(handle, content);
    stage.appendChild(frame);

    // Seleção e Gerenciamento de Camadas (z-index)
    frame.addEventListener("mousedown", () => {
        maxZ++;
        frame.style.zIndex = maxZ;
        document.querySelectorAll(".frame").forEach(f => f.classList.remove("active"));
        frame.classList.add("active");
        currentFrame = content;
    });

    enableDrag(frame, handle);
    if(!data) closeModal("frameModal");
    return content;
}

function createButton(col, layer, imgSrc, targetContent = null) {
    const btn = document.createElement("div");
    btn.className = "button";
    btn.dataset.col = col;
    btn.dataset.layer = layer || "";
    
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

    enableDrag(btn, btn); // Botões também podem ser arrastados para o lixo
    const parent = targetContent || currentFrame;
    if (parent) parent.appendChild(btn);
}

// --- LÓGICA DE ARRASTAR ---
function enableDrag(el, handle) {
    let ox, oy, dragging = false;
    
    handle.onmousedown = e => {
        if (!editMode) return;
        dragging = true;
        ox = e.clientX - el.offsetLeft;
        oy = e.clientY - el.offsetTop;
        e.stopPropagation();
    };

    document.addEventListener("mousemove", e => {
        if (!dragging) return;
        el.style.left = (e.clientX - ox) + "px";
        el.style.top = (e.clientY - oy) + "px";

        // Feedback visual da lixeira
        const tr = trash.getBoundingClientRect();
        const overTrash = e.clientX > tr.left && e.clientX < tr.right && e.clientY > tr.top && e.clientY < tr.bottom;
        trash.classList.toggle("drag-over", overTrash);
    });

    document.addEventListener("mouseup", e => {
        if (!dragging) return;
        dragging = false;

        const tr = trash.getBoundingClientRect();
        if (e.clientX > tr.left && e.clientX < tr.right && e.clientY > tr.top && e.clientY < tr.bottom) {
            el.remove();
        }
        trash.classList.remove("drag-over");
    });
}

// --- PERSISTÊNCIA (PRESETS) ---
function serializeLayout() {
    return [...document.querySelectorAll(".frame")].map(f => ({
        name: f.querySelector("h2").innerText,
        color: f.querySelector(".drag-handle").style.background,
        left: f.style.left,
        top: f.style.top,
        width: f.offsetWidth + "px",
        height: f.offsetHeight + "px",
        buttons: [...f.querySelectorAll(".button")].map(b => ({ 
            col: b.dataset.col, 
            layer: b.dataset.layer, 
            icon: b.querySelector("img").src 
        }))
    }));
}

async function savePresetAs() {
    const name = prompt("Nome do novo preset:");
    if (!name) return;
    const data = serializeLayout();
    await fetch("/presets/save", { 
        method: "POST", 
        headers: {"Content-Type":"application/json"}, 
        body: JSON.stringify({name, data}) 
    });
    refreshPresetList();
}

async function savePresetOverwrite() {
    const name = document.getElementById("presetSelect").value;
    if (!name) return alert("Selecione um preset para salvar.");
    const data = serializeLayout();
    await fetch("/presets/save", { 
        method: "POST", 
        headers: {"Content-Type":"application/json"}, 
        body: JSON.stringify({name, data}) 
    });
    alert("Preset atualizado!");
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