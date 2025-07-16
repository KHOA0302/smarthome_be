const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");
const { getFirestore } = require("firebase/firestore"); // N

const firebaseConfig = {
  apiKey: "AIzaSyBtqCfby2M31RN3m_B_dwIUyBs2c90b2cI",
  authDomain: "smarthome-img-storage.firebaseapp.com",
  projectId: "smarthome-img-storage",
  storageBucket: "smarthome-img-storage.firebasestorage.app",
  messagingSenderId: "731354616386",
  appId: "1:731354616386:web:130f45bd1c28a8ec1593db",
};

const app = initializeApp(firebaseConfig);

module.exports = {
  app: app,
  storage: getStorage(app),
  db: getFirestore(app),
};
