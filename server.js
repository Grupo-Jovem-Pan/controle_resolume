const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PRESET_DIR = path.join(__dirname, "presets");
if (!fs.existsSync(PRESET_DIR)) fs.mkdirSync(PRESET_DIR);

// --- ROTAS DE ARQUIVOS (Icons e Presets) ---
app.get("/icons", (req, res) => {
  fs.readdir("./public/icons", (err, files) => res.json(files || []));
});

app.get("/presets", (req, res) => {
  const files = fs.readdirSync(PRESET_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
  res.json(files);
});

app.post("/presets/save", (req, res) => {
  const { name, data } = req.body;
  fs.writeFileSync(path.join(PRESET_DIR, name + ".json"), JSON.stringify(data, null, 2));
  res.sendStatus(200);
});

app.get("/presets/load/:name", (req, res) => {
  const file = path.join(PRESET_DIR, req.params.name + ".json");
  if (!fs.existsSync(file)) return res.sendStatus(404);
  res.json(JSON.parse(fs.readFileSync(file)));
});

// Porta original 3200
app.listen(3200, () => console.log("Servidor de Presets em http://localhost:3200"));