/**
 * SIODGJ - Page Render Functions
 * All page-specific rendering logic
 */

// ============ DASHBOARD ============
function renderDashboardPatients() {
  const session = getCurrentSession();
  const el = document.getElementById('dashboard-patients');
  let displayPatients = PATIENTS;
  
  if (currentRole === 'dokter') {
    displayPatients = PATIENTS.filter(p => p.assignedDoctorId === session?.username);
  }
  
  el.innerHTML = displayPatients.map(p => patientHTML(p)).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);">Tidak ada pasien yang ditugaskan kepada Anda</div>';

  // Update Stats Widgets
  const totalPasienEl = document.getElementById('stat-pasien-total');
  const totalPasienChangeEl = document.getElementById('stat-pasien-change');
  if (totalPasienEl) totalPasienEl.textContent = displayPatients.length;
  if (totalPasienChangeEl) totalPasienChangeEl.textContent = `Total terdaftar`;

  const pmoTotalEl = document.getElementById('stat-pmo-total');
  const pmoChangeEl = document.getElementById('stat-pmo-change');
  if (pmoTotalEl) {
    const totalDoses = displayPatients.length * 3;
    const donePmo = displayPatients.reduce((sum, p) => sum + (p.pmo_sessions || [false, false, false]).filter(s => s).length, 0);
    pmoTotalEl.textContent = displayPatients.length; 
    if (pmoChangeEl) pmoChangeEl.textContent = `${donePmo} dosis selesai hari ini`;
  }

  const stokKritisEl = document.getElementById('stat-stok-kritis');
  const stokChangeEl = document.getElementById('stat-stok-change');
  if (stokKritisEl) {
    const lowStock = DRUGS.filter(d => d.stok < d.min).length;
    stokKritisEl.textContent = lowStock;
    if (stokChangeEl) stokChangeEl.textContent = lowStock > 0 ? `${lowStock} obat perlu restock` : 'Stok aman';
  }

  const jemputTotalEl = document.getElementById('stat-jemput-total');
  const jemputChangeEl = document.getElementById('stat-jemput-change');
  if (jemputTotalEl) {
    const totalPickups = PICKUPS.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPickups = PICKUPS.filter(p => p.date === 'Hari Ini' || p.date === todayStr).length;
    
    jemputTotalEl.textContent = totalPickups;
    if (jemputChangeEl) jemputChangeEl.textContent = todayPickups > 0 ? `${todayPickups} jadwal hari ini` : (totalPickups > 0 ? 'Tidak ada jadwal hari ini' : 'Belum ada jadwal');
  }
}

function patientHTML(p) {
  const statusMap = { stable:'status-stable', monitor:'status-monitor', critical:'status-critical' };
  const statusLabel = { stable:'Stabil', monitor:'Perlu Pantau', critical:'Kritis' };
  
  let consultationBtn = '';
  if (currentRole === 'pemegang' && !p.assignedDoctorId) {
    consultationBtn = `<button class="btn btn-sm" style="background:var(--primary);color:white;font-size:10px;padding:4px 8px;margin-top:8px;border-radius:6px;" onclick="event.stopPropagation();openConsultationModal('${p.firebaseId}', '${p.name}')">🩺 Kirim ke Dokter</button>`;
  } else if (p.assignedDoctorId) {
    consultationBtn = `<div style="font-size:10px;color:var(--success);margin-top:6px;font-weight:600;">👨‍⚕️ Ditangani: ${p.assignedDoctorName || 'Dokter'}</div>`;
    if (currentRole === 'dokter' && p.assignedDoctorId === getCurrentSession()?.username) {
        consultationBtn += `
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button class="btn btn-sm" style="background:var(--warning);color:black;font-size:10px;padding:4px 8px;border-radius:6px;flex:1;" onclick="event.stopPropagation();updatePatientStatusFirestore('${p.firebaseId}', 'monitor')">🩺 Pantau</button>
            <button class="btn btn-sm" style="background:var(--success);color:white;font-size:10px;padding:4px 8px;border-radius:6px;flex:1;" onclick="event.stopPropagation();completeDoctorConsultation('${p.firebaseId}')">✅ Selesai</button>
          </div>
        `;
    }
  }

  return `<div class="patient-item" onclick="showPatientDetail(${p.id})">
    <div class="p-avatar">${p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
    <div class="p-info">
      <div class="p-name">${p.name}</div>
      <div class="p-meta">${p.gender}, ${p.age}th • ${p.diagnosis}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">📍 ${p.alamat}</div>
      ${consultationBtn}
    </div>
    <span class="p-status ${statusMap[p.status]}">${statusLabel[p.status]}</span>
  </div>`;
}

function showPatientDetail(id) {
  const p = PATIENTS.find(x => x.id === id);
  if (!p) return;
  document.getElementById('detail-avatar').textContent = p.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-meta').textContent = `${p.gender === 'L' ? 'Laki-laki' : 'Perempuan'}, ${p.age} tahun • ${p.diagnosis}`;
  document.getElementById('detail-info').innerHTML = `
    <div class="report-row"><div class="report-label">NIK</div><div class="report-val" style="font-size:12px">${p.nik}</div></div>
    <div class="report-row"><div class="report-label">Alamat</div><div class="report-val" style="font-size:12px;text-align:right">${p.alamat}</div></div>
    <div class="report-row"><div class="report-label">Pendamping</div><div class="report-val">${p.pendamping}</div></div>
  `;
  document.getElementById('detail-drugs').innerHTML = `
    <div style="background:var(--bg);padding:12px;border-radius:10px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:700;">${p.obat}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">3x sehari sesudah makan</div>
    </div>
  `;
  document.getElementById('detail-pmo-status').innerHTML = `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:600;">Kepatuhan</span>
        <span style="font-size:13px;font-weight:800;color:var(--primary);">${p.pmo}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.pmo}%"></div></div>
    </div>
    <div class="report-row"><div class="report-label">Pagi</div><div class="report-val">✅ Sudah</div></div>
    <div class="report-row"><div class="report-label">Siang</div><div class="report-val">✅ Sudah</div></div>
    <div class="report-row"><div class="report-label">Malam</div><div class="report-val" style="color:var(--warning)">⏳ Belum</div></div>
  `;

  // Role-based action buttons
  const editBtn = document.getElementById('btn-edit-pasien');
  const deleteBtn = document.getElementById('btn-hapus-pasien');
  const consBtn = document.getElementById('btn-konsultasi-pasien');
  
  const hasFullAccess = (currentRole === 'pemegang' || currentRole === 'petugas' || currentRole === 'admin');
  
  if (editBtn) editBtn.style.display = hasFullAccess ? 'block' : 'none';
  if (deleteBtn) deleteBtn.style.display = (currentRole === 'pemegang' || currentRole === 'admin') ? 'block' : 'none';
  if (consBtn) consBtn.style.display = (currentRole === 'pemegang' || currentRole === 'admin') ? 'block' : 'none';

  showPage('patient-detail');
}

function renderDashboardPMO() {
  const session = getCurrentSession();
  const el = document.getElementById('dashboard-pmo');
  // Group by patient to show patient-centric view
  let patientsWithPmo = PATIENTS.filter(p => p.obat); 
  
  el.innerHTML = patientsWithPmo.slice(0, 4).map(p => {
    const doneCount = (p.pmo_sessions || [false, false, false]).filter(c => c).length;
    return `
      <div class="pmo-item" onclick="viewPmoDetails('${p.name}')">
        <div class="pmo-avatar" style="background:var(--primary-light);color:var(--primary);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">${p.name[0]}</div>
        <div style="flex:1; margin-left:12px;">
          <div class="pmo-patient" style="font-weight:700;font-size:13px;">${p.name}</div>
          <div class="pmo-drug" style="font-size:11px;color:var(--text-muted);">${p.obat}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;font-weight:800;color:var(--primary);">${doneCount}/3</div>
          <div style="font-size:10px;color:var(--text-muted);">Dosis Hari Ini</div>
        </div>
      </div>
    `;
  }).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Belum ada jadwal PMO</div>';
}

function togglePMO(btn, i) {
  btn.classList.toggle('checked');
  btn.textContent = btn.classList.contains('checked') ? '✓' : '';
  showToast(btn.classList.contains('checked') ? '✅ PMO berhasil dicatat!' : '↩ PMO dibatalkan', btn.classList.contains('checked') ? 'success' : '');
}

let dashboardChartInstance = null;

function renderBarChart() {
  const ctx = document.getElementById('dashboardChart');
  if (!ctx || !window.Chart) return;

  if (dashboardChartInstance) {
    dashboardChartInstance.destroy();
  }

  const days = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const barData = [18, 24, 20, 31, 27, 15, 22]; // Kunjungan
  const lineData = [150, 155, 152, 160, 158, 145, 147]; // Total Pasien Aktif (contoh tren)

  dashboardChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Total Pasien',
          type: 'line',
          data: lineData,
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y1'
        },
        {
          label: 'Kunjungan',
          data: barData,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderRadius: 6,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          position: 'left',
          grid: { display: false },
          title: { display: true, text: 'Kunjungan', font: { size: 10 } }
        },
        y1: {
          beginAtZero: false,
          position: 'right',
          grid: { display: false },
          title: { display: true, text: 'Total', font: { size: 10 } }
        }
      }
    }
  });
}

function renderStockAlerts() {
  const el = document.getElementById('stock-alerts');
  const critical = DRUGS.filter(d => d.stok < d.min);
  el.innerHTML = critical.map(d => `
    <div class="stock-alert" style="margin-bottom:10px;">
      <div class="alert-icon">📦</div>
      <div class="alert-text">
        <div class="alert-title">${d.name}</div>
        <div class="alert-sub">Sisa ${d.stok} tablet (min: ${d.min})</div>
      </div>
      <button class="alert-action" onclick="showPage('stok-obat')">Restock</button>
    </div>
  `).join('') || '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px;">✅ Semua stok dalam kondisi baik</div>';
}

// ============ FULL PATIENTS ============
async function renderFullPatients() {
  const session = getCurrentSession();
  const el = document.getElementById('full-patient-list');
  const pmoPasienList = document.getElementById('pmo-pasien-list');
  const pmoObatList = document.getElementById('pmo-obat-list');
  const jadwalSel = document.getElementById('jadwal-pasien-select');
  
  let displayPatients = PATIENTS;
  
  if (currentRole === 'dokter') {
    displayPatients = PATIENTS.filter(p => p.assignedDoctorId === session?.username);
  }
  
  if (el) el.innerHTML = displayPatients.map(p => patientHTML(p)).join('');
  
  if (pmoPasienList) {
    pmoPasienList.innerHTML = PATIENTS.map(p => `<option value="${p.name}">`).join('');
  }
  if (pmoObatList) {
    pmoObatList.innerHTML = DRUGS.map(d => `<option value="${d.name}">`).join('');
  }
  
  // Also handle the stock form if it uses the same list or dedicated one
  const stokNamaList = document.getElementById('stok-nama-list');
  if (stokNamaList) {
    stokNamaList.innerHTML = DRUGS.map(d => `<option value="${d.name}">`).join('');
  }
  
  const jadwalList = document.getElementById('jadwal-pasien-list');
  if (jadwalList) {
    jadwalList.innerHTML = PATIENTS.map(p => `<option value="${p.name}">`).join('');
  }

  // Populate Caregiver Datalist for Schedule
  const pjList = document.getElementById('jadwal-pj-list');
  if (pjList) {
    try {
      const snap = await db.collection('users').where('role', 'in', ['pendamping', 'petugas']).get();
      let html = '';
      if (snap.empty) {
        html += '<option value="Budi (Pendamping)">';
      } else {
        const caregivers = [];
        snap.forEach(doc => caregivers.push({ id: doc.id, ...doc.data() }));
        caregivers.sort((a, b) => a.nama.localeCompare(b.nama));
        
        caregivers.forEach(u => {
          const detail = u.alamat || u.desa || u.instansi || 'Caregiver';
          html += `<option value="${u.nama}">${detail}</option>`;
        });
      }
      pjList.innerHTML = html;
    } catch (e) {
      console.error("Failed to fetch caregivers:", e);
      pjList.innerHTML = '<option value="Budi (Pendamping)">';
    }
  }

  // Restrict Add Patient button

  // Restrict Add Patient button
  const addBtn = document.getElementById('btn-tambah-pasien');
  if (addBtn) {
    addBtn.style.display = (currentRole === 'pemegang' || currentRole === 'petugas' || currentRole === 'admin') ? 'block' : 'none';
  }
}

function filterPatients(q) {
  const el = document.getElementById('full-patient-list');
  const filtered = PATIENTS.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) || p.diagnosis.toLowerCase().includes(q.toLowerCase())
  );
  el.innerHTML = filtered.length
    ? filtered.map(p => patientHTML(p)).join('')
    : '<div style="text-align:center;padding:32px;color:var(--text-muted);">Pasien tidak ditemukan</div>';
}

// ============ PMO FULL ============
function renderPMOFull() {
  const session = getCurrentSession();
  const el = document.getElementById('pmo-full-list');
  const el2 = document.getElementById('pmo-compliance');
  let displayPatients = PATIENTS;

  // Broadened Visibility (as requested): Show ALL patients in Monitor PMO

  const items = displayPatients.map(p => ({
    patient: p.name, drug: p.obat, pmo: p.pmo,
    sessions: ['Pagi', 'Siang', 'Malam'],
    checks: p.pmo_sessions || [false, false, false]
  }));

  el.innerHTML = items.map((item, i) => `
    <div style="padding:12px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <div style="font-size:13px;font-weight:700;">${item.patient}</div>
        <button class="btn btn-ghost" style="padding:4px 8px; font-size:11px;" onclick="viewPmoDetails('${item.patient}')">Lihat Riwayat</button>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">💊 ${item.drug}</div>
      <div style="display:flex;gap:8px;">
        ${item.sessions.map((s, j) => `
          <div style="flex:1;text-align:center;padding:6px;border-radius:8px;background:${item.checks[j] ? '#d1fae5' : '#fee2e2'};">
            <div style="font-size:10px;font-weight:700;color:${item.checks[j] ? '#065f46' : '#991b1b'}">${s}</div>
            <div style="font-size:16px;">${item.checks[j] ? '✅' : '❌'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  el2.innerHTML = displayPatients.map(p => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:600;">${p.name}</span>
        <span style="font-size:12px;font-weight:800;color:${p.pmo >= 80 ? 'var(--success)' : p.pmo >= 60 ? 'var(--warning)' : 'var(--danger)'};">${p.pmo}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.pmo}%;background:${p.pmo >= 80 ? 'var(--success)' : p.pmo >= 60 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
    </div>
  `).join('');
}

// ============ CHAT ============
// ============ CHAT ============
async function renderChat() {
  const session = getCurrentSession();
  if (!session) return;
  
  const contactEl = document.getElementById('contact-list');
  contactEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">Memuat riwayat chat...</div>';

  try {
    // 1. Get all chats where user is a participant
    // Remove orderBy from Firestore query to avoid needing a composite index
    const snapshot = await db.collection('chats')
      .where('participants', 'array-contains', session.username)
      .get();
    
    if (snapshot.empty) {
      contactEl.innerHTML = `
        <div style="padding:40px 20px; text-align:center;">
          <div style="font-size:32px; margin-bottom:12px;">💬</div>
          <div style="font-size:13px; font-weight:700; color:var(--text-dark);">Belum ada percakapan</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px; margin-bottom:16px;">Mulai chat baru dengan menekan tombol + di atas</div>
          <button class="btn btn-sm" onclick="openNewChatList()" style="background:var(--primary); color:white; padding:6px 16px; border-radius:20px;">Mulai Chat</button>
        </div>
      `;
      return;
    }

    const chatDocs = [];
    snapshot.forEach(doc => chatDocs.push({ id: doc.id, ...doc.data() }));

    // Sort in-memory instead of Firestore orderBy
    chatDocs.sort((a, b) => {
      const timeA = a.lastUpdated?.toDate?.() || new Date(0);
      const timeB = b.lastUpdated?.toDate?.() || new Date(0);
      return timeB - timeA;
    });

    // 2. Fetch user profiles for participants to display names/details
    const historyHtml = chatDocs.map(chat => {
      const otherId = chat.participants.find(p => p !== session.username);
      const lastMsg = chat.messages ? chat.messages[chat.messages.length - 1] : null;
      
      // Resolve other participant's name:
      // 1. Check if we stored it in participantNames metadata
      // 2. Check any message history for the other user's name
      // 3. Fallback to username
      const otherName = chat.participantNames?.[otherId] || 
                        (chat.messages || []).find(m => m.senderId === otherId)?.senderName || 
                        otherId;
      
      const snippet = lastMsg ? (lastMsg.text.slice(0, 40) + (lastMsg.text.length > 40 ? '...' : '')) : 'Pesan baru...';
      const time = lastMsg ? lastMsg.time : '';
      
      return `
        <div class="patient-item chat-history-item ${selectedContactId === otherId ? 'active' : ''}" style="margin-bottom:8px; cursor:pointer;" onclick="selectContact('${otherId}', '${otherName}')">
          <div class="p-avatar" style="font-size:18px;background:var(--primary-light);color:var(--primary);">${otherName.charAt(0)}</div>
          <div class="p-info" style="min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="p-name" style="font-size:13px; font-weight:700;">${otherName}</div>
              <div style="font-size:10px; color:var(--text-muted);">${time}</div>
            </div>
            <div style="font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${snippet}</div>
          </div>
        </div>
      `;
    }).join('');

    contactEl.innerHTML = historyHtml;
    
    if (!selectedContactId && chatDocs.length > 0) {
      const firstChat = chatDocs[0];
      const otherId = firstChat.participants.find(p => p !== session.username);
      const lastMsg = firstChat.messages ? firstChat.messages[firstChat.messages.length - 1] : null;
      const otherName = lastMsg?.senderName || otherId;
      selectContact(otherId, otherName);
    }
  } catch (err) {
    console.error("Failed to render chat history", err);
    contactEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--danger);">Gagal memuat riwayat</div>';
  }
}

async function openNewChatList() {
  const session = getCurrentSession();
  if (!session) return;
  
  const contactEl = document.getElementById('contact-list');
  contactEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">Memuat kontak...</div>';

  try {
    let snapshot;
    if (session.role === 'dokter') {
      snapshot = await db.collection('users').where('role', '==', 'pemegang').get();
    } else if (session.role === 'pemegang' || session.role === 'admin') {
      snapshot = await db.collection('users').get();
    } else {
      snapshot = await db.collection('users').where('role', '==', 'dokter').get();
    }
    
    const contacts = [];
    snapshot.forEach(doc => {
      const u = doc.data();
      if (u.username !== session.username) {
        contacts.push({ id: doc.id, ...u });
      }
    });

    if (contacts.length === 0) {
      contactEl.innerHTML = `
        <div style="padding:20px; text-align:center;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Tidak ada kontak tersedia</div>
          <button class="btn btn-xs" onclick="renderChat()" style="background:var(--bg-muted); font-size:10px;">Kembali</button>
        </div>
      `;
      return;
    }

    contactEl.innerHTML = `
      <div style="padding:4px 8px 12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); margin-bottom:12px;">
         <span style="font-size:11px; font-weight:700; color:var(--text-muted);">Mulai Chat Baru</span>
         <button onclick="renderChat()" style="border:none; background:none; color:var(--primary); font-size:10px; cursor:pointer;">Batal</button>
      </div>
      ${contacts.map(c => `
        <div class="patient-item" style="margin-bottom:8px; border-bottom:1px solid #f9f9f9;" onclick="selectContact('${c.username}', '${c.nama}')">
          <div class="p-avatar" style="font-size:20px;background:linear-gradient(135deg,#f77f00,#fcbf49);">${c.nama.charAt(0)}</div>
          <div class="p-info">
            <div class="p-name">${c.nama}</div>
            <div class="p-meta">${ROLE_INFO[c.role]?.label || c.role}</div>
          </div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    console.error("Failed to load users for new chat", err);
    contactEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--danger);">Gagal memuat kontak</div>';
  }
}

let selectedContactId = null;
let selectedContactName = "";
let currentChatAttachment = null;

function handleChatFileSelect(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  
  const reader = new FileReader();
  reader.onload = (e) => {
    currentChatAttachment = {
      name: file.name,
      type: file.type,
      data: e.target.result
    };
    document.getElementById('chat-attachment-name').textContent = file.name;
    document.getElementById('chat-attachment-preview').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

function clearChatAttachment() {
  currentChatAttachment = null;
  document.getElementById('chat-file-input').value = '';
  document.getElementById('chat-attachment-preview').style.display = 'none';
}

function selectContact(id, name) {
  selectedContactId = id;
  selectedContactName = name;
  document.getElementById('chat-with').textContent = name;
  loadChat(id);
  // Refresh history list to show active state
  renderChat();
}

function getConversationId(id1, id2) {
  return [id1, id2].sort().join('_');
}

function loadChat(otherId) {
  const session = getCurrentSession();
  if (!session) return;
  
  const conversationId = getConversationId(session.username, otherId);
  
  // Unsubscribe old listener
  if (window.CHAT_UNSUBSCRIBE) window.CHAT_UNSUBSCRIBE();
  
  const chatMessagesEl = document.getElementById('chat-messages');
  chatMessagesEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">Memulai percakapan...</div>';

  window.CHAT_UNSUBSCRIBE = db.collection('chats').doc(conversationId).onSnapshot(doc => {
    const data = doc.data();
    const msgs = data ? (data.messages || []) : [];
    
    chatMessagesEl.innerHTML = msgs.map(m => {
      let attachmentHtml = '';
      if (m.attachment) {
        if (m.attachment.type.startsWith('image/')) {
          attachmentHtml = `<div style="margin-top:8px;"><img src="${m.attachment.data}" style="max-width:100%; border-radius:8px; cursor:pointer;" onclick="window.open('${m.attachment.data}')"></div>`;
        } else {
          attachmentHtml = `<div style="margin-top:8px;"><a href="${m.attachment.data}" download="${m.attachment.name}" style="color:inherit; text-decoration:underline; font-size:12px;">📎 ${m.attachment.name}</a></div>`;
        }
      }
      
      return `
        <div class="chat-msg ${m.senderId === session.username ? 'mine' : ''}">
          <div class="chat-bubble">
            ${m.text}
            ${attachmentHtml}
          </div>
          <div class="chat-time">${m.time}</div>
        </div>
      `;
    }).join('');
    
    if (msgs.length === 0) {
      chatMessagesEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">Belum ada pesan. Say hello! 👋</div>';
    }
    
    chatMessagesEl.scrollTop = 9999;
  }, err => {
    console.error("Chat listener error:", err);
    chatMessagesEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--danger);">Gagal memuat pesan</div>';
  });
}

function chatEnter(e) {
  if (e.key === 'Enter') sendChat();
}

async function sendChat() {
  const session = getCurrentSession();
  if (!session || !selectedContactId) return;

  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const conversationId = getConversationId(session.username, selectedContactId);
  const newMsg = { 
    senderId: session.username, 
    senderName: session.nama, 
    text: text, 
    time: time,
    timestamp: new Date().toISOString(),
    attachment: currentChatAttachment
  };

  input.value = '';
  clearChatAttachment();

  try {
    await db.collection('chats').doc(conversationId).set({
      messages: firebase.firestore.FieldValue.arrayUnion(newMsg),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      participants: [session.username, selectedContactId],
      lastSenderName: session.nama,
      participantNames: {
        [session.username]: session.nama,
        [selectedContactId]: selectedContactName
      }
    }, { merge: true });

    // Create Notification for recipient
    await db.collection('notifs').add({
      title: 'Pesan Baru',
      desc: `Pesan dari ${session.nama}: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`,
      type: 'info',
      icon: '💬',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'chat',
      forUser: selectedContactId
    });
  } catch(e) {
    console.error("Failed to send message:", e);
    showToast('❌ Gagal mengirim pesan', 'error');
  }
}

// ============ NOTIFICATIONS ============
function renderNotifications() {
  const session = getCurrentSession();
  const el = document.getElementById('notif-list');
  if (!el || !session) return;

  // Filter: Global notifications (no forUser) OR specifically for this user
  // EXCEPT for Program Holder and Admin who see everything
  const myNotifs = NOTIFS.filter(n => {
    if (currentRole === 'pemegang' || currentRole === 'admin') return true;
    return !n.forUser || n.forUser === session.username;
  });
  const sorted = [...myNotifs].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  
  el.innerHTML = sorted.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="this.classList.remove('unread'); closeModal('modal-notif'); showPage('${n.act}')">
      <div class="notif-icon ${n.type}">${n.icon}</div>
      <div class="notif-text">
        <div class="notif-title">${n.title}</div>
        <div class="notif-desc">${n.desc}</div>
        <div class="notif-time">${n.time || (n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '')}</div>
      </div>
      ${n.unread ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:6px;"></div>' : ''}
    </div>
  `).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);">Tidak ada notifikasi</div>';
}

// ============ STOCK ============
function renderStokFull() {
  const alertEl = document.getElementById('stock-alert-banner');
  const listEl = document.getElementById('stok-list');
  const critical = DRUGS.filter(d => d.stok < d.min);

  alertEl.innerHTML = critical.map(d => `
    <div class="stock-alert">
      <div class="alert-icon">⚠️</div>
      <div class="alert-text">
        <div class="alert-title">Stok Kritis: ${d.name}</div>
        <div class="alert-sub">Sisa ${d.stok} tablet | Min: ${d.min} tablet | Pemasok: ${d.pemasok}</div>
      </div>
      <button class="alert-action" onclick="openModal('modal-stok')">Restock Sekarang</button>
    </div>
  `).join('');

  listEl.innerHTML = `<div class="table-responsive"><table class="mobile-card-table" style="width:100%;border-collapse:separate;border-spacing:0;">
    <thead><tr style="background:var(--bg);">
      <th style="padding:12px;text-align:left;font-size:12px;font-weight:700;color:var(--text-muted);">Nama Obat</th>
      <th style="padding:12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-muted);">Stok</th>
      <th style="padding:12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-muted);">Min</th>
      <th style="padding:12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-muted);">Status</th>
      <th style="padding:12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-muted);">Kadaluarsa</th>
      <th style="padding:12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-muted);">Aksi</th>
    </tr></thead>
    <tbody>${DRUGS.map(d => {
      const isLow = d.stok < d.min;
      return `<tr style="border-bottom:1px solid var(--border);">
        <td data-label="Nama Obat" style="padding:14px 12px;font-weight:600;">${d.name}</td>
        <td data-label="Stok" style="padding:14px 12px;text-align:center;font-weight:700;color:${isLow ? 'var(--danger)' : 'var(--text)'};">${d.stok}</td>
        <td data-label="Min" style="padding:14px 12px;text-align:center;color:var(--text-muted);">${d.min}</td>
        <td data-label="Status" style="padding:14px 12px;text-align:center;"><span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;background:${isLow ? '#fee2e2' : '#d1fae5'};color:${isLow ? '#991b1b' : '#065f46'};">${isLow ? '⚠ Kritis' : '✅ Aman'}</span></td>
        <td data-label="Kadaluarsa" style="padding:14px 12px;text-align:center;font-size:13px;color:var(--text-muted);">${d.kadaluarsa}</td>
        <td data-label="Aksi" style="padding:14px 12px;text-align:center;">
          <button class="btn btn-danger" style="padding:4px 8px;font-size:10px;border-radius:6px;min-width:auto;" onclick="hapusStok('${d.name}')">Hapus</button>
        </td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

// ============ PICKUP SCHEDULE ============
function renderPickupSchedule() {
  const session = getCurrentSession();
  const cal = document.getElementById('schedule-cal');
  const todayEl = document.getElementById('pickup-today');
  const allEl = document.getElementById('pickup-all');
  const countEl = document.getElementById('stat-jemput-total');
  
  if (!cal || !todayEl || !allEl) return;

  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let displayPickups = PICKUPS.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Broadened Visibility (as requested): Show ALL schedules for all roles

  // Kalender
  cal.innerHTML = days.map((d, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() - now.getDay() + i);
    const isToday = date.toDateString() === now.toDateString();
    const dateStr = date.toISOString().split('T')[0];
    
    const hasJadwal = displayPickups.some(p => {
      let pDate = p.date;
      if (pDate === 'Hari Ini') pDate = todayStr;
      return pDate === dateStr;
    });

    return `<div class="day-cell ${isToday ? 'today' : ''}" onclick="viewScheduleByDate('${dateStr}', '${d}')">
      <div class="day-name">${d}</div>
      <div class="day-num">${date.getDate()}</div>
      ${hasJadwal ? '<div class="day-dot" style="background:var(--primary);width:6px;height:6px;margin:2px auto 0;"></div>' : ''}
    </div>`;
  }).join('');

  const todayPickups = displayPickups.filter(p => {
    let pDate = p.date;
    if (pDate === 'Hari Ini') return true;
    return pDate === todayStr;
  });

  todayEl.innerHTML = todayPickups.length ? todayPickups.map(p => pickupHTML(p)).join('') : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px;">Tidak ada jadwal hari ini</div>';
  allEl.innerHTML = displayPickups.length ? displayPickups.map(p => pickupHTML(p)).join('') : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px;">Belum ada jadwal</div>';

  if (countEl) countEl.textContent = displayPickups.length;
}

function viewScheduleByDate(dateStr, dayName) {
  const modal = document.getElementById('modal-detail-jadwal');
  const title = document.getElementById('detail-jadwal-title');
  const list = document.getElementById('detail-jadwal-list');
  
  const now = new Date();
  const isToday = dateStr === now.toISOString().split('T')[0];
  
  title.innerText = `Jadwal: ${dayName}, ${dateStr} ${isToday ? '(Hari Ini)' : ''}`;
  
  const filtered = PICKUPS.filter(p => {
    let pDate = p.date;
    if (pDate === 'Hari Ini') pDate = now.toISOString().split('T')[0];
    return pDate === dateStr;
  });
  
  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);">
      <div style="font-size:48px;margin-bottom:16px;">📅</div>
      <div style="font-weight:600;">Tidak ada jadwal untuk tanggal ini</div>
    </div>`;
  } else {
    list.innerHTML = filtered.map(p => pickupHTML(p)).join('');
  }
  
  openModal('modal-detail-jadwal');
}

function openJadwalModal() {
  const session = getCurrentSession();
  const title = document.getElementById('jadwal-modal-title');
  const labelPJ = document.getElementById('jadwal-label-pj');
  const inputPJ = document.getElementById('jadwal-pj-input');
  const labelAlamat = document.getElementById('jadwal-label-alamat');
  const typeContainer = document.getElementById('jadwal-form-tipe');
  const btn = document.getElementById('jadwal-btn-simpan');

  // Clear previous values
  const fields = ['jadwal-pasien-input', 'jadwal-pj-input', 'jadwal-alamat', 'jadwal-jam'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = (id === 'jadwal-jam' ? '09:00' : '');
  });

  if (currentRole === 'petugas') {
    title.innerText = "Buat Jadwal Pengantaran Obat";
    labelPJ.innerText = "Nama Penerima (Pasien/Pendamping)";
    if (inputPJ) inputPJ.placeholder = "Siapa yang akan menerima obat?";
    labelAlamat.innerText = "Alamat Pengantaran";
    typeContainer.style.display = "none";
    document.getElementById('jadwal-type-select').value = "antar";
    btn.innerText = "📅 Simpan Jadwal Pengantaran";
  } else if (currentRole === 'pendamping') {
    title.innerText = "Lapor Stok / Minta Kirim Obat";
    labelPJ.innerText = "Nama Pelapor";
    if (inputPJ) {
      inputPJ.placeholder = "Nama Anda";
      inputPJ.value = session?.nama || '';
    }
    labelAlamat.innerText = "Alamat Pengambilan / Lokasi Anda";
    const addrEl = document.getElementById('jadwal-alamat');
    if (addrEl) addrEl.value = session?.alamat || '';
    
    typeContainer.style.display = "block";
    btn.innerText = "🚀 Kirim Permintaan ke Petugas";
  } else {
    title.innerText = "Jadwalkan Antar-Jemput Obat";
    typeContainer.style.display = "block";
    btn.innerText = "📅 Simpan Jadwal";
  }

  // Set default date to today
  const dateEl = document.getElementById('jadwal-tgl');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
  
  openModal('modal-jadwal');
}

function autoPopulateSchedule() {
  const patientName = document.getElementById('jadwal-pasien-input').value;
  if (!patientName) return;

  const patient = PATIENTS.find(p => p.name === patientName);
  if (patient) {
    document.getElementById('jadwal-pj-input').value = patient.pendamping || '';
    document.getElementById('jadwal-alamat').value = patient.alamat || '';
  }
}

async function simpanJadwal() {
  const session = getCurrentSession();
  const patientName = document.getElementById('jadwal-pasien-input').value;
  const date = document.getElementById('jadwal-tgl').value;
  const time = document.getElementById('jadwal-jam').value;
  const pjName = document.getElementById('jadwal-pj-input').value;
  const alamat = document.getElementById('jadwal-alamat').value;
  const type = document.getElementById('jadwal-type-select').value;

  if (!patientName || !date || !time || (!pjName && currentRole === 'petugas')) {
    showToast('❌ Mohon lengkapi data jadwal!', 'error');
    return;
  }

  const btn = document.querySelector('button[onclick="simpanJadwal()"]');
  if (btn) { btn.disabled = true; btn.innerText = '⌛ Menyimpan...'; }

  // Resolve PJ ID
  let pjId = 'petugas';
  try {
    const pjSnap = await db.collection('users').where('nama', '==', pjName).limit(1).get();
    if (!pjSnap.empty) {
      pjId = pjSnap.docs[0].data().username;
    }
  } catch (e) { console.error("PJ Resolution error", e); }

  const newPickup = {
    patient: patientName,
    pendamping: pjName,
    pendampingId: pjId || (currentRole === 'pendamping' ? session.username : 'petugas'),
    time: time,
    date: date,
    alamat: alamat || '-',
    status: 'scheduled',
    type: type,
    createdBy: currentRole,
    timestamp: new Date().toISOString()
  };

  try {
    const docRef = await db.collection('pickups').add(newPickup);
    newPickup.firebaseId = docRef.id;
    
    // Create Notification
    await db.collection('notifs').add({
      title: 'Jadwal Baru',
      desc: `Jadwal ${type === 'antar' ? 'Antar' : 'Jemput'} untuk ${patientName} pada ${date}.`,
      type: 'warning',
      icon: '🚗',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'jadwal-ambil'
    });
    
    closeModal('modal-jadwal');
    showToast('✅ Jadwal berhasil disimpan!', 'success');
  } catch (e) {
    console.error("Error saving schedule:", e);
    showToast('❌ Gagal menyimpan jadwal', 'error');
  } finally {
    const btn = document.querySelector('button[onclick="simpanJadwal()"]');
    if (btn) { btn.disabled = false; btn.innerText = '📅 Simpan Jadwal'; }
  }
}

function pickupHTML(p) {
  let icon = '🚗';
  let typeLabel = 'Antar-Jemput';
  
  if (p.type === 'antar') {
    icon = '🚚';
    typeLabel = 'Pengantaran Obat';
  } else if (p.type === 'jemput') {
    icon = '🏃';
    typeLabel = 'Penjemputan Obat';
  } else if (p.type === 'stok_kritis') {
    icon = '⚠️';
    typeLabel = 'Lapor Stok Menipis';
  }

  return `<div class="pickup-item">
    <div class="pickup-icon" title="${typeLabel}">${icon}</div>
    <div class="pickup-info">
      <div class="pickup-name">${p.patient} <span style="font-size:10px;font-weight:normal;opacity:0.7;">(${typeLabel})</span></div>
      <div class="pickup-addr">PIC: ${p.pendamping} • ${p.alamat}</div>
    </div>
    <div style="text-align:right;">
      <div class="pickup-time">${p.date} ${p.time}</div>
      <span class="pickup-status-chip ${p.status === 'done' ? 'chip-done' : 'chip-scheduled'}">${p.status === 'done' ? '✓ Selesai' : '🕐 Terjadwal'}</span>
    </div>
  </div>`;
}

// ============ LAPORAN ============
function renderLaporan() {
  const session = getCurrentSession();
  let displayPatients = PATIENTS;
  
  // Broadened Visibility: Show ALL patients in Laporan

  const totalPasien = displayPatients.length;
  const compliantCount = displayPatients.filter(p => (p.pmo || 0) >= 80).length;
  const avgPmo = totalPasien > 0 ? Math.round(displayPatients.reduce((sum, p) => sum + (p.pmo || 0), 0) / totalPasien) : 0;
  
  const pNames = displayPatients.map(p => p.name);
  const pmoTercatat = PICKUPS.filter(p => p.status === 'completed' && pNames.includes(p.patient)).length;

  document.getElementById('laporan-summary').innerHTML = [
    ['Total Pasien', totalPasien], 
    ['Pasien Patuh (≥80%)', compliantCount], 
    ['PMO Tercatat', pmoTercatat], 
    ['Kepatuhan Rata-rata', `${avgPmo}%`],
  ].map(([l, v]) => `<div class="report-row"><div class="report-label">${l}</div><div class="report-val">${v}</div></div>`).join('');

  document.getElementById('laporan-kepatuhan').innerHTML = displayPatients.map(p => `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;">
        <span>${p.name}</span><span style="font-weight:800;">${p.pmo || 0}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.pmo || 0}%"></div></div>
    </div>
  `).join('') || '<div style="color:var(--text-muted);text-align:center;padding:20px;">Belum ada data kepatuhan</div>';

  // Dynamic Diagnosis Count
  const diagCount = {};
  displayPatients.forEach(p => {
    const d = p.diagnosis || 'Lainnya';
    diagCount[d] = (diagCount[d] || 0) + 1;
  });

  const sortedDiags = Object.keys(diagCount).sort((a,b) => diagCount[b] - diagCount[a]);
  
  document.getElementById('laporan-diagnosis').innerHTML = sortedDiags.map(d =>
    `<div class="report-row"><div class="report-label">${d}</div><div class="report-val">${diagCount[d]} pasien</div></div>`
  ).join('') || '<div style="color:var(--text-muted);text-align:center;padding:20px;">Belum ada data diagnosis</div>';
  setTimeout(updateReportChart, 100);
}

let reportChartInstance = null;
// Historical report calculation moved to updateReportChart

function updateReportChart() {
  const period = document.getElementById('report-period').value || 'monthly';
  const ctx = document.getElementById('reportChart');
  if (!ctx || !window.Chart) return;
  
  if (reportChartInstance) {
    reportChartInstance.destroy();
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  let labels = [];
  let dataPoints = [];

  if (period === 'monthly') {
    // Jan 2024 to Current Month
    for (let y = 2024; y <= currentYear; y++) {
      const startM = (y === 2024) ? 0 : 0;
      const endM = (y === currentYear) ? currentMonth : 11;
      for (let m = startM; m <= endM; m++) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        labels.push(`${monthNames[m]} ${y}`);
        
        // Count patients registered up to this month
        const count = PATIENTS.filter(p => {
          const d = new Date(p.createdAt || p.id);
          return d.getFullYear() < y || (d.getFullYear() === y && d.getMonth() <= m);
        }).length;
        dataPoints.push(count);
      }
    }
  } else if (period === 'semester') {
    // Semester 1 2024 to Current Semester
    for (let y = 2024; y <= currentYear; y++) {
      for (let s = 1; s <= 2; s++) {
        if (y === currentYear && s > (currentMonth < 6 ? 1 : 2)) break;
        labels.push(`Smstr ${s} ${y}`);
        
        const count = PATIENTS.filter(p => {
          const d = new Date(p.createdAt || p.id);
          const pMonth = d.getMonth();
          const pYear = d.getFullYear();
          if (pYear < y) return true;
          if (pYear === y) {
            if (s === 1) return pMonth < 6;
            if (s === 2) return pMonth < 12;
          }
          return false;
        }).length;
        dataPoints.push(count);
      }
    }
  } else if (period === 'yearly') {
    // 2024 to Current Year
    for (let y = 2024; y <= currentYear; y++) {
      labels.push(`${y}`);
      const count = PATIENTS.filter(p => {
        const d = new Date(p.createdAt || p.id);
        return d.getFullYear() <= y;
      }).length;
      dataPoints.push(count);
    }
  }

  reportChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Pasien Aktif',
        data: dataPoints,
        borderColor: '#0f4c81',
        backgroundColor: 'rgba(15, 76, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#f77f00',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { 
          beginAtZero: false,
          grid: { borderDash: [5, 5] }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// ============ PROFIL ============
function renderProfil() {
  const session = getCurrentSession();
  
  // Sync currentRole and Global UI with session
  if (session) {
    if (typeof syncUserUI === 'function') syncUserUI();
    currentRole = session.role;
  }
  
  const roleInfo = ROLE_INFO[currentRole];

  // Use session data if available, otherwise use demo data
  const displayName = session ? session.nama : (roleInfo?.name || 'Pengguna');
  const displayRole = ROLE_INFO[currentRole]?.label || currentRole;
  
  // Use session photo if available, otherwise role icon
  if (session && session.photo) {
    document.getElementById('profil-avatar-big').innerHTML = `<img src="${session.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    document.getElementById('profil-avatar-big').textContent = roleInfo?.icon || '👤';
  }

  document.getElementById('profil-name').textContent = displayName;
  document.getElementById('profil-role-show').textContent = displayRole;

  // Populate form fields
  const usernameEl = document.getElementById('profil-username');
  const roleEl = document.getElementById('profil-role');
  const namaLengkapEl = document.getElementById('profil-nama-lengkap');
  const phoneEl = document.getElementById('profil-phone');
  const idLabelEl = document.getElementById('profil-label-id');
  const idValEl = document.getElementById('profil-id-val');

  if (usernameEl) usernameEl.value = session?.username || '';
  if (roleEl) roleEl.value = displayRole;
  if (namaLengkapEl) namaLengkapEl.value = session?.nama || '';
  if (phoneEl) phoneEl.value = session?.no_hp || '';

  // Dynamic ID field label and value
  if (idLabelEl && idValEl) {
    if (currentRole === 'pendamping') {
      idLabelEl.textContent = 'Nomor Induk Kependudukan (NIK)';
      idValEl.value = session?.nik || '';
    } else {
      idLabelEl.textContent = 'Nomor Induk Pegawai (NIP)';
      idValEl.value = session?.nip || '';
    }
  }

  document.getElementById('notif-settings').innerHTML = [
    ['Pengingat PMO', true],
    ['Alert Stok Obat', true],
    ['Pesan Chat', true],
    ['Jadwal Penjemputan', false],
  ].map(([label, on]) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:13px;font-weight:600;">${label}</span>
      <div onclick="this.classList.toggle('on');var d=this.querySelector('div');var isOn=this.style.background==='var(--primary)';this.style.background=isOn?'var(--border)':'var(--primary)';d.style.left=isOn?'3px':'23px';" style="width:44px;height:24px;border-radius:12px;background:${on ? 'var(--primary)' : 'var(--border)'};cursor:pointer;position:relative;transition:all 0.2s;">
        <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:3px;${on ? 'left:23px' : 'left:3px'};transition:all 0.2s;"></div>
      </div>
    </div>
  `).join('');

  // Superadmin Zone
  const superZone = document.getElementById('superadmin-zone');
  if (superZone) {
    if (currentRole === 'admin') {
      superZone.innerHTML = `
        <div style="margin-top:24px; padding:16px; border:1px solid #fee2e2; border-radius:12px; background:#fef2f2;">
          <div style="font-weight:700; color:#b91c1c; font-size:14px; margin-bottom:8px;">🛠️ Area Terlarang (Superadmin)</div>
          <div style="font-size:12px; color:#7f1d1d; margin-bottom:12px;">Fitur ini akan menghapus SELURUH data pasien, jadwal, dan chat secara permanen.</div>
          <button class="btn btn-danger" style="width:100%; font-size:13px; padding:10px;" onclick="resetDatabaseToEmpty()">
            ⚠️ Kosongkan Seluruh Data Aplikasi
          </button>
        </div>
      `;
    } else {
      superZone.innerHTML = '';
    }
  }
}

async function simpanProfil() {
  const session = getCurrentSession();
  const userId = session?.username || session?.uid;
  if (!session || !userId) {
    showToast('❌ Gagal: Sesi tidak valid', 'error');
    return;
  }

  const nama = document.getElementById('profil-nama-lengkap').value;
  const phone = document.getElementById('profil-phone').value;
  const idVal = document.getElementById('profil-id-val').value;

  const updates = {
    nama: nama,
    no_hp: phone
  };

  if (currentRole === 'pendamping') {
    updates.nik = idVal;
  } else {
    updates.nip = idVal;
  }

  try {
    showToast('⏳ Menyimpan data...', '');
    await db.collection('users').doc(userId).update(updates);
    
    // Update local session
    Object.assign(session, updates);
    localStorage.setItem('siodgj_session', JSON.stringify(session));
    
    // Refresh all User UI (Sidebar, etc)
    if (typeof syncUserUI === 'function') syncUserUI();

    renderProfil();
    showToast('✅ Profil berhasil diperbarui!', 'success');
  } catch (err) {
    console.error("Failed to update profile", err);
    showToast('❌ Gagal menyimpan perubahan', 'error');
  }
}

// ============ FORM HANDLERS ============
async function tambahPasien() {
  if (currentRole !== 'pemegang' && currentRole !== 'petugas' && currentRole !== 'admin') {
    showToast('❌ Akses ditolak', 'error');
    return;
  }
  const name = document.getElementById('tp-nama')?.value;
  const nik = document.getElementById('tp-nik')?.value;
  const gender = document.getElementById('tp-jk')?.value;
  const tglLahir = document.getElementById('tp-tgl')?.value;
  const alamat = document.getElementById('tp-alamat')?.value;
  const diagnosis = document.getElementById('tp-diag')?.value;
  const pendamping = document.getElementById('tp-pendamping')?.value;

  if(!name || !nik) {
    showToast('❌ Nama dan NIK wajib diisi!', 'danger');
    return;
  }

  const btn = document.querySelector('button[onclick="tambahPasien()"]');
  if (btn) { btn.disabled = true; btn.innerText = '⌛ Menyimpan...'; }

  let age = 30;
  if(tglLahir) {
    const birthYear = new Date(tglLahir).getFullYear();
    const currentYear = new Date().getFullYear();
    age = currentYear - birthYear;
  }

  const newPatient = {
    id: Date.now(),
    name: name,
    age: age,
    gender: gender,
    diagnosis: diagnosis,
    status: 'monitor',
    pendamping: pendamping || '-',
    obat: 'Belum ditentukan',
    pmo: 0,
    pmo_sessions: [false, false, false],
    nik: nik,
    alamat: alamat || '-',
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await db.collection('patients').add(newPatient);
    
    // Create Notification
    await db.collection('notifs').add({
      title: 'Pasien Baru',
      desc: `${name} telah didaftarkan ke sistem.`,
      type: 'info',
      icon: '👤',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'data-pasien'
    });
    
    if(document.getElementById('tp-nama')) document.getElementById('tp-nama').value = '';
    if(document.getElementById('tp-nik')) document.getElementById('tp-nik').value = '';
    if(document.getElementById('tp-tgl')) document.getElementById('tp-tgl').value = '';
    if(document.getElementById('tp-alamat')) document.getElementById('tp-alamat').value = '';
    if(document.getElementById('tp-pendamping')) document.getElementById('tp-pendamping').value = '';

    closeModal('modal-tambah-pasien');
    showToast('✅ Pasien berhasil ditambahkan ke Firebase!', 'success');
  } catch (error) {
    console.error("Error adding patient: ", error);
    showToast('❌ Gagal menambahkan pasien', 'error');
  } finally {
    const btn = document.querySelector('button[onclick="tambahPasien()"]');
    if (btn) { btn.disabled = false; btn.innerText = 'Simpan Pasien'; }
  }
}

async function simpanPMO() {
  const pasienName = document.getElementById('pmo-pasien-input')?.value;
  const obatName = document.getElementById('pmo-obat-input')?.value;
  const waktu = document.getElementById('pmo-waktu-input')?.value;
  const status = document.getElementById('pmo-status-select')?.value;
  const gejala = document.getElementById('pmo-gejala-input')?.value || '';
  const catatan = document.getElementById('pmo-catatan-input')?.value || '';
  
  if(!pasienName || !obatName || !waktu) {
    showToast('❌ Pasien, Obat, dan Waktu wajib diisi!', 'error');
    return;
  }

  const patient = PATIENTS.find(p => p.name === pasienName);
  if (!patient) {
    showToast('❌ Pasien tidak ditemukan!', 'error');
    return;
  }

  // Handle file input if exists (convert to base64 for simplicity in demo)
  const fileInput = document.getElementById('pmo-foto-bukti');
  let base64Foto = null;

  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    try {
      base64Foto = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch(err) {
      console.warn("Failed to read image file", err);
    }
  }

  // Create new PMO Log entry
  const pmoEntry = {
    waktu: waktu,
    obat: obatName,
    status: status, // done, pending, missed
    gejala: gejala,
    catatan: catatan,
    foto: base64Foto, // Optional base64 image
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Save PMO entry to a subcollection in Firestore (history)
    await db.collection('patients').doc(patient.firebaseId).collection('pmo_logs').add(pmoEntry);
    
    // 2. Recalculate PMO Compliance score
    let newScore = patient.pmo || 0;
    if (status === 'done') newScore = Math.min(100, newScore + 10);
    else if (status === 'missed') newScore = Math.max(0, newScore - 10);
    
    // 3. Determine session (Pagi 05-11, Siang 11-16, Malam 16-23)
    const hour = parseInt(waktu.split(':')[0]);
    let sessions = patient.pmo_sessions || [false, false, false];
    if (status === 'done') {
      if (hour >= 5 && hour < 11) sessions[0] = true;
      else if (hour >= 11 && hour < 16) sessions[1] = true;
      else if (hour >= 16 && hour <= 23) sessions[2] = true;
    }

    const btn = document.querySelector('button[onclick="simpanPMO()"]');
    if (btn) { btn.disabled = true; btn.innerText = '⌛ Mencatat...'; }

    await db.collection('patients').doc(patient.firebaseId).update({
      pmo: newScore,
      pmo_sessions: sessions,
      obat: obatName
    });
    
    // Update local state
    patient.pmo = newScore;
    patient.pmo_sessions = sessions;
    patient.obat = obatName;
    
    closeModal('modal-pmo');
    showToast('✅ PMO berhasil dicatat!', 'success');

    // Create Notification
    await db.collection('notifs').add({
      title: 'PMO Dicatat',
      desc: `Pencatatan obat untuk ${pasienName} telah disimpan.`,
      type: 'success',
      icon: '💊',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'pmo'
    });
    
    // Clear form
    if(document.getElementById('pmo-pasien-input')) document.getElementById('pmo-pasien-input').value = '';
    if(document.getElementById('pmo-obat-input')) document.getElementById('pmo-obat-input').value = '';
    if(document.getElementById('pmo-gejala-input')) document.getElementById('pmo-gejala-input').value = '';
    if(document.getElementById('pmo-catatan-input')) document.getElementById('pmo-catatan-input').value = '';
    if(document.getElementById('pmo-foto-bukti')) document.getElementById('pmo-foto-bukti').value = '';
    
    // Re-render UI
    if(typeof renderFullPatients === 'function') renderFullPatients();
  } catch (err) {
    console.error("Error saving PMO:", err);
    showToast('❌ Gagal mencatat PMO', 'error');
  } finally {
    const btn = document.querySelector('button[onclick="simpanPMO()"]');
    if (btn) { btn.disabled = false; btn.innerText = 'Simpan Pencatatan'; }
  }
}

async function viewPmoDetails(pasienName) {
  const patient = PATIENTS.find(p => p.name === pasienName);
  if (!patient) return;

  document.getElementById('pmo-detail-name').textContent = patient.name;
  const listEl = document.getElementById('pmo-detail-list');
  listEl.innerHTML = '<div style="padding:20px; text-align:center;">Memuat data...</div>';
  openModal('modal-pmo-detail');

  try {
    const snapshot = await db.collection('patients').doc(patient.firebaseId).collection('pmo_logs').orderBy('timestamp', 'desc').get();
    
    if (snapshot.empty) {
      listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">Belum ada riwayat PMO</div>';
      return;
    }

    const logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));

    listEl.innerHTML = logs.map(log => {
      const dateStr = new Date(log.timestamp).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
      const statusIcon = log.status === 'done' ? '✅' : log.status === 'missed' ? '❌' : '⏳';
      const statusColor = log.status === 'done' ? '#065f46' : log.status === 'missed' ? '#991b1b' : '#92400e';
      const statusBg = log.status === 'done' ? '#d1fae5' : log.status === 'missed' ? '#fee2e2' : '#fef3c7';
      const statusLabel = log.status === 'done' ? 'Diminum' : log.status === 'missed' ? 'Tidak Diminum' : 'Menunggu';

      let gejalaHtml = '';
      if (log.gejala && log.gejala.trim() !== '') {
         gejalaHtml = `<div style="font-size:12px; margin-top:8px; color:var(--text-muted);"><span style="font-weight:700; color:var(--text-dark);">Reaksi/Gejala:</span> ${log.gejala}</div>`;
      }

      let catatanHtml = '';
      if (log.catatan && log.catatan.trim() !== '') {
         catatanHtml = `<div style="font-size:12px; margin-top:4px; color:var(--text-muted); font-style:italic;">Catatan: "${log.catatan}"</div>`;
      }
      
      let fotoHtml = '';
      if (log.foto) {
         fotoHtml = `<div style="margin-top:8px;"><img src="${log.foto}" style="max-width:100%; max-height:150px; border-radius:8px; border:1px solid var(--border); object-fit:cover;" alt="Bukti Obat"></div>`;
      }

      return `
        <div style="padding:16px; border-bottom:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">${dateStr} (Pukul ${log.waktu})</div>
              <div style="font-size:14px; font-weight:600;">💊 ${log.obat}</div>
            </div>
            <div style="background:${statusBg}; color:${statusColor}; font-size:11px; padding:4px 8px; border-radius:12px; font-weight:600;">
              ${statusIcon} ${statusLabel}
            </div>
          </div>
          ${gejalaHtml}
          ${catatanHtml}
          ${fotoHtml}
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error("Failed to load PMO history", e);
    listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--danger)">Gagal memuat riwayat</div>';
  }
}

// ============ PROFILE UPDATES ============
async function updateProfilePhoto(input) {
  if (!input.files || !input.files[0]) return;
  
  const file = input.files[0];
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const session = getCurrentSession();
    const userId = session?.username || session?.uid;
    if (!session || !userId) {
      showToast('❌ Gagal: Sesi tidak valid', 'error');
      return;
    }

    // Update in Firestore
    await db.collection('users').doc(userId).update({ photo: base64 });
    
    // Update local session
    session.photo = base64;
    localStorage.setItem('siodgj_session', JSON.stringify(session));
    
    // Refresh UI
    renderProfil();
    document.getElementById('user-avatar').innerHTML = `<img src="${base64}" style="width:28px;height:28px;object-fit:cover;border-radius:50%;">`;
    
    showToast('✅ Foto profil berhasil diperbarui!', 'success');
  } catch (err) {
    console.error("Failed to update profile photo", err);
    showToast('❌ Gagal memperbarui foto', 'error');
  }
}

// ============ PATIENT EDIT ============
function openEditPatient() {
  if (currentRole !== 'pemegang' && currentRole !== 'petugas' && currentRole !== 'admin') {
    showToast('❌ Anda tidak memiliki akses untuk mengedit pasien', 'error');
    return;
  }
  const pName = document.getElementById('detail-name').textContent;
  const p = PATIENTS.find(x => x.name === pName);
  if (!p) return;

  document.getElementById('edit-p-id').value = p.firebaseId || '';
  document.getElementById('edit-p-nama').value = p.name;
  document.getElementById('edit-p-nik').value = p.nik || '';
  document.getElementById('edit-p-diag').value = p.diagnosis || '';
  document.getElementById('edit-p-status').value = p.status || 'stable';
  document.getElementById('edit-p-alamat').value = p.alamat || '';
  
  openModal('modal-edit-pasien');
}

async function simpanEditPasien() {
  if (currentRole !== 'pemegang' && currentRole !== 'petugas' && currentRole !== 'admin') {
    showToast('❌ Akses ditolak', 'error');
    return;
  }
  const fid = document.getElementById('edit-p-id').value;
  const name = document.getElementById('edit-p-nama').value;
  const nik = document.getElementById('edit-p-nik').value;
  const diag = document.getElementById('edit-p-diag').value;
  const status = document.getElementById('edit-p-status').value;
  const alamat = document.getElementById('edit-p-alamat').value;

  if (!name) {
    showToast('❌ Nama wajib diisi!', 'error');
    return;
  }

  try {
    if (fid) {
      await db.collection('patients').doc(fid).update({
        name, nik, diagnosis: diag, status, alamat
      });
    }

    // Update local array
    const p = PATIENTS.find(x => x.firebaseId === fid);
    if (p) {
      p.name = name;
      p.nik = nik;
      p.diagnosis = diag;
      p.status = status;
      p.alamat = alamat;
    }

    closeModal('modal-edit-pasien');
    showToast('✅ Data pasien berhasil diperbarui!', 'success');
    
    // Refresh detail page
    showPatientDetail(p.id);
    renderDashboardPatients();
    renderFullPatients();
  } catch (e) {
    console.error("Failed to update patient", e);
    showToast('❌ Gagal menyimpan perubahan', 'error');
  }
}

async function simpanStok() {
  const name = document.getElementById('stok-nama-input')?.value;
  const jumlah = parseInt(document.getElementById('stok-jumlah-input')?.value || '0');
  const min = parseInt(document.getElementById('stok-min-input')?.value || '50');
  const exp = document.getElementById('stok-exp-input')?.value || '';
  const vendor = document.getElementById('stok-vendor-input')?.value || '';

  if (!name) {
    showToast('❌ Nama obat wajib diisi!', 'danger');
    return;
  }

  const btn = document.querySelector('button[onclick="simpanStok()"]');
  if (btn) { btn.disabled = true; btn.innerText = '⌛ Menyimpan...'; }

  try {
    // Check if drug already exists in our local list (which has firebaseId)
    const existingDrug = DRUGS.find(d => d.name.toLowerCase() === name.toLowerCase());
    
    const drugData = {
      name: name,
      stok: jumlah,
      min: min,
      kadaluarsa: exp,
      pemasok: vendor,
      lastUpdated: new Date().toISOString()
    };

    if (existingDrug && existingDrug.firebaseId) {
      // Update existing
      await db.collection('drugs').doc(existingDrug.firebaseId).update(drugData);
      showToast('✅ Stok obat berhasil diperbarui!', 'success');
    } else {
      // Add new
      await db.collection('drugs').add(drugData);
      showToast('✅ Obat baru berhasil ditambahkan!', 'success');
    }

    closeModal('modal-stok');
    
    // Reset form
    document.getElementById('stok-nama-input').value = '';
    document.getElementById('stok-jumlah-input').value = '';
    document.getElementById('stok-min-input').value = '';
    document.getElementById('stok-exp-input').value = '';
    document.getElementById('stok-vendor-input').value = '';

  } catch (e) {
    console.error("Failed to save drug stock:", e);
    showToast('❌ Gagal menyimpan stok', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = 'Simpan Stok'; }
  }
}

function hapusStok(name) {
  if(confirm('Hapus obat ini dari inventaris?')) {
    const idx = DRUGS.findIndex(d => d.name === name);
    if(idx > -1) {
      DRUGS.splice(idx, 1);
      renderStokFull();
      if(typeof renderStockAlerts === 'function') renderStockAlerts();
      if(typeof renderDashboardPMO === 'function') renderDashboardPMO(); // some dashboard parts might use drugs
      showToast('🗑️ Obat berhasil dihapus', 'success');
    }
  }
}

// ============ CONSULTATION FLOW ============
let activeConsultationPatientId = null;

async function openConsultationModal(patientId, patientName) {
  activeConsultationPatientId = patientId;
  const modal = document.getElementById('modal-consultation');
  document.getElementById('cons-patient-name').textContent = patientName;
  
  // Fetch doctors dynamically from Firestore
  const drList = document.getElementById('cons-doctor-select');
  drList.innerHTML = '<option value="">Pilih Dokter...</option>';
  
  try {
    const snap = await db.collection('users').where('role', '==', 'dokter').get();
    if (snap.empty) {
       drList.innerHTML += '<option value="dokter">Fauzi (Dokter)</option>';
    } else {
      snap.forEach(doc => {
        const u = doc.data();
        drList.innerHTML += `<option value="${doc.id}">${u.nama}</option>`;
      });
    }
  } catch (e) {
    console.error("Failed to fetch doctors:", e);
    drList.innerHTML += '<option value="dokter">Fauzi (Dokter)</option>';
  }
  
  openModal('modal-consultation');
}

async function simpanKonsultasi() {
  const doctorId = document.getElementById('cons-doctor-select').value;
  const note = document.getElementById('cons-note').value;
  
  if (!doctorId) {
    showToast('❌ Pilih dokter terlebih dahulu!', 'error');
    return;
  }

  try {
    const selOption = document.querySelector(`#cons-doctor-select option[value="${doctorId}"]`);
    const drName = selOption ? selOption.text : 'Dokter';
    
    await db.collection('patients').doc(activeConsultationPatientId).update({
      assignedDoctorId: doctorId,
      assignedDoctorName: drName,
      consultationNote: note,
      consultationStatus: 'requested',
      lastConsultationAt: new Date().toISOString()
    });

    // Create Notification for Doctor
    await db.collection('notifs').add({
      title: 'Tugas Konsultasi',
      desc: `Satu pasien baru telah dikirimkan kepada Anda: ${document.getElementById('cons-patient-name').textContent}`,
      type: 'warning',
      icon: '🩺',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'data-pasien',
      forUser: doctorId
    });

    showToast('✅ Pasien berhasil dikirim ke Dokter!', 'success');
    closeModal('modal-consultation');
    
    // Refresh list data
    if (typeof loadDataFromFirestore === 'function') {
      await loadDataFromFirestore();
      renderFullPatients();
    }
  } catch (e) {
    console.error("Failed to save consultation:", e);
    showToast('❌ Gagal mengirim pasien', 'error');
  }
}

async function hapusPasien() {
  if (currentRole !== 'pemegang' && currentRole !== 'admin') {
    showToast('❌ Hanya Pemegang Program yang dapat menghapus pasien', 'error');
    return;
  }

  const pName = document.getElementById('detail-name').textContent;
  const p = PATIENTS.find(x => x.name === pName);
  if (!p || !p.firebaseId) {
    showToast('❌ Gagal: Data pasien tidak valid', 'error');
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin menghapus data pasien ${pName}?`)) return;

  try {
    await db.collection('patients').doc(p.firebaseId).delete();
    
    // Remove from local array
    const idx = PATIENTS.findIndex(x => x.firebaseId === p.firebaseId);
    if (idx !== -1) PATIENTS.splice(idx, 1);
    
    showToast(`✅ Pasien ${pName} berhasil dihapus`, 'success');
    showPage('data-pasien');
    renderDashboardPatients();
    renderFullPatients();
  } catch (err) {
    console.error("Failed to delete patient", err);
    showToast('❌ Gagal menghapus pasien', 'error');
  }
}

async function updatePatientStatusFirestore(firebaseId, status) {
  try {
    const p = PATIENTS.find(x => x.firebaseId === firebaseId);
    await db.collection('patients').doc(firebaseId).update({ status: status });
    showToast(`✅ Status berhasil diperbarui ke ${status === 'monitor' ? 'Pantau' : status}`, 'success');

    // Create Activity Notification
    await db.collection('notifs').add({
      title: 'Status Diperbarui',
      desc: `Status ${p?.name || 'Pasien'} diubah menjadi ${status === 'monitor' ? 'Pantau' : status} oleh ${getCurrentSession()?.nama}.`,
      type: 'info',
      icon: '📝',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'data-pasien'
    });
  } catch (e) {
    console.error("Update status error", e);
    showToast('❌ Gagal memperbarui status', 'error');
  }
}

async function completeDoctorConsultation(firebaseId) {
  if (!confirm('Apakah konsultasi ini sudah selesai? Pasien akan kembali ke pool Pemegang Program.')) return;
  try {
    const p = PATIENTS.find(x => x.firebaseId === firebaseId);
    await db.collection('patients').doc(firebaseId).update({
      assignedDoctorId: firebase.firestore.FieldValue.delete(),
      assignedDoctorName: firebase.firestore.FieldValue.delete(),
      consultationStatus: 'completed',
      status: 'stable',
      lastUpdateAt: new Date().toISOString()
    });
    showToast('✅ Konsultasi selesai. Pasien telah dikembalikan.', 'success');

    // Create Activity Notification
    await db.collection('notifs').add({
      title: 'Konsultasi Selesai',
      desc: `Konsultasi dr. ${p?.assignedDoctorName || ''} untuk ${p?.name || 'Pasien'} telah selesai.`,
      type: 'success',
      icon: '✅',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'data-pasien'
    });
  } catch (e) {
    console.error("Complete consultation error", e);
    showToast('❌ Gagal mengakhiri konsultasi', 'error');
  }
}
