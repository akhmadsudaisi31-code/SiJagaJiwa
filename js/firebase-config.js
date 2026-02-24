const firebaseConfig = {
  // TODO: Replace with your actual Firebase project configuration
  apiKey: "AIzaSyA5OLOp2l4yv-fjquaSc4XlA8EG5mKS8NQ",
  authDomain: "sijagajiwa.firebaseapp.com",
  projectId: "sijagajiwa",
  storageBucket: "sijagajiwa.firebasestorage.app",
  messagingSenderId: "390090253303",
  appId: "1:390090253303:web:8b7810f6b0d27b2d4584f2"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Optional: Enable offline persistence
db.enablePersistence().catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
  } else if (err.code == 'unimplemented') {
    console.warn("The current browser does not support all of the features required to enable persistence.");
  }
});
