const express = require("express");
const fs = require("fs");
const path = require("path");
const osc = require("osc");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PRESET_DIR = path.join(__dirname, "presets");
if (!fs.existsSync(PRESET_DIR)) fs.mkdirSync(PRESET_DIR);

// OSC
const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121,
  remoteAddress: "127.0.0.1",
  remotePort: 7000
});
udpPort.open();

/* =====================
   OSC
===================== */
app.post("/column", (req, res) => {
  udpPort.send({
    address: "/composition/columns/" + req.body.column + "/connect",
    args: [{ type: "i", value: 1 }]
  });
  res.sendStatus(200);
});

/* =====================
   ICONS
===================== */
app.get("/icons", (req, res) => {
  fs.readdir("./public/icons", (err, files) => {
    res.json(files || []);
  });
});

/* =====================
   PRESETS
===================== */
app.get("/presets", (req, res) => {
  const files = fs.readdirSync(PRESET_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
  res.json(files);
});

app.post("/presets/save", (req, res) => {
  const { name, data } = req.body;
  if (!name) return res.status(400).send("Nome inválido");

  fs.writeFileSync(
    path.join(PRESET_DIR, name + ".json"),
    JSON.stringify(data, null, 2)
  );

  res.sendStatus(200);
});

app.get("/presets/load/:name", (req, res) => {
  const file = path.join(PRESET_DIR, req.params.name + ".json");
  if (!fs.existsSync(file)) return res.sendStatus(404);

  res.json(JSON.parse(fs.readFileSync(file)));
});

app.listen(3200, () => {
  console.log("Servidor rodando em http://localhost:3200");
});
