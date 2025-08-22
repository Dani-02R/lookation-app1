// Importa las funciones que necesitas
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Configuración de Firebase de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyB1GXC94E-OCRbeeAFJ9pkVzfqP08uhj14",
  authDomain: "lookation-c51ed.firebaseapp.com",
  projectId: "lookation-c51ed",
  storageBucket: "lookation-c51ed.appspot.com",
  messagingSenderId: "677584857229",
  appId: "1:677584857229:web:5415579d976237260a5ac4",
  measurementId: "G-1N41M7E6Y"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Authentication y lo exporta
export const auth = getAuth(app);
