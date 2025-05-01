// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAxQse7GJBW4lZ8eHN9Br94Xw1-yYeLGoI",
  authDomain: "tenjikai-system.firebaseapp.com",
  projectId: "tenjikai-system",
  storageBucket: "tenjikai-system.firebasestorage.app",
  messagingSenderId: "1078677845919",
  appId: "1:1078677845919:web:303878cb255e5a7e3a6faa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
