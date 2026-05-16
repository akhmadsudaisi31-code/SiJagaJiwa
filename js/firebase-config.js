const firebaseConfig = {
  // TODO: Replace with your actual Firebase project configuration
  apiKey: "AIzaSyA5OLOp2l4yv-fjquaSc4XlA8EG5mKS8NQ",
  authDomain: "sijagajiwa.firebaseapp.com",
  projectId: "sijagajiwa",
  storageBucket: "sijagajiwa.firebasestorage.app",
  messagingSenderId: "390090253303",
  appId: "1:390090253303:web:8b7810f6b0d27b2d4584f2",
  measurementId: "G-DXZMNJMK3Q"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const analytics = firebase.analytics();

// Enable offline persistence (multi-tab safe)
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — only one tab can use persistence at a time
    console.warn('[Firestore] Persistence disabled: multiple tabs detected.');
  } else if (err.code === 'unimplemented') {
    console.warn('[Firestore] Persistence not supported in this browser.');
  }
});
