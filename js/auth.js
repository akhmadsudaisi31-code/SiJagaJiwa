/**
 * SIODGJ - Authentication Module
 * Login, Register, Session management using localStorage
 */

const AUTH_STORAGE_KEY = 'siodgj_users';
const SESSION_KEY = 'siodgj_session';

// ============ STORAGE HELPERS ============
// Default accounts to guarantee one account per role
const DEFAULT_USERS = [
  { role: 'pendamping', nama: 'Budi (Pendamping)', username: 'pendamping', password: 'password123', nik: '1234567890123456', hubungan: 'Keluarga', alamat: 'Jl. Merdeka No. 10', no_hp: '081234567890' },
  { role: 'petugas', nama: 'Sari (Petugas)', username: 'petugas', password: 'password123', nip: '198505202010012001', instansi: 'Puskesmas Kokop', no_hp: '081234567891' },
  { role: 'dokter', nama: 'dr. Moslihin', username: 'dokter', password: 'password123', nip: '197501012005011001', spesialisasi: 'Psikiater', no_hp: '081234567892' },
  { role: 'pemegang', nama: 'Kemenkes (Program)', username: 'pemegang', password: 'password123', nip: '198003152008011002', instansi: 'Dinas Kesehatan', jabatan: 'Pemegang Program Jiwa', no_hp: '081234567893' },
  { role: 'admin', nama: 'Admin Utama', username: 'admin', password: 'password123', nip: '000000000000000000', instansi: 'Sistem', jabatan: 'Super Administrator', no_hp: '000000000000' },
  
  // 19 Regional Petugas (One per village)
  { role: 'petugas', nama: 'Petugas Alas Rajah', username: 'petugas_alasrajah', password: 'password123', instansi: 'Puskesmas Alas Rajah', no_hp: '081234567001', desa: 'Alas Rajah' },
  { role: 'petugas', nama: 'Petugas Bates', username: 'petugas_bates', password: 'password123', instansi: 'Puskesmas Bates', no_hp: '081234567002', desa: 'Bates' },
  { role: 'petugas', nama: 'Petugas Blega', username: 'petugas_blega', password: 'password123', instansi: 'Puskesmas Blega', no_hp: '081234567003', desa: 'Blega' },
  { role: 'petugas', nama: 'Petugas Blega Oloh', username: 'petugas_blegaoloh', password: 'password123', instansi: 'Puskesmas Blega Oloh', no_hp: '081234567004', desa: 'Blega Oloh' },
  { role: 'petugas', nama: 'Petugas Gigir', username: 'petugas_gigir', password: 'password123', instansi: 'Puskesmas Gigir', no_hp: '081234567005', desa: 'Gigir' },
  { role: 'petugas', nama: 'Petugas Kajjan', username: 'petugas_kajjan', password: 'password123', instansi: 'Puskesmas Kajjan', no_hp: '081234567006', desa: 'Kajjan' },
  { role: 'petugas', nama: 'Petugas Kampao', username: 'petugas_kampao', password: 'password123', instansi: 'Puskesmas Kampao', no_hp: '081234567007', desa: 'Kampao' },
  { role: 'petugas', nama: 'Petugas Karang Gayam', username: 'petugas_karanggayam', password: 'password123', instansi: 'Puskesmas Karang Gayam', no_hp: '081234567008', desa: 'Karang Gayam' },
  { role: 'petugas', nama: 'Petugas Karang Nangkah', username: 'petugas_karangnangkah', password: 'password123', instansi: 'Puskesmas Karang Nangkah', no_hp: '081234567009', desa: 'Karang Nangkah' },
  { role: 'petugas', nama: 'Petugas Karang Panasan', username: 'petugas_karangpanasan', password: 'password123', instansi: 'Puskesmas Karang Panasan', no_hp: '081234567010', desa: 'Karang Panasan' },
  { role: 'petugas', nama: 'Petugas Karpote', username: 'petugas_karpote', password: 'password123', instansi: 'Puskesmas Karpote', no_hp: '081234567011', desa: 'Karpote' },
  { role: 'petugas', nama: 'Petugas Ko\'olan', username: 'petugas_koolan', password: 'password123', instansi: 'Puskesmas Ko\'olan', no_hp: '081234567012', desa: 'Ko\'olan' },
  { role: 'petugas', nama: 'Petugas Lomaer', username: 'petugas_lomaer', password: 'password123', instansi: 'Puskesmas Lomaer', no_hp: '081234567013', desa: 'Lomaer' },
  { role: 'petugas', nama: 'Petugas Lombang Dajah', username: 'petugas_lombangdajah', password: 'password123', instansi: 'Puskesmas Lombang Dajah', no_hp: '081234567014', desa: 'Lombang Dajah' },
  { role: 'petugas', nama: 'Petugas Lombang Laok', username: 'petugas_lombanglaok', password: 'password123', instansi: 'Puskesmas Lombang Laok', no_hp: '081234567015', desa: 'Lombang Laok' },
  { role: 'petugas', nama: 'Petugas Nyor Manes', username: 'petugas_nyormanes', password: 'password123', instansi: 'Puskesmas Nyor Manes', no_hp: '081234567016', desa: 'Nyor Manes' },
  { role: 'petugas', nama: 'Petugas Pangeran Gedungan', username: 'petugas_pangerangedungan', password: 'password123', instansi: 'Puskesmas Pangeran Gedungan', no_hp: '081234567017', desa: 'Pangeran Gedungan' },
  { role: 'petugas', nama: 'Petugas Panjalinan', username: 'petugas_panjalinan', password: 'password123', instansi: 'Puskesmas Panjalinan', no_hp: '081234567018', desa: 'Panjalinan' },
  { role: 'petugas', nama: 'Petugas Rosep', username: 'petugas_rosep', password: 'password123', instansi: 'Puskesmas Rosep', no_hp: '081234567019', desa: 'Rosep' },

  // Regional Caregivers (Pendamping) - 19 Villages with Specific Identities
  { role: 'pendamping', nama: 'Ibu Siti Rahayu', username: 'keluarga_alasrajah', password: 'password123', nik: '3526010101750002', hubungan: 'Istri', alamat: 'Desa Alas Rajah', no_hp: '081234568001' },
  { role: 'pendamping', nama: 'Bapak Ahmad Hidayat', username: 'keluarga_bates', password: 'password123', nik: '3526010101750003', hubungan: 'Suami', alamat: 'Desa Bates', no_hp: '081234568002' },
  { role: 'pendamping', nama: 'Sdr. Budi Santoso', username: 'keluarga_blega', password: 'password123', nik: '3526010101750004', hubungan: 'Anak', alamat: 'Desa Blega', no_hp: '081234568003' },
  { role: 'pendamping', nama: 'Ibu Laila Sari', username: 'keluarga_blegaoloh', password: 'password123', nik: '3526010101750005', hubungan: 'Istri', alamat: 'Desa Blega Oloh', no_hp: '081234568004' },
  { role: 'pendamping', nama: 'Bapak Agus Setiawan', username: 'keluarga_gigir', password: 'password123', nik: '3526010101750006', hubungan: 'Suami', alamat: 'Desa Gigir', no_hp: '081234568005' },
  { role: 'pendamping', nama: 'Sdri. Rina Marlina', username: 'keluarga_kajjan', password: 'password123', nik: '3526010101750007', hubungan: 'Anak', alamat: 'Desa Kajjan', no_hp: '081234568006' },
  { role: 'pendamping', nama: 'Bapak Yusuf Mansur', username: 'keluarga_kampao', password: 'password123', nik: '3526010101750008', hubungan: 'Ayah', alamat: 'Desa Kampao', no_hp: '081234568007' },
  { role: 'pendamping', nama: 'Ibu Sri Wahyuni', username: 'keluarga_karanggayam', password: 'password123', nik: '3526010101750009', hubungan: 'Ibu', alamat: 'Desa Karang Gayam', no_hp: '081234568008' },
  { role: 'pendamping', nama: 'Bapak Bambang Heru', username: 'keluarga_karangnangkah', password: 'password123', nik: '3526010101750010', hubungan: 'Suami', alamat: 'Desa Karang Nangkah', no_hp: '081234568009' },
  { role: 'pendamping', nama: 'Ibu Ani Sumarni', username: 'keluarga_karangpanasan', password: 'password123', nik: '3526010101750011', hubungan: 'Istri', alamat: 'Desa Karang Panasan', no_hp: '081234568010' },
  { role: 'pendamping', nama: 'Sdr. Dedi Kurniawan', username: 'keluarga_karpote', password: 'password123', nik: '3526010101750012', hubungan: 'Anak', alamat: 'Desa Karpote', no_hp: '081234568011' },
  { role: 'pendamping', nama: 'Sdri. Evi Rosita', username: 'keluarga_koolan', password: 'password123', nik: '3526010101750013', hubungan: 'Anak', alamat: 'Desa Ko\'olan', no_hp: '081234568012' },
  { role: 'pendamping', nama: 'Bapak Toto Handoko', username: 'keluarga_lomaer', password: 'password123', nik: '3526010101750014', hubungan: 'Suami', alamat: 'Desa Lomaer', no_hp: '081234568013' },
  { role: 'pendamping', nama: 'Ibu Wiwin Setyawati', username: 'keluarga_lombangdajah', password: 'password123', nik: '3526010101750015', hubungan: 'Istri', alamat: 'Desa Lombang Dajah', no_hp: '081234568014' },
  { role: 'pendamping', nama: 'Sdr. Udin Jaelani', username: 'keluarga_lombanglaok', password: 'password123', nik: '3526010101750016', hubungan: 'Anak', alamat: 'Desa Lombang Laok', no_hp: '081234568015' },
  { role: 'pendamping', nama: 'Sdri. Vera Puspita', username: 'keluarga_nyormanes', password: 'password123', nik: '3526010101750017', hubungan: 'Anak', alamat: 'Desa Nyor Manes', no_hp: '081234568016' },
  { role: 'pendamping', nama: 'Bapak Wawan Bakri', username: 'keluarga_pangerangedungan', password: 'password123', nik: '3526010101750018', hubungan: 'Suami', alamat: 'Desa Pangeran Gedungan', no_hp: '081234568017' },
  { role: 'pendamping', nama: 'Ibu Yani Fitri', username: 'keluarga_panjalinan', password: 'password123', nik: '3526010101750019', hubungan: 'Ibu', alamat: 'Desa Panjalinan', no_hp: '081234568018' },
  { role: 'pendamping', nama: 'Bapak Rudi Hartono', username: 'keluarga_rosep', password: 'password123', nik: '3526010101750020', hubungan: 'Suami', alamat: 'Desa Rosep', no_hp: '081234568019' }
];

async function seedDefaultUsers() {
  if (localStorage.getItem('seed_v8')) return;

  console.log("Seeding default users (background)...");
  
  // Process in parallel chunks to save time
  const chunkSize = 5;
  for (let i = 0; i < DEFAULT_USERS.length; i += chunkSize) {
    const chunk = DEFAULT_USERS.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (u) => {
      try {
        const dummyEmail = u.username + DUMMY_DOMAIN;
        try {
          await auth.createUserWithEmailAndPassword(dummyEmail, u.password);
        } catch (ae) { /* Ignore existing */ }
        
        const profile = { ...u };
        delete profile.password;
        await db.collection('users').doc(u.username).set(profile);
      } catch (err) {
        console.error("Failed to seed user:", u.username, err);
      }
    }));
  }
  localStorage.setItem('seed_v8', 'true');
}

function getCurrentSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (e) {
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ============ AUTH FUNCTIONS ============
const DUMMY_DOMAIN = "@sijiwa-login.com";

async function registerUser(role, formData) {
  try {
    const username = formData.username;
    const dummyEmail = username + DUMMY_DOMAIN;
    const password = formData.password;

    // 1. Check if username is already registered (Firestore)
    const userDocRef = db.collection('users').doc(username);
    const doc = await userDocRef.get();

    if (doc.exists) {
      return { success: false, error: 'Username sudah terdaftar! Gunakan username lain.' };
    }

    // 2. Validate password
    if (password !== formData.password_confirm) {
      return { success: false, error: 'Password dan konfirmasi password tidak cocok!' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter!' };
    }

    // 3. Create Firebase Auth User
    const userCredential = await auth.createUserWithEmailAndPassword(dummyEmail, password);
    const firebaseUser = userCredential.user;

    // 4. Save metadata to Firestore
    const userProfile = {
      id: Date.now(),
      uid: firebaseUser.uid,
      role: role,
      ...formData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    delete userProfile.password;
    delete userProfile.password_confirm;

    await userDocRef.set(userProfile);
    
    // We log out immediately because they should log in again via the normal flow
    await auth.signOut();
    
    return { success: true, user: userProfile };
  } catch (error) {
    console.error("Error registering user: ", error);
    if(error.code === 'auth/email-already-in-use') {
       return { success: false, error: 'Username sudah terdaftar di sistem Auth!' };
    }
    return { success: false, error: 'Gagal melakukan pendaftaran. Coba lagi.' };
  }
}

async function loginUser(username, password) {
  try {
    const dummyEmail = username + DUMMY_DOMAIN;
    
    // 1. Authenticate with Firebase Auth
    await auth.signInWithEmailAndPassword(dummyEmail, password);

    // 2. Fetch User Profile from Firestore to get Role and Details
    const userDocRef = db.collection('users').doc(username);
    const doc = await userDocRef.get();

    if (!doc.exists) {
      await auth.signOut(); // Rollback auth if profile missing
      return { success: false, error: 'Data profil pengguna tidak ditemukan!' };
    }
    
    const user = doc.data();
    saveSession(user);

    return { success: true, user };
  } catch (error) {
    console.error("Error logging in: ", error);
    if(error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
       return { success: false, error: 'Username atau password salah!' };
    }
    return { success: false, error: 'Gagal masuk. Coba lagi: ' + error.message };
  }
}

async function logoutUser() {
  try {
    await auth.signOut();
    if (typeof stopGlobalRealTimeSync === 'function') stopGlobalRealTimeSync();
    document.getElementById('app').classList.remove('show');
    document.getElementById('role-select').classList.remove('hide');
    document.getElementById('auth-page').classList.remove('show');
    showToast('👋 Anda telah keluar dari sistem', 'success');
  } catch(error) {
    console.error("Error signing out:", error);
    showToast('Gagal logout', 'error');
  }
}

// ============ AUTH PAGE RENDERING ============
function showAuthPage(role) {
  const authPage = document.getElementById('auth-page');
  const roleInfo = ROLE_INFO[role];

  // Set header info
  document.getElementById('auth-icon').textContent = roleInfo.icon;
  document.getElementById('auth-role-title').textContent = roleInfo.label;
  document.getElementById('auth-role-subtitle').textContent = `Masuk atau daftar sebagai ${roleInfo.label}`;

  // Store selected role
  authPage.dataset.role = role;

  // Build registration form
  buildRegisterForm(role);

  // Reset to login tab
  switchAuthTab('login');

  // Show auth page
  authPage.classList.add('show');
}

function switchAuthTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  // Update form visibility
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`form-${tab}`).classList.add('active');

  // Clear errors
  clearAuthErrors();
}

function clearAuthErrors() {
  document.querySelectorAll('.form-error').forEach(e => {
    e.classList.remove('show');
    e.textContent = '';
  });
  document.querySelectorAll('.form-input.error, .form-select.error').forEach(e => {
    e.classList.remove('error');
  });
}

function buildRegisterForm(role) {
  const fields = REGISTER_FIELDS[role];
  if (!fields) return;

  const container = document.getElementById('register-fields');
  container.innerHTML = '';

  // Group fields in rows of 2 where possible
  let i = 0;
  while (i < fields.length) {
    const field = fields[i];
    const nextField = fields[i + 1];

    // Full-width fields
    if (field.type === 'textarea' || field.name === 'alamat') {
      container.innerHTML += buildFieldHTML(field);
      i++;
    }
    // Two-column row for short fields
    else if (nextField && nextField.type !== 'textarea' && nextField.name !== 'alamat') {
      container.innerHTML += `<div class="form-row">${buildFieldHTML(field)}${buildFieldHTML(nextField)}</div>`;
      i += 2;
    }
    // Single field
    else {
      container.innerHTML += buildFieldHTML(field);
      i++;
    }
  }
}

function buildFieldHTML(field) {
  let inputHTML = '';

  switch (field.type) {
    case 'select':
      inputHTML = `<select class="form-select" id="reg-${field.name}" ${field.required ? 'required' : ''}>
        <option value="">-- Pilih --</option>
        ${field.options.map(o => `<option value="${o}">${o}</option>`).join('')}
      </select>`;
      break;
    case 'textarea':
      inputHTML = `<textarea class="form-textarea" id="reg-${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
      break;
    case 'password':
      inputHTML = `<div class="password-wrapper">
        <input class="form-input" type="password" id="reg-${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>
        <button type="button" class="password-toggle" onclick="togglePasswordVisibility('reg-${field.name}', this)">👁️</button>
      </div>`;
      break;
    default:
      inputHTML = `<input class="form-input" type="${field.type}" id="reg-${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
  }

  return `<div class="form-group">
    <label class="form-label">${field.label}${field.required ? ' *' : ''}</label>
    ${inputHTML}
    <div class="form-error" id="err-${field.name}"></div>
  </div>`;
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// ============ FORM HANDLERS ============
async function handleLogin(e) {
  e.preventDefault();
  clearAuthErrors();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showAuthError('login-error', 'Username dan password harus diisi!');
    return;
  }

  const result = await loginUser(username, password);
  if (result.success) {
    const user = result.user;
    
    // Strict role check: user.role must match currentRole (the one selected in role-select)
    // admin and superadmin bypass this (placeholder for superadmin if name suggests so)
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    
    if (!isAdmin && user.role !== currentRole) {
      await auth.signOut();
      clearSession();
      showAuthError('login-error', `❌ Akses ditolak: Akun Anda terdaftar sebagai ${ROLE_INFO[user.role]?.label || user.role}, bukan ${ROLE_INFO[currentRole]?.label || currentRole}.`);
      return;
    }

    document.getElementById('auth-page').classList.remove('show');
    enterApp(user.role, user.nama, ROLE_INFO[user.role]?.icon || '👤');
    showToast(`✅ Selamat datang kembali, ${user.nama}!`, 'success');
  } else {
    showAuthError('login-error', result.error);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearAuthErrors();

  const role = document.getElementById('auth-page').dataset.role;
  const fields = REGISTER_FIELDS[role];
  const formData = {};
  let hasError = false;

  // Collect and validate form data
  fields.forEach(field => {
    const el = document.getElementById(`reg-${field.name}`);
    if (!el) return;

    const value = el.value.trim();
    formData[field.name] = value;

    if (field.required && !value) {
      showFieldError(field.name, `${field.label} harus diisi!`);
      el.classList.add('error');
      hasError = true;
    }
  });

  if (hasError) return;

  // Validate NIK (16 digits)
  if (formData.nik && formData.nik.length !== 16) {
    showFieldError('nik', 'NIK harus 16 digit!');
    hasError = true;
  }

  // Validate phone
  if (formData.no_hp && !/^08\d{8,12}$/.test(formData.no_hp)) {
    showFieldError('no_hp', 'Format No. HP tidak valid! (contoh: 08xxxxxxxxxx)');
    hasError = true;
  }

  if (hasError) return;

  const result = await registerUser(role, formData);
  if (result.success) {
    showToast(`✅ Akun ${ROLE_INFO[role]?.label} berhasil dibuat! Silakan login.`, 'success');
    // Switch to login tab and prefill username
    switchAuthTab('login');
    document.getElementById('login-username').value = formData.username;
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  } else {
    showAuthError('register-error', result.error);
  }
}

function showAuthError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

function showFieldError(fieldName, message) {
  const el = document.getElementById(`err-${fieldName}`);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

function goBackToRoleSelect() {
  document.getElementById('auth-page').classList.remove('show');
  document.getElementById('role-select').classList.remove('hide');
}
