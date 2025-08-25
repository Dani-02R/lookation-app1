const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conectar a Firebase
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lookation-c51ed.firebaseio.com",
});
const db = admin.firestore();

// Configurar correo
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "lookationservices@gmail.com",
    pass: "yoslhasvedphdkmi",
  },
});

// Enviar código
app.post("/send-code", async (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await db.collection("passwordCodes").doc(email).set({
    code,
    createdAt: Date.now(),
  });

  await transporter.sendMail({
    from: "Soporte de lookation 🏢🔵 <lookationservices@gmail.com>",
    to: email,
    subject: "Código de verificación para cambio de contraseña",
    text: `Tu código es: ${code}`,
  });

  res.send({ message: "Código enviado" });
});

// Verificar código
app.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;
  const doc = await db.collection("passwordCodes").doc(email).get();

  if (!doc.exists) {
    return res.status(400).send({ valid: false, message: "No hay código para este correo" });
  }

  const { code: savedCode } = doc.data();

  if (savedCode === code) {
    return res.send({ valid: true, message: "Código correcto" });
  } else {
    return res.status(400).send({ valid: false, message: "Código incorrecto" });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://192.168.1.24:3000");
});

