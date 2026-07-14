/**
 * SIODGJ - Page Render Functions
 * All page-specific rendering logic
 */

// ============ UTILITY FUNCTIONS ============

/**
 * Normalizes a desa/village name for consistent comparison.
 * Handles "Desa Blega" == "blega" == "BLEGA"
 */
function normalizeDesa(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/^desa\s+/i, '')  // remove prefix "Desa "
    .replace(/\s+/g, ' ')       // normalize whitespace
    .trim();
}

/**
 * Get the list of desas (villages) for a user session.
 * Supports both old 'desa' (string) and new 'desas' (array) fields.
 * No data migration needed — backward compatible.
 */
function getUserDesas(session) {
  if (!session) return [];
  if (Array.isArray(session.desas) && session.desas.length > 0) {
    return session.desas.map(normalizeDesa).filter(Boolean);
  }
  const single = session.desa || session.alamat;
  return single ? [normalizeDesa(single)] : [];
}

/**
 * Returns audit metadata fields to attach to every Firestore write.
 * @param {'created'|'updated'|'deleted'} action
 */
function getAuditFields(action = 'updated') {
  const session = getCurrentSession();
  const ts = new Date().toISOString();
  return {
    [`${action}By`]:     session?.username || 'unknown',
    [`${action}ByName`]: session?.nama     || 'unknown',
    [`${action}ByRole`]: session?.role     || 'unknown',
    [`${action}At`]:     ts,
  };
}

/**
 * Get the patient list filtered by the current user's role & desa.
 * Admin, pemegang, and dokter see patients based on their access level.
 */
function getMyPatients(session) {
  if (!session) return [];
  const role = session.role || currentRole;

  if (role === 'admin' || role === 'pemegang') {
    return PATIENTS; // See all
  }
  if (role === 'dokter') {
    return PATIENTS.filter(p => p.assignedDoctorId === session.username);
  }
  // petugas & pendamping: filter by desa
  const userDesas = getUserDesas(session);
  if (userDesas.length === 0) return [];
  return PATIENTS.filter(p =>
    userDesas.includes(normalizeDesa(p.desa)) ||
    userDesas.includes(normalizeDesa(p.alamat))
  );
}

// ============ DASHBOARD ============
function renderDashboardPatients() {
  const session = getCurrentSession();
  const el = document.getElementById('dashboard-patients');
  const displayPatients = getMyPatients(session);
  
  if (!el) return;

  if (!SYNC_STATUS.isReady && displayPatients.length === 0) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px;">⌛ Menghubungkan ke server dan sinkronisasi data...</div>';
    return;
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
    const userDesas = getUserDesas(session);
    let displayPickups = PICKUPS;
    if ((currentRole === 'pendamping' || currentRole === 'petugas') && userDesas.length > 0) {
      displayPickups = PICKUPS.filter(pickup => {
        const patient = PATIENTS.find(pt => pt.name === pickup.patient);
        if (!patient) return false;
        return userDesas.includes(normalizeDesa(patient.desa)) ||
               userDesas.includes(normalizeDesa(patient.alamat));
      });
    }

    const totalPickups = displayPickups.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPickups = displayPickups.filter(p => p.date === 'Hari Ini' || p.date === todayStr).length;
    
    jemputTotalEl.textContent = totalPickups;
    if (jemputChangeEl) jemputChangeEl.textContent = todayPickups > 0 ? `${todayPickups} jadwal hari ini` : (totalPickups > 0 ? 'Tidak ada jadwal hari ini' : 'Belum ada jadwal');
  }
}

function patientHTML(p) {
  const statusMap = { stable:'status-stable', monitor:'status-monitor', critical:'status-critical', meninggal:'status-meninggal' };
  const statusLabel = { stable:'Stabil', monitor:'Perlu Pantau', critical:'Kritis', meninggal:'Meninggal' };
  
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

async function showPatientDetail(id) {
  const p = PATIENTS.find(x => x.id === id);
  if (!p) return;
  
  // Show base detail first
  showPage('patient-detail');
  
  document.getElementById('detail-avatar').textContent = p.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  
  const statusMap = { stable:'status-stable', monitor:'status-monitor', critical:'status-critical', meninggal:'status-meninggal' };
  const statusLabel = { stable:'Stabil', monitor:'Perlu Pantau', critical:'Kritis', meninggal:'Meninggal' };
  const badgeHTML = p.status ? `<span class="p-status ${statusMap[p.status] || ''}" style="margin-left:12px;font-size:11px;vertical-align:middle;">${statusLabel[p.status] || p.status}</span>` : '';
  
  document.getElementById('detail-name').innerHTML = `<span id="detail-name-text">${p.name}</span> ${badgeHTML}`;
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

  // Setup Real-time Listener for PMO logs
  if (PATIENT_DETAIL_UNSUBSCRIBE) {
    PATIENT_DETAIL_UNSUBSCRIBE();
    PATIENT_DETAIL_UNSUBSCRIBE = null;
  }

  const detailPmoEl = document.getElementById('detail-pmo-status');
  detailPmoEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">Memuat riwayat PMO...</div>';

  PATIENT_DETAIL_UNSUBSCRIBE = db.collection('patients').doc(p.firebaseId).collection('pmo_logs')
    .orderBy('timestamp', 'desc')
    .onSnapshot((logsSnap) => {
      const logs = [];
      logsSnap.forEach(doc => logs.push(doc.data()));
      currentPmoLogs = logs; // Store globally for click detail
      
      // Calculate today's compliance for the summary bar
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter(l => l.timestamp && l.timestamp.startsWith(today) && l.status === 'done');
      const doneCount = todayLogs.length;
      const compliance = p.pmo || Math.min(Math.round((doneCount / 3) * 100), 100);

      detailPmoEl.innerHTML = `
        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600;">Kepatuhan Obat</span>
            <span style="font-size:13px;font-weight:800;color:${compliance >= 80 ? 'var(--success)' : compliance >= 50 ? 'var(--warning)' : 'var(--danger)'};">${compliance}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${compliance}%;background:${compliance >= 80 ? 'var(--success)' : compliance >= 50 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
        </div>
        
        <div>
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.05em;">
            📋 Riwayat PMO Lengkap (${logs.length} catatan)
          </div>
          ${logs.length === 0
            ? '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:20px;">Belum ada catatan PMO untuk pasien ini</div>'
            : logs.map((l, idx) => {
                const date = l.timestamp ? l.timestamp.split('T')[0] : '-';
                const statusColor = l.status === 'done' ? 'var(--success)' : 'var(--warning)';
                const statusIcon = l.status === 'done' ? '✅' : '⏳';
                return `
                  <div onclick="showPmoLogDetail(${idx})" style="padding:10px 12px; background:var(--bg); border-radius:10px; margin-bottom:8px; font-size:12px; border-left:3px solid ${statusColor}; cursor:pointer; transition:all 0.15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                      <span style="font-weight:700; color:var(--text-dark);">${statusIcon} ${l.recordedBy || 'Petugas'}</span>
                      <span style="font-size:11px; color:var(--text-muted);">${date} • ${l.waktu || '-'} ›</span>
                    </div>
                    <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">${l.recorderRole ? '(' + l.recorderRole + ')' : ''} ${l.catatan || 'Mencatat konsumsi obat'}</div>
                  </div>
                `;
              }).join('')
          }
        </div>
      `;
    }, (err) => {
      console.error("Failed to fetch PMO logs", err);
      detailPmoEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:11px; color:var(--danger);">Gagal memuat riwayat PMO</div>';
    });

  // Role-based action buttons
  const editBtn = document.getElementById('btn-edit-pasien');
  const deleteBtn = document.getElementById('btn-hapus-pasien');
  const consBtn = document.getElementById('btn-konsultasi-pasien');
  
  const hasFullAccess = (currentRole === 'pemegang' || currentRole === 'petugas' || currentRole === 'admin');
  
  if (editBtn) editBtn.style.display = hasFullAccess ? 'block' : 'none';
  if (deleteBtn) deleteBtn.style.display = (currentRole === 'pemegang' || currentRole === 'admin') ? 'block' : 'none';
  if (consBtn) {
    consBtn.style.display = (currentRole === 'pemegang' || currentRole === 'admin') ? 'block' : 'none';
    consBtn.onclick = () => openConsultationModal(p.firebaseId, p.name);
  }
}

// Global store for PMO log click detail
let currentPmoLogs = [];

function showPmoLogDetail(idx) {
  const l = currentPmoLogs[idx];
  if (!l) return;

  const date = l.timestamp ? l.timestamp.split('T')[0] : '-';
  const statusColor = l.status === 'done' ? 'var(--success)' : '#f97316';
  const statusLabel = l.status === 'done' ? '✅ Sudah Dikonsumsi' : '⏳ Belum Dikonsumsi';
  
  // Populate modal
  const modal = document.getElementById('modal-pmo-detail');
  document.getElementById('pmo-detail-status').textContent = statusLabel;
  document.getElementById('pmo-detail-status').style.color = statusColor;
  document.getElementById('pmo-detail-date').textContent = date;
  document.getElementById('pmo-detail-time').textContent = l.waktu || '-';
  document.getElementById('pmo-detail-recorded-by').textContent = l.recordedBy || 'Petugas';
  document.getElementById('pmo-detail-role').textContent = l.recorderRole || '-';
  document.getElementById('pmo-detail-catatan').textContent = l.catatan || 'Mencatat konsumsi obat';
  document.getElementById('pmo-detail-obat').textContent = l.obat || '-';
  
  openModal('modal-pmo-detail');
}

function renderDashboardPMO() {
  const session = getCurrentSession();
  const el = document.getElementById('dashboard-pmo');
  if (!el) return;
  
  // Group by patient to show patient-centric view
  let patientsWithPmo = PATIENTS.filter(p => p.obat); 

  if (!SYNC_STATUS.isReady && patientsWithPmo.length === 0) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px;">⌛ Menyiapkan jadwal hari ini...</div>';
    return;
  }
  
  if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
    const userDesa = session?.desa || session?.alamat;
    if (!userDesa) {
      patientsWithPmo = [];
    } else {
      const cleanUserDesa = userDesa.replace('Desa ', '').trim();
      patientsWithPmo = patientsWithPmo.filter(p => {
        if (p.desa && session.desa && p.desa === session.desa) return true;
        return p.alamat && (p.alamat === "Desa " + cleanUserDesa || p.alamat === cleanUserDesa);
      });
    }
  }
  
  el.innerHTML = patientsWithPmo.slice(0, 4).map(p => {
    return `
      <div class="pmo-item" onclick="viewPmoDetails('${p.name}')">
        <div class="pmo-avatar" style="background:var(--primary-light);color:var(--primary);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${p.name[0]}</div>
        <div style="flex:1; margin-left:14px;">
          <div class="pmo-patient" style="font-weight:700;font-size:13px;color:var(--text-dark);">${p.name}</div>
          <div class="pmo-drug" style="font-size:11px;color:var(--text-muted);margin-top:2px;">📋 ${p.diagnosis || '-'}</div>
        </div>
        <div style="text-align:right;">
          <button class="btn btn-ghost" style="font-size:10px; padding:4px 8px; border-radius:6px; border:1px solid var(--border);">Riwayat</button>
        </div>
      </div>
    `;
  }).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Belum ada jadwal PMO</div>';
}

async function renderDashboardGejalaBaru() {
  const el = document.getElementById('dashboard-gejala-baru');
  if (!el || (currentRole !== 'pemegang' && currentRole !== 'admin')) return;

  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">⌛ Memuat data...</div>';

  if (!PATIENTS || PATIENTS.length === 0) {
    // If patients are still loading or empty, show a more descriptive message
    if (!SYNC_STATUS.collections.patients) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">⌛ Menunggu sinkronisasi data pasien...</div>';
    } else {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">✅ Tidak ada data pasien untuk diproses</div>';
    }
    return;
  }

  try {
    const patientsWithId = PATIENTS.filter(p => p.firebaseId);
    let allGejalaLogs = [];

    const pmoResults = await Promise.all(
      patientsWithId.map(p => db.collection('patients').doc(p.firebaseId).collection('pmo_logs').orderBy('timestamp', 'desc').limit(5).get().then(snap => {
        return { patient: p, snap };
      }).catch(() => null))
    );

    pmoResults.forEach(result => {
      if (!result) return;
      result.snap.forEach(doc => {
        const log = doc.data();
        if (log.recorderRole === 'petugas' && (log.gejala || log.catatan)) {
          allGejalaLogs.push({
            patient: result.patient,
            log: log
          });
        }
      });
    });

    // Sort by most recent
    allGejalaLogs.sort((a, b) => new Date(b.log.timestamp) - new Date(a.log.timestamp));
    
    // Take top 5 unique patients to avoid clutter
    const uniqueGejala = [];
    const seenPatients = new Set();
    for(const item of allGejalaLogs) {
      if(!seenPatients.has(item.patient.firebaseId)) {
        uniqueGejala.push(item);
        seenPatients.add(item.patient.firebaseId);
        if(uniqueGejala.length >= 5) break;
      }
    }

    el.innerHTML = uniqueGejala.map(g => {
      const dateStr = new Date(g.log.timestamp).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'});
      const gejalaText = g.log.gejala ? `<span style="color:var(--danger);font-weight:600;">Gejala: ${g.log.gejala}</span>` : '';
      const catatanText = g.log.catatan ? `<span style="color:var(--warning);font-weight:600;">Catatan: ${g.log.catatan}</span>` : '';
      
      return `
        <div class="pmo-item" onclick="viewPmoDetails('${g.patient.name}')" style="cursor:pointer; border-left: 3px solid var(--danger);">
          <div class="pmo-avatar" style="background:#fee2e2;color:var(--danger);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${g.patient.name[0]}</div>
          <div style="flex:1; margin-left:14px;">
            <div class="pmo-patient" style="font-weight:700;font-size:13px;color:var(--text-dark);">${g.patient.name}</div>
            <div class="pmo-drug" style="font-size:11px;color:var(--text-muted);margin-top:4px;">
              ${gejalaText} ${gejalaText && catatanText ? '<br>' : ''} ${catatanText}
            </div>
            <div style="font-size:9px;color:var(--text-muted);margin-top:6px;">Dilaporkan oleh ${g.log.recordedBy} (${dateStr})</div>
          </div>
        </div>
      `;
    }).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">✅ Tidak ada laporan gejala baru dari petugas</div>';

  } catch (e) {
    console.warn("Failed to fetch new symptoms:", e);
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);font-size:12px;">Gagal memuat data gejala</div>';
  }
}

function togglePMO(btn, i) {
  btn.classList.toggle('checked');
  btn.textContent = btn.classList.contains('checked') ? '✓' : '';
  showToast(btn.classList.contains('checked') ? '✅ PMO berhasil dicatat!' : '↩ PMO dibatalkan', btn.classList.contains('checked') ? 'success' : '');
}

let dashboardChartInstance = null;
let isRenderingChart = false;


async function renderBarChart() {
  const ctx = document.getElementById('dashboardChart');
  if (!ctx || !window.Chart) return;

  if (!SYNC_STATUS.isReady && PATIENTS.length === 0) {
    return; // Wait for data sync
  }

  if (isRenderingChart) return;
  isRenderingChart = true;


  try {
    if (dashboardChartInstance) {
      dashboardChartInstance.destroy();
    }

    // Generate last 7 days labels
    const days = [];
    const barData = [0, 0, 0, 0, 0, 0, 0];
    const lineData = [0, 0, 0, 0, 0, 0, 0];
    
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
      
      // Count total patients generated until this day
      lineData[6 - i] = PATIENTS.filter(p => !p.createdAt || new Date(p.createdAt) <= d).length || PATIENTS.length;
      
      // Count Pickups (Jadwal) on this day
      const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999);
      
      const dayPickups = PICKUPS.filter(p => {
         const pDate = new Date(p.date || p.createdAt);
         return pDate >= dayStart && pDate <= dayEnd;
      }).length;
      
      barData[6 - i] += dayPickups;
    }

    // Fetch PMO Logs for the last 7 days across all patients
    const patientsWithId = PATIENTS.filter(p => p.firebaseId);
    try {
      const sevenDaysAgoObj = new Date();
      sevenDaysAgoObj.setDate(sevenDaysAgoObj.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgoObj.toISOString();
      const pmoResults = await Promise.all(
        patientsWithId.map(p => db.collection('patients').doc(p.firebaseId).collection('pmo_logs').where('timestamp', '>=', sevenDaysAgoStr).get().catch(() => ({ forEach: () => {} })))
      );
      
      pmoResults.forEach(snap => {
        snap.forEach(doc => {
          const log = doc.data();
          if (!log.timestamp) return;
          const logDate = new Date(log.timestamp);
          
          // Find which day bucket it belongs to
          for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - i));
            if (logDate.getDate() === d.getDate() && logDate.getMonth() === d.getMonth() && logDate.getFullYear() === d.getFullYear()) {
               barData[i]++;
               break;
            }
          }
        });
      });
    } catch (e) {
      console.warn("Failed to fetch PMO logs for chart", e);
    }

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
            label: 'Kunjungan (PMO & Jadwal)',
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
            title: { display: true, text: 'Kunjungan', font: { size: 10 } },
            ticks: { stepSize: 1 }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { display: false },
            title: { display: true, text: 'Total', font: { size: 10 } },
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  } catch (err) {
    console.error("renderBarChart error:", err);
  } finally {
    isRenderingChart = false;
  }
}

function renderStockAlerts() {
  const el = document.getElementById('stock-alerts');
  if (!el) return;

  if (!SYNC_STATUS.isReady && DRUGS.length === 0) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;">⌛ Memeriksa stok...</div>';
    return;
  }

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
function updatePatientCounts(pool) {
  const countTotal = document.getElementById('count-total-pasien');
  const countMeninggal = document.getElementById('count-meninggal-pasien');
  if (countTotal) countTotal.textContent = pool.length;
  if (countMeninggal) countMeninggal.textContent = pool.filter(p => p.status === 'meninggal').length;
}

async function renderFullPatients() {
  const session = getCurrentSession();
  const el = document.getElementById('full-patient-list');
  const pmoPasienList = document.getElementById('pmo-pasien-list');
  const pmoObatList = document.getElementById('pmo-obat-list');
  const jadwalSel = document.getElementById('jadwal-pasien-select');
  
  const displayPatients = getMyPatients(session);
  
  updatePatientCounts(displayPatients);
  if (el) el.innerHTML = displayPatients.map(p => patientHTML(p)).join('');
  
  if (pmoPasienList) {
    pmoPasienList.innerHTML = displayPatients.map(p => `<option value="${p.name}">`).join('');
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
    jadwalList.innerHTML = displayPatients.map(p => `<option value="${p.name}">`).join('');
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

// ============ SEARCH / FILTER ============
function filterPatients(q) {
  const session = getCurrentSession();
  const el = document.getElementById('full-patient-list');
  // Admin & pemegang search all patients; others search their pool
  const pool = getMyPatients(session);

  if (!q || !q.trim()) {
    updatePatientCounts(pool);
    if (el) el.innerHTML = pool.map(p => patientHTML(p)).join('');
    return;
  }

  const qLow = q.toLowerCase().trim();
  const filtered = pool.filter(p =>
    p.name?.toLowerCase().includes(qLow) ||
    p.diagnosis?.toLowerCase().includes(qLow) ||
    p.alamat?.toLowerCase().includes(qLow) ||
    p.desa?.toLowerCase().includes(qLow) ||
    p.nik?.includes(q) ||
    p.pendamping?.toLowerCase().includes(qLow)
  );

  updatePatientCounts(filtered);
  if (el) el.innerHTML = filtered.length
    ? filtered.map(p => patientHTML(p)).join('')
    : '<div style="text-align:center;padding:32px;color:var(--text-muted);">Pasien tidak ditemukan</div>';
}

// ============ PMO FULL ============
window.pmoPage = window.pmoPage || 1;
function renderPMOFull(page = window.pmoPage) {
  window.pmoPage = page;
  const session = getCurrentSession();
  const el = document.getElementById('pmo-full-list');
  const el2 = document.getElementById('pmo-compliance');
  const pgList = document.getElementById('pmo-list-pagination');
  const pgComp = document.getElementById('pmo-comp-pagination');
  
  const displayPatients = getMyPatients(session);
  
  // Pagination
  const pageSize = 15;
  const total = displayPatients.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;
  const paginated = displayPatients.slice(start, start + pageSize);

  el.innerHTML = paginated.map((p, i) => `
    <div style="padding:16px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;color:var(--text-dark);">${p.name}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">📋 Diagnosis: ${p.diagnosis || '-'}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">💊 Obat Utama: ${p.obat || '-'}</div>
        </div>
        <button class="btn btn-ghost" style="padding:8px 16px; font-size:12px; border:1px solid var(--border); border-radius:10px; font-weight:600;" onclick="viewPmoDetails('${p.name}')">🔍 Lihat Riwayat</button>
      </div>
    </div>
  `).join('');

  el2.innerHTML = paginated.map(p => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:600;">${p.name}</span>
        <span style="font-size:12px;font-weight:800;color:${p.pmo >= 80 ? 'var(--success)' : p.pmo >= 60 ? 'var(--warning)' : 'var(--danger)'};">${p.pmo}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.pmo}%;background:${p.pmo >= 80 ? 'var(--success)' : p.pmo >= 60 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
    </div>
  `).join('');
  
  const btnHtml = `
    <div>Halaman ${current} dari ${totalPages} (Total ${total} pasien)</div>
    <div style="display:flex; gap:4px;">
       <button class="btn btn-ghost" style="padding:4px 8px;font-size:11px;" ${current === 1 ? 'disabled' : ''} onclick="renderPMOFull(${current-1})">Prev</button>
       <button class="btn btn-ghost" style="padding:4px 8px;font-size:11px;" ${current === totalPages ? 'disabled' : ''} onclick="renderPMOFull(${current+1})">Next</button>
    </div>
  `;
  
  if (pgList) pgList.innerHTML = btnHtml;
  if (pgComp) pgComp.innerHTML = btnHtml;
}

// ============ CHAT ============
// ============ CHAT ============
let globalChatContacts = [];

async function renderChat() {
  const session = getCurrentSession();
  if (!session) return;
  
  const contactEl = document.getElementById('chat-contact-list');
  // Only show selection view if nothing is selected
  if (!selectedContactId) {
    showContactList();
  }

  try {
    const snapshot = await db.collection('chats')
      .where('participants', 'array-contains', session.username)
      .get();
    
    if (snapshot.empty) {
      globalChatContacts = [];
      contactEl.innerHTML = `
        <div style="padding:60px 20px; text-align:center;">
          <div style="font-size:48px; margin-bottom:16px; opacity:0.8;">💬</div>
          <div style="font-size:15px; font-weight:700; color:var(--text); margin-bottom:8px;">Belum ada percakapan</div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:24px; max-width:240px; margin-inline:auto; line-height:1.5;">Mulai percakapan baru dengan petugas atau dokter sekarang.</div>
          <button class="btn" onclick="openNewChatList()" style="background:var(--navy); color:white; padding:10px 24px; border-radius:12px; font-weight:700; font-size:13px; border:none; cursor:pointer; box-shadow:0 4px 12px rgba(11,45,78,0.2);">+ Mulai Chat Baru</button>
        </div>
      `;
      return;
    }

    const chatDocs = [];
    snapshot.forEach(doc => chatDocs.push({ id: doc.id, ...doc.data() }));
    chatDocs.sort((a, b) => (b.lastUpdated?.toDate?.() || 0) - (a.lastUpdated?.toDate?.() || 0));

    globalChatContacts = chatDocs.map(chat => {
      const otherId = chat.participants.find(p => p !== session.username);
      const otherName = chat.participantNames?.[otherId] || otherId;
      const snippet = chat.lastSnippet || 'Mulai percakapan...';
      const time = chat.lastUpdated ? chat.lastUpdated.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return { id: otherId, name: otherName, snippet, time, type: 'history' };
    });

    renderFilteredContacts(globalChatContacts);
  } catch (err) {
    console.error("Failed to render chat history", err);
    contactEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--danger);">Gagal memuat riwayat</div>';
  }
}

function renderFilteredContacts(contacts) {
  const contactEl = document.getElementById('chat-contact-list');
  if (contacts.length === 0) {
    contactEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">Tidak ada kontak ditemukan</div>';
    return;
  }

  contactEl.innerHTML = contacts.map(c => {
    const isActive = c.id === selectedContactId ? 'active' : '';
    return `
      <div class="contact-item ${isActive}" onclick="selectContact('${c.id}', '${c.name}')">
        <div class="header-avatar" style="font-size:14px; width:46px; height:46px; flex-shrink:0;">${c.name.charAt(0)}</div>
        <div class="c-info" style="min-width:0; flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="c-name" style="font-size:14px; font-weight:700; color:var(--text);">${c.name}</div>
            <div class="c-time" style="font-size:11px; color:var(--text-muted);">${c.time || ''}</div>
          </div>
          <div class="c-preview" style="font-size:12px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">${c.snippet || ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

function filterChatContacts(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderFilteredContacts(globalChatContacts);
    return;
  }
  const filtered = globalChatContacts.filter(c => c.name.toLowerCase().includes(q));
  renderFilteredContacts(filtered);
}

async function openNewChatList() {
  const session = getCurrentSession();
  if (!session) return;
  
  const contactEl = document.getElementById('chat-contact-list');
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
      if (doc.data().username !== session.username) contacts.push(doc.data());
    });

    if (contacts.length === 0) {
      contactEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">Tidak ada kontak tersedia</div>';
      return;
    }

    globalChatContacts = contacts.map(c => ({
      id: c.username,
      name: c.nama,
      snippet: ROLE_INFO[c.role]?.label || c.role,
      time: '',
      type: 'new'
    }));

    contactEl.innerHTML = `
      <div style="padding:10px 16px; border-bottom:1px solid var(--border); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:12px; font-weight:700;">Mulai Chat Baru</span>
        <button class="btn btn-ghost" style="font-size:11px;" onclick="renderChat()">Batal</button>
      </div>
      <div id="new-contact-list-inner">
        ${globalChatContacts.map(c => `
          <div class="contact-item" onclick="selectContact('${c.id}', '${c.name}')">
            <div class="header-avatar" style="font-size:14px; width:44px; height:44px; background:linear-gradient(135deg, #f77f00, #fcbf49);">${c.name.charAt(0)}</div>
            <div class="c-info">
              <div class="c-name">${c.name}</div>
              <div class="c-preview">${c.snippet}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    contactEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--danger);">Gagal memuat kontak</div>';
  }
}

let selectedContactId = null;
let selectedContactName = "";
let currentChatAttachment = null;
let chatUnsubscribe = null;

// Helper to compress image before base64 (Max ~600KB base64)
async function compressImage(file, quality = 0.7, maxWidth = 1024) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
    };
  });
}

function handleChatFileSelect(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  
  // New Limits: 10MB for images (will be compressed), 800KB for other files
  const isImage = file.type.startsWith('image/');
  const maxSize = isImage ? 10 * 1024 * 1024 : 800 * 1024;

  if (file.size > maxSize) {
    showToast(`❌ File terlalu besar (Maks ${isImage ? '10MB untuk gambar' : '800KB'})`, 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    let finalData = e.target.result;
    
    if (isImage) {
      // Show local preview immediately if possible, but we wait for compression for actual data
      const nameEl = document.getElementById('chat-attachment-name');
      const previewEl = document.getElementById('chat-attachment-preview');
      if (nameEl) nameEl.textContent = "⏳ Mengompres...";
      if (previewEl) previewEl.style.display = 'flex';
      
      finalData = await compressImage(file);
    }

    currentChatAttachment = {
      name: file.name,
      type: file.type,
      data: finalData
    };

    const nameEl = document.getElementById('chat-attachment-name');
    const previewEl = document.getElementById('chat-attachment-preview');
    if (nameEl) nameEl.textContent = file.name;
    if (previewEl) previewEl.style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

function clearChatAttachment() {
  currentChatAttachment = null;
  const fileInput = document.getElementById('chat-file-input');
  const previewEl = document.getElementById('chat-attachment-preview');
  if (fileInput) fileInput.value = '';
  if (previewEl) previewEl.style.display = 'none';
}

function clearChatState() {
  selectedContactId = null;
  selectedContactName = "";
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
  clearChatAttachment();
  globalChatContacts = [];
}

function showContactList() {
  const searchInput = document.querySelector('#chat-contact-view input[type="text"]');
  if (searchInput) searchInput.value = '';
  
  // Clear any active chat subscription when returning to list
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
  selectedContactId = null;

  const isDesktop = window.innerWidth > 768;

  if (isDesktop) {
    document.getElementById('chat-contact-view').style.display = 'flex';
    document.getElementById('chat-active-view').style.display = 'flex';
    document.getElementById('chat-active-view').innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); background:#fafbfd; height:100%;">
        <div style="width:80px; height:80px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 30px rgba(0,0,0,0.04); margin-bottom:20px;">
          <span style="font-size:32px;">📩</span>
        </div>
        <div style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:8px;">Pesan Anda</div>
        <div style="font-size:13px; opacity:0.7; max-width:280px; text-align:center; line-height:1.6;">Pilih salah satu kontak di sisi kiri untuk mulai mengirim pesan atau melihat riwayat.</div>
      </div>
    `;
    document.getElementById('chat-header-name').textContent = 'Chat Terintegrasi';
    document.getElementById('chat-header-avatar').style.display = 'none';
    document.getElementById('chat-header-status').style.display = 'none';
    document.getElementById('chat-back-btn').style.display = 'none';
  } else {
    document.getElementById('chat-contact-view').style.display = 'flex';
    document.getElementById('chat-active-view').style.display = 'none';
    document.getElementById('chat-back-btn').style.display = 'none';
    document.getElementById('chat-header-avatar').style.display = 'none';
    document.getElementById('chat-header-name').textContent = 'Chat Terintegrasi';
    document.getElementById('chat-header-status').style.display = 'none';
  }
}

function selectContact(id, name) {
  selectedContactId = id;
  selectedContactName = name;
  const session = getCurrentSession();
  
  const isDesktop = window.innerWidth > 768;

  document.getElementById('chat-avatar-text').textContent = name.charAt(0);
  document.getElementById('chat-header-avatar').style.display = 'flex';
  document.getElementById('chat-header-name').textContent = name;
  document.getElementById('chat-header-status').style.display = 'block';

  // Refresh sidebar highlighting
  if (globalChatContacts && globalChatContacts.length > 0) {
    renderFilteredContacts(globalChatContacts);
  }
  
  if (isDesktop) {
    document.getElementById('chat-contact-view').style.display = 'flex';
    document.getElementById('chat-back-btn').style.display = 'none';
  } else {
    document.getElementById('chat-contact-view').style.display = 'none';
    document.getElementById('chat-back-btn').style.display = 'block';
  }
  
  document.getElementById('chat-active-view').style.display = 'flex';
  
  // Re-inject the original Chat View HTML if it was replaced by placeholder on desktop
  if (isDesktop && !document.getElementById('chat-messages-scroll')) {
      // Re-render chat view shell
      document.getElementById('chat-active-view').innerHTML = `
        <div class="messages-scroll" id="chat-messages-scroll"></div>
        <div id="chat-attachment-preview" style="display:none; align-items:center; justify-content:space-between; padding:8px 16px; background:var(--bg); border-top:1.5px solid var(--border); font-size:11px; color:var(--navy);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>📎</span>
            <span id="chat-attachment-name" style="font-weight:700; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">file.jpg</span>
          </div>
          <button onclick="clearChatAttachment()" style="border:none; background:none; color:var(--danger); cursor:pointer; font-weight:700; padding:4px;">✕</button>
        </div>
        <div class="input-area">
          <input type="file" id="chat-file-input" style="display:none;" onchange="handleChatFileSelect(this)">
          <button class="header-back" onclick="document.getElementById('chat-file-input').click()" title="Lampirkan file">📎</button>
          <textarea class="chat-input" id="chat-textarea" placeholder="Ketik pesan disini..." rows="1" oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px'" onkeypress="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); sendChat(); }"></textarea>
          <button class="icon-btn" style="background:var(--navy); color:white; width:38px; height:38px; border-radius:50%;" onclick="sendChat()">➤</button>
        </div>
      `;
  }

  const normalizedMyId = session.username.trim().toLowerCase();
  const normalizedOtherId = id.trim().toLowerCase();
  const chatId = [normalizedMyId, normalizedOtherId].sort().join('_');
  
  if (chatUnsubscribe) chatUnsubscribe();
  
  // Real-time listener for the messages subcollection
  chatUnsubscribe = db.collection('chats').doc(chatId).collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => messages.push(doc.data()));
      renderMessages(messages);
    }, err => {
      console.error("Chat subcollection error", err);
      renderMessages([]);
    });
}

function renderMessages(msgs) {
  const scroll = document.getElementById('chat-messages-scroll');
  const session = getCurrentSession();
  
  if (msgs.length === 0) {
    scroll.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); padding:40px 0;">
        <div style="font-size:32px; margin-bottom:12px;">💬</div>
        <div style="font-size:13px; font-weight:700; color:var(--text);">Belum ada percakapan</div>
        <div style="font-size:11px;">Ketik pesan di bawah untuk memulai</div>
      </div>
    `;
    return;
  }

  scroll.innerHTML = msgs.map((m, i) => {
    const isMe = m.senderId === session.username;
    const isSameSender = i > 0 && msgs[i-1].senderId === m.senderId;
    
    let attachmentHtml = '';
    if (m.attachment) {
      if (m.attachment.type.startsWith('image/')) {
        attachmentHtml = `<div style="margin-top:8px;"><img src="${m.attachment.data}" style="max-width:100%; border-radius:8px; cursor:pointer;" onclick="window.open('${m.attachment.data}')"></div>`;
      } else {
        attachmentHtml = `<div style="margin-top:8px;"><a href="${m.attachment.data}" download="${m.attachment.name}" style="color:inherit; text-decoration:underline; font-size:12px;">📎 ${m.attachment.name}</a></div>`;
      }
    }

    return `
      <div class="msg-row ${isMe ? 'me' : 'them'}" style="${isSameSender ? 'margin-top:-4px;' : 'margin-top:10px;'}">
        <div class="bubble">
          ${m.text}
          ${attachmentHtml}
          <div class="bubble-time" style="text-align:${isMe ? 'right' : 'left'}">${m.time}</div>
        </div>
      </div>
    `;
  }).join('');
  
  scroll.scrollTop = scroll.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById('chat-textarea');
  const btn = document.querySelector('.input-area button.icon-btn');
  const text = input.value.trim();
  
  if (!text && !currentChatAttachment) return;
  if (!selectedContactId) return;

  const session = getCurrentSession();
  const normalizedMyId = session.username.trim().toLowerCase();
  const normalizedOtherId = selectedContactId.trim().toLowerCase();
  const chatId = [normalizedMyId, normalizedOtherId].sort().join('_');
  
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const message = {
    senderId: session.username,
    senderName: session.nama,
    text, time,
    timestamp: new Date().toISOString(),
    attachment: currentChatAttachment
  };

  try {
    // Show sending state
    const originalBtn = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span style="font-size:10px;">⌛</span>';
    
    // 1. Add message to subcollection
    await db.collection('chats').doc(chatId).collection('messages').add(message);
    
    // 2. Update parent chat document metadata
    await db.collection('chats').doc(chatId).set({
      participants: [session.username, selectedContactId],
      participantNames: { [session.username]: session.nama, [selectedContactId]: selectedContactName },
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      lastSnippet: text || '📎 Lampiran file',
      lastSender: session.username
    }, { merge: true });

    input.value = '';
    input.style.height = 'auto';
    if (currentChatAttachment) clearChatAttachment();
    
    // Reset button
    btn.disabled = false;
    btn.innerHTML = originalBtn;
  } catch (err) {
    console.error("Failed to send message", err);
    showToast('❌ Gagal mengirim pesan', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '➤';
    }
  }
}

// ============ NOTIFICATIONS ============
function renderNotifications() {
  const session = getCurrentSession();
  const el = document.getElementById('notif-list');
  if (!el || !session) return;

  // Strictly filter: each user only sees notifications addressed to them
  const myNotifs = NOTIFS.filter(n => n.forUser === session.username);
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
let editingStokFirebaseId = null;

function openModalStok(drug = null) {
  editingStokFirebaseId = null;
  document.getElementById('stok-nama-input').value = '';
  document.getElementById('stok-jumlah-input').value = '';
  document.getElementById('stok-min-input').value = '50';
  document.getElementById('stok-exp-input').value = '';
  document.getElementById('stok-vendor-input').value = '';
  const titleEl = document.querySelector('#modal-stok .modal-title');
  if (titleEl) titleEl.textContent = 'Tambah Stok Obat';
  const btnEl = document.querySelector('button[onclick="simpanStok()"]');
  if (btnEl) btnEl.textContent = 'Simpan Stok';
  openModal('modal-stok');
}

function openModalStokForEdit(firebaseId) {
  const drug = DRUGS.find(d => d.firebaseId === firebaseId);
  if (!drug || !drug.firebaseId) return;
  editingStokFirebaseId = drug.firebaseId;
  document.getElementById('stok-nama-input').value = drug.name || '';
  document.getElementById('stok-jumlah-input').value = drug.stok ?? '';
  document.getElementById('stok-min-input').value = drug.min ?? '50';
  document.getElementById('stok-exp-input').value = drug.kadaluarsa || '';
  document.getElementById('stok-vendor-input').value = drug.pemasok || '';
  const titleEl = document.querySelector('#modal-stok .modal-title');
  if (titleEl) titleEl.textContent = 'Edit Stok Obat';
  const btnEl = document.querySelector('button[onclick="simpanStok()"]');
  if (btnEl) btnEl.textContent = 'Simpan Perubahan';
  openModal('modal-stok');
}

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
      <button class="alert-action" onclick="openModalStok()">Restock Sekarang</button>
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
          <button class="btn btn-primary" style="padding:4px 8px;font-size:10px;border-radius:6px;min-width:auto;margin-right:4px;" onclick="openModalStokForEdit('${(d.firebaseId || '').replace(/'/g, "\\'")}')">Edit</button>
          <button class="btn btn-danger" style="padding:4px 8px;font-size:10px;border-radius:6px;min-width:auto;" onclick="hapusStok('${(d.firebaseId || '').replace(/'/g, "\\'")}')">Hapus</button>
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
  
  if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
    const userDesa = session?.desa || session?.alamat;
    if (userDesa) {
      const cleanUserDesa = userDesa.replace('Desa ', '').trim();
      displayPickups = displayPickups.filter(p => {
        const patient = PATIENTS.find(pt => pt.name === p.patient);
        if (!patient) return false;
        if (patient.desa && session.desa && patient.desa === session.desa) return true;
        return patient.alamat && (patient.alamat === "Desa " + cleanUserDesa || patient.alamat === cleanUserDesa);
      });
    } else {
      displayPickups = [];
    }
  }

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
  
  const session = getCurrentSession();
  let filtered = PICKUPS.filter(p => {
    let pDate = p.date;
    if (pDate === 'Hari Ini') pDate = now.toISOString().split('T')[0];
    return pDate === dateStr;
  });

  if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
    const userDesa = session?.desa || session?.alamat;
    if (userDesa) {
      const cleanUserDesa = userDesa.replace('Desa ', '').trim();
      filtered = filtered.filter(p => {
        const patient = PATIENTS.find(pt => pt.name === p.patient);
        if (!patient) return false;
        if (patient.desa && session.desa && patient.desa === session.desa) return true;
        return patient.alamat && (patient.alamat === "Desa " + cleanUserDesa || patient.alamat === cleanUserDesa);
      });
    } else {
      filtered = [];
    }
  }
  
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
    
    // Create Notification for the creator (schedule created by session user)
    const sess = getCurrentSession();
    await db.collection('notifs').add({
      title: 'Jadwal Baru',
      desc: `Jadwal ${type === 'antar' ? 'Antar' : 'Jemput'} untuk ${patientName} pada ${date}.`,
      type: 'warning',
      icon: '🚗',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'jadwal-ambil',
      forUser: sess.username
    });

    // Also notify all pemegang program so they can monitor the schedule
    if (sess.role === 'pendamping' || sess.role === 'petugas') {
      try {
        const pemegangSnap = await db.collection('users').where('role', '==', 'pemegang').get();
        const notifTimestamp = new Date().toISOString();
        const pemegangNotifs = [];
        pemegangSnap.forEach(doc => {
          pemegangNotifs.push(db.collection('notifs').add({
            title: 'Jadwal Baru Dibuat',
            desc: `${sess.nama} membuat jadwal ${type === 'antar' ? 'antar obat' : 'jemput'} untuk ${patientName} pada ${date}.`,
            type: 'warning',
            icon: '🚗',
            unread: true,
            timestamp: notifTimestamp,
            act: 'jadwal-ambil',
            forUser: doc.id
          }));
        });
        await Promise.all(pemegangNotifs);
      } catch (e) {
        console.warn('Could not notify pemegang about new schedule:', e);
      }
    }
    
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
async function renderLaporan() {
  // Optimization: only render if page is active to save Firestore reads
  const pageLaporan = document.getElementById('page-laporan');
  if (!pageLaporan || pageLaporan.classList.contains('hidden')) return;

  const session = getCurrentSession();

  // Start from role-filtered pool
  let displayPatients = getMyPatients(session);

  // Apply additional desa filter from dropdown (admin/pemegang can filter by desa)
  const desaFilterEl = document.getElementById('laporan-filter-desa');
  const selectedDesa = desaFilterEl ? desaFilterEl.value.trim() : '';
  if (selectedDesa) {
    const cleanSelected = normalizeDesa(selectedDesa);
    displayPatients = displayPatients.filter(p =>
      normalizeDesa(p.desa) === cleanSelected ||
      normalizeDesa(p.alamat) === cleanSelected
    );
  }

  // Apply additional tahun filter from dropdown
  const tahunFilterEl = document.getElementById('laporan-filter-tahun');
  const selectedTahun = tahunFilterEl ? tahunFilterEl.value : '';
  if (selectedTahun) {
    displayPatients = displayPatients.filter(p => {
      const d = new Date(p.createdAt || p.id);
      return d.getFullYear().toString() === selectedTahun;
    });
  }

  // Update filter info label
  const filterInfo = document.getElementById('laporan-filter-info');
  if (filterInfo) {
    filterInfo.textContent = selectedDesa
      ? `${displayPatients.length} pasien di ${selectedDesa}`
      : `${displayPatients.length} pasien total`;
  }

  const totalPasien = displayPatients.length;
  const compliantCount = displayPatients.filter(p => (p.pmo || 0) >= 80).length;
  const avgPmo = totalPasien > 0 ? Math.round(displayPatients.reduce((sum, p) => sum + (p.pmo || 0), 0) / totalPasien) : 0;

  // Show initial summary while PMO count loads
  const renderSummary = (pmoCount) => {
    document.getElementById('laporan-summary').innerHTML = [
      ['Total Pasien', totalPasien],
      ['Pasien Patuh (≥80%)', compliantCount],
      ['PMO Tercatat', pmoCount],
      ['Kepatuhan Rata-rata', `${avgPmo}%`],
    ].map(([l, v]) => `<div class="report-row"><div class="report-label">${l}</div><div class="report-val">${v}</div></div>`).join('');
  };

  renderSummary('⌛'); // Show loading placeholder

  // Fetch real PMO log counts from Firestore subcollections (in parallel)
  let pmoTercatat = 0;
  try {
    const patientsWithId = displayPatients.filter(p => p.firebaseId);
    const countResults = await Promise.all(
      patientsWithId.map(p =>
        db.collection('patients').doc(p.firebaseId).collection('pmo_logs').get()
          .then(snap => snap.size)
          .catch(() => 0)
      )
    );
    pmoTercatat = countResults.reduce((sum, c) => sum + c, 0);
  } catch (e) {
    console.warn('Could not fetch PMO log counts:', e);
    pmoTercatat = 0;
  }

  renderSummary(pmoTercatat);

  renderKepatuhanObat(1);
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

window.kepatuhanPage = 1;
function renderKepatuhanObat(page) {
  const session = getCurrentSession();
  let displayPatients = getMyPatients(session);
  const desaFilterEl = document.getElementById('laporan-filter-desa');
  const selectedDesa = desaFilterEl ? desaFilterEl.value.trim() : '';
  if (selectedDesa) {
    const cleanSelected = normalizeDesa(selectedDesa);
    displayPatients = displayPatients.filter(p => normalizeDesa(p.desa) === cleanSelected || normalizeDesa(p.alamat) === cleanSelected);
  }

  const searchEl = document.getElementById('kepatuhan-search');
  if (searchEl && searchEl.value.trim()) {
    const q = searchEl.value.trim().toLowerCase();
    displayPatients = displayPatients.filter(p => p.name.toLowerCase().includes(q));
  }

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(displayPatients.length / perPage));
  if (page !== undefined) window.kepatuhanPage = page;
  if (window.kepatuhanPage < 1) window.kepatuhanPage = 1;
  if (window.kepatuhanPage > totalPages) window.kepatuhanPage = totalPages;

  const start = (window.kepatuhanPage - 1) * perPage;
  const paginated = displayPatients.slice(start, start + perPage);

  document.getElementById('laporan-kepatuhan').innerHTML = paginated.map(p => `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;">
        <span style="font-weight:600;color:var(--text-dark);">${p.name}</span><span style="font-weight:800;color:${(p.pmo || 0) >= 80 ? 'var(--success)' : (p.pmo || 0) >= 50 ? 'var(--warning)' : 'var(--danger)'};">${p.pmo || 0}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.pmo || 0}%;background:${(p.pmo || 0) >= 80 ? 'var(--success)' : (p.pmo || 0) >= 50 ? 'var(--warning)' : 'var(--danger)'}"></div></div>
    </div>
  `).join('') || '<div style="color:var(--text-muted);text-align:center;padding:20px;font-size:12px;">Belum ada data kepatuhan</div>';

  const infoEl = document.getElementById('kepatuhan-page-info');
  if (infoEl) infoEl.textContent = `Hal ${window.kepatuhanPage} dari ${totalPages}`;
}


function downloadReportExcel() {
  const session = getCurrentSession();
  
  // Apply the same filters as the UI
  let displayPatients = getMyPatients(session);
  const desaFilterEl = document.getElementById('laporan-filter-desa');
  const selectedDesa = desaFilterEl ? desaFilterEl.value.trim() : '';
  if (selectedDesa) {
    const cleanSelected = normalizeDesa(selectedDesa);
    displayPatients = displayPatients.filter(p =>
      normalizeDesa(p.desa) === cleanSelected ||
      normalizeDesa(p.alamat) === cleanSelected
    );
  }

  const tahunFilterEl = document.getElementById('laporan-filter-tahun');
  const selectedTahun = tahunFilterEl ? tahunFilterEl.value : '';
  if (selectedTahun) {
    displayPatients = displayPatients.filter(p => {
      const d = new Date(p.createdAt || p.id);
      return d.getFullYear().toString() === selectedTahun;
    });
  }

  if (displayPatients.length === 0) {
    showToast('❌ Tidak ada data untuk diekspor', 'error');
    return;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  // Build CSV rows
  const headers = ['No', 'Nama Pasien', 'Usia', 'Jenis Kelamin', 'Diagnosis', 'Status', 'Obat Utama', 'Kepatuhan PMO (%)', 'Pendamping', 'Alamat', 'Tanggal Daftar'];
  const csvRows = [headers];

  displayPatients.forEach((p, i) => {
    csvRows.push([
      i + 1,
      p.name || '-',
      p.age || '-',
      p.gender === 'L' ? 'Laki-laki' : (p.gender === 'P' ? 'Perempuan' : '-'),
      p.diagnosis || '-',
      p.status || '-',
      (p.obat || '-').replace(/,/g, ';'), // escape commas in drug names
      p.pmo || 0,
      (p.pendamping || '-').replace(/,/g, ';'),
      (p.alamat || '-').replace(/,/g, ';'),
      p.createdAt ? p.createdAt.split('T')[0] : '-'
    ]);
  });

  // Summary rows
  csvRows.push([]);
  csvRows.push(['--- RINGKASAN ---']);
  csvRows.push(['Total Pasien', displayPatients.length]);
  csvRows.push(['Pasien Patuh (≥80%)', displayPatients.filter(p => (p.pmo||0) >= 80).length]);
  const avgPmo = displayPatients.length > 0 ? Math.round(displayPatients.reduce((s, p) => s + (p.pmo || 0), 0) / displayPatients.length) : 0;
  csvRows.push(['Rata-rata Kepatuhan', `${avgPmo}%`]);
  csvRows.push([]);
  csvRows.push(['Laporan dibuat oleh:', session.nama, 'pada', `${dateStr} ${timeStr}`]);

  // Convert to CSV string
  const csvContent = '\uFEFF' + csvRows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Laporan_SiJagaJiwa_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('✅ Laporan berhasil diekspor ke Excel!', 'success');
}

async function downloadReportPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('❌ Gagal memuat library PDF, periksa koneksi internet', 'error');
    return;
  }
  
  const session = getCurrentSession();
  let displayPatients = getMyPatients(session);
  
  const desaFilterEl = document.getElementById('laporan-filter-desa');
  const selectedDesa = desaFilterEl ? desaFilterEl.value.trim() : '';
  if (selectedDesa) {
    const cleanSelected = normalizeDesa(selectedDesa);
    displayPatients = displayPatients.filter(p =>
      normalizeDesa(p.desa) === cleanSelected ||
      normalizeDesa(p.alamat) === cleanSelected
    );
  }

  const tahunFilterEl = document.getElementById('laporan-filter-tahun');
  const selectedTahun = tahunFilterEl ? tahunFilterEl.value : '';
  if (selectedTahun) {
    displayPatients = displayPatients.filter(p => {
      const d = new Date(p.createdAt || p.id);
      return d.getFullYear().toString() === selectedTahun;
    });
  }

  if (displayPatients.length === 0) {
    showToast('❌ Tidak ada data untuk diekspor', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('id-ID');
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(15, 76, 129); // var(--navy)
  doc.text('Laporan Sistem SiJaga Jiwa', 105, 20, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  const wilayahStr = selectedDesa ? selectedDesa : 'Semua Wilayah';
  doc.text(`Wilayah: ${wilayahStr} | Tanggal: ${today}`, 105, 28, { align: 'center' });
  
  // Summary Data
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const totalPasien = displayPatients.length;
  const compliantCount = displayPatients.filter(p => (p.pmo || 0) >= 80).length;
  const avgPmo = totalPasien > 0 ? Math.round(displayPatients.reduce((sum, p) => sum + (p.pmo || 0), 0) / totalPasien) : 0;
  
  doc.text(`Total Pasien: ${totalPasien}`, 14, 40);
  doc.text(`Pasien Patuh (≥80%): ${compliantCount}`, 14, 46);
  doc.text(`Rata-rata Kepatuhan: ${avgPmo}%`, 14, 52);
  doc.text(`Dicetak Oleh: ${session.nama} (${session.role})`, 14, 58);

  // Table
  doc.autoTable({
    startY: 65,
    head: [['No', 'Nama', 'Usia', 'Diagnosis', 'Status', 'Kepatuhan', 'Desa/Alamat']],
    body: displayPatients.map((p, i) => [
      i + 1,
      p.name || '-',
      p.age || '-',
      p.diagnosis || '-',
      p.status || '-',
      `${p.pmo || 0}%`,
      p.desa || p.alamat || '-'
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 76, 129] }
  });
  
  doc.save(`laporan-sijagajiwa-${today.replace(/\//g, '-')}.pdf`);
  showToast('✅ Laporan PDF berhasil diunduh!', 'success');
}

async function renderLaporanPetugas() {
  const el = document.getElementById('laporan-petugas-body');
  if (!el) return;

  el.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text-muted);">⌛ Memuat data aktivitas petugas...</td></tr>';

  try {
    const petugasList = USERS.filter(u => u.role === 'petugas' || u.role === 'pendamping' || u.role === 'pemegang');
    if (petugasList.length === 0) {
      el.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text-muted);">Tidak ada akun yang dapat dimonitor</td></tr>';
      return;
    }

    const results = await Promise.all(petugasList.map(async petugas => {
      const desaList = getUserDesas(petugas);
      const roleLabel = petugas.role.charAt(0).toUpperCase() + petugas.role.slice(1);
      const wilayahText = desaList.length > 0 ? desaList.join(', ') : (petugas.instansi || '-');
      const roleWilayah = `<span style="font-size:10px;color:var(--primary);">${roleLabel}</span><br>${wilayahText}`;
      
      // Hitung pasien yang menjadi tanggung jawab petugas ini
      const myPatients = PATIENTS.filter(p => 
        desaList.includes(normalizeDesa(p.desa)) || 
        desaList.includes(normalizeDesa(p.alamat))
      );
      
      let totalPmo = 0;
      let lastActive = null;
      
      // Ambil log PMO dari pasien-pasien petugas tersebut
      for (const p of myPatients) {
        if (!p.firebaseId) continue;
        const countSnap = await db.collection('patients').doc(p.firebaseId)
          .collection('pmo_logs')
          .where('recordedBy', '==', petugas.nama)
          .get().catch(() => ({ size: 0, empty: true, docs: [] }));
        
        const count = countSnap.size;
        if (count > 0) {
          totalPmo += count;
          // Optimasi: karena sudah di .get(), kita bisa memilah timestamp tanpa query lagi
          const latestDoc = countSnap.docs.sort((a,b) => (b.data().timestamp || '').localeCompare(a.data().timestamp || ''))[0];
          if (latestDoc) {
            const ts = latestDoc.data().timestamp;
            if (!lastActive || ts > lastActive) {
              lastActive = ts;
            }
          }
        }
      }
      
      return { petugas, desaList, roleWilayah, myPatientsCount: myPatients.length, totalPmo, lastActive };
    }));
    
    // Sort berdasarkan aktivitas terakhir (paling baru di atas)
    results.sort((a, b) => {
      if (!a.lastActive) return 1;
      if (!b.lastActive) return -1;
      return new Date(b.lastActive) - new Date(a.lastActive);
    });

    el.innerHTML = results.map(r => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:10px;font-weight:600;color:var(--text-dark);">${r.petugas.nama}</td>
        <td style="padding:10px;color:var(--text-muted);font-size:12px;">${r.roleWilayah}</td>
        <td style="padding:10px;text-align:center;font-weight:600;">${r.myPatientsCount}</td>
        <td style="padding:10px;text-align:center;color:var(--primary);font-weight:600;">${r.totalPmo}</td>
        <td style="padding:10px;text-align:center;font-size:11px;color:var(--text-muted);">
          ${r.lastActive ? new Date(r.lastActive).toLocaleString('id-ID', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Belum pernah'}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Failed to render petugas report:', e);
    el.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--danger);">❌ Gagal memuat data aktivitas</td></tr>';
  }
}

/**
 * Download a sample CSV template for patient import
 */
function downloadCsvTemplate() {
  const headers = ['Nama Pasien', 'Usia', 'Jenis Kelamin (L/P)', 'Diagnosis', 'Status (Pulih/Relapse/Monitor)', 'Obat Utama', 'Pendamping', 'Alamat', 'Tanggal Daftar (YYYY-MM-DD)'];
  const sampleData = ['Budi Santoso', '45', 'L', 'Skizofrenia', 'Monitor', 'Risperidone 2mg', 'Istri', 'Desa Kokop', '2024-05-20'];
  const csvContent = '\uFEFF' + [
    headers.map(h => `"${h}"`).join(','),
    sampleData.map(d => `"${d}"`).join(',')
  ].join('\r\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = "template_import_pasien.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Handle CSV file selection and reading
 */
function handleCSVImport(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    await processCSVData(text);
    input.value = ''; // Reset input
  };
  reader.onerror = () => showToast('❌ Gagal membaca file', 'error');
  reader.readAsText(file);
}

/**
 * Parse CSV text and upload to Firestore
 */
async function processCSVData(csvText) {
  try {
    // Basic CSV parser that handles quotes
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      showToast('❌ File CSV kosong atau tidak valid', 'error');
      return;
    }

    const headers = parseCSVLine(lines[0]);
    const dataRows = lines.slice(1);
    
    showToast(`⏳ Mengimpor ${dataRows.length} pasien...`, 'info');
    
    let importedCount = 0;
    const batch = db.batch();

    for (const row of dataRows) {
      const values = parseCSVLine(row);
      if (values.length < headers.length) continue;

      const pData = {};
      headers.forEach((header, index) => {
        const val = values[index];
        if (!val) return;

        const h = header.toLowerCase();
        if (h.includes('nama')) pData.name = val;
        else if (h.includes('usia')) pData.age = parseInt(val) || 0;
        else if (h.includes('jenis kelamin')) pData.gender = val.toUpperCase().startsWith('L') ? 'L' : 'P';
        else if (h.includes('diagnosis')) pData.diagnosis = val;
        else if (h.includes('status')) {
          const s = val.toLowerCase();
          if (s.includes('pulih')) pData.status = 'pulih';
          else if (s.includes('relapse')) pData.status = 'relapse';
          else pData.status = 'monitor';
        }
        else if (h.includes('obat')) pData.obat = val;
        else if (h.includes('pendamping')) pData.pendamping = val;
        else if (h.includes('alamat')) pData.alamat = val;
        else if (h.includes('tanggal daftar')) {
          // Attempt to parse YYYY-MM-DD
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            pData.createdAt = d.toISOString();
          }
        }
      });

      if (!pData.name) continue;

      // Add metadata
      const newDocRef = db.collection('patients').doc();
      pData.firebaseId = newDocRef.id;
      pData.createdAt = pData.createdAt || new Date().toISOString();
      pData.lastUpdate = new Date().toISOString();
      pData.pmo = 0; 

      batch.set(newDocRef, pData);
      importedCount++;
    }

    await batch.commit();
    showToast(`✅ Berhasil mengimpor ${importedCount} pasien!`, 'success');
    
    // Refresh app state
    if (typeof loadDataFromFirestore === 'function') {
      await loadDataFromFirestore();
      renderFullPatients();
      renderDashboardPatients();
      renderLaporan();
    }
  } catch (err) {
    console.error("CSV Import Error:", err);
    showToast('❌ Gagal mengimpor data: ' + err.message, 'error');
  }
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

  // Dynamic Instansi & Jabatan
  const instansiRow = document.getElementById('profil-row-3');
  const instansiEl = document.getElementById('profil-instansi');
  const jabatanEl = document.getElementById('profil-jabatan');
  if (instansiRow) {
    if (currentRole === 'dokter' || currentRole === 'pemegang' || currentRole === 'petugas' || currentRole === 'admin') {
      instansiRow.style.display = 'flex';
      if (instansiEl) instansiEl.value = session?.instansi || '';
      if (jabatanEl) jabatanEl.value = session?.jabatan || '';
    } else {
      instansiRow.style.display = 'none';
    }
  }

  // Dynamic Desa Multi-Select
  const desaContainer = document.getElementById('profil-desa-container');
  const desaMulti = document.getElementById('profil-desa-multiselect');
  if (desaContainer && desaMulti) {
    if (currentRole === 'petugas' || currentRole === 'pendamping') {
      desaContainer.style.display = 'block';
      const allDesas = [
        "Alas Rajah", "Bates", "Blega", "Blega Oloh", "Gigir", "Kajjan", "Kampao",
        "Karang Gayam", "Karang Nangkah", "Karang Panasan", "Karpote", "Ko'olan",
        "Lomaer", "Lombang Dajah", "Lombang Laok", "Nyor Manes", "Pangeran Gedungan",
        "Panjalinan", "Rosep"
      ];
      const userDesas = getUserDesas(session);
      
      desaMulti.innerHTML = allDesas.map(d => {
        const isChecked = userDesas.includes(normalizeDesa(d));
        return `
          <label style="display:flex;align-items:center;gap:6px;background:#fff;padding:6px 12px;border:1px solid var(--border);border-radius:20px;cursor:pointer;">
            <input type="checkbox" value="${d}" ${isChecked ? 'checked' : ''} style="margin:0;" class="profil-desa-checkbox">
            <span style="font-size:12px;font-weight:${isChecked ? '600' : '400'};">${d}</span>
          </label>
        `;
      }).join('');
    } else {
      desaContainer.style.display = 'none';
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
          <div style="font-size:12px; color:#7f1d1d; margin-bottom:12px;">Fitur ini akan menghapus SELURUH data pasien, jadwal, stok obat, dan chat secara permanen.</div>
          <button class="btn btn-danger" style="width:100%; font-size:13px; padding:10px; margin-bottom:8px;" onclick="resetDatabaseToEmpty()">
            ⚠️ Kosongkan Seluruh Data Dasar (Kecuali Akun)
          </button>
          <button class="btn" style="width:100%; font-size:13px; padding:10px; background:#f59e0b; color:white; border:none; border-radius:8px; cursor:pointer;" onclick="window.forceSeed=true; window.seedDefaultUsers().then(() => { showToast('✅ Akun default berhasil dipulihkan!', 'success'); setTimeout(() => window.location.reload(), 1500); })">
            ♻️ Pulihkan Seluruh Akun Default
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
  
  if (currentRole === 'dokter' || currentRole === 'pemegang' || currentRole === 'petugas' || currentRole === 'admin') {
    updates.instansi = document.getElementById('profil-instansi')?.value || '';
    updates.jabatan = document.getElementById('profil-jabatan')?.value || '';
  }
  
  if (currentRole === 'petugas' || currentRole === 'pendamping') {
    const checkboxes = document.querySelectorAll('.profil-desa-checkbox:checked');
    const selectedDesas = Array.from(checkboxes).map(cb => cb.value);
    updates.desas = selectedDesas;
    // Update legacy field for backward compatibility
    if (selectedDesas.length > 0) {
      if (currentRole === 'petugas') updates.desa = selectedDesas[0];
      if (currentRole === 'pendamping') updates.alamat = selectedDesas[0];
    }
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

async function updateProfilePhoto(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  
  if (!file.type.startsWith('image/')) {
    showToast('❌ File harus berupa gambar', 'error');
    return;
  }
  
  showToast('⏳ Memproses gambar...', '');

  try {
    // Compress image
    const compressed = await compressImageBase64(file, 150, 0.7);
    
    // Size check (max ~100KB)
    if (compressed.length > 150000) {
      showToast('❌ Gambar terlalu besar. Pilih gambar lain.', 'error');
      return;
    }
    
    // Preview immediately
    const avatarEl = document.getElementById('profil-avatar-big');
    if (avatarEl) {
      avatarEl.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
    
    // Save to Firestore
    const session = getCurrentSession();
    if (!session || !session.username) throw new Error('No session');
    
    await db.collection('users').doc(session.username).update({ photo: compressed });
    
    // Update session
    session.photo = compressed;
    localStorage.setItem('siodgj_session', JSON.stringify(session));
    if (typeof syncUserUI === 'function') syncUserUI();
    
    showToast('✅ Foto profil berhasil diperbarui!', 'success');
  } catch (err) {
    console.error("Failed to update photo", err);
    showToast('❌ Gagal memperbarui foto', 'error');
  }
}

/**
 * Helper: Compress image to base64
 */
function compressImageBase64(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
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
  const desa = document.getElementById('tp-desa')?.value;

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
    desa: desa || '-',
    createdAt: new Date().toISOString(),
    ...getAuditFields('created'),
  };

  try {
    const docRef = await db.collection('patients').add(newPatient);
    
    // Create Notification for creator
    const sess2 = getCurrentSession();
    await db.collection('notifs').add({
      title: 'Pasien Baru',
      desc: `${name} telah berhasil didaftarkan ke sistem.`,
      type: 'info',
      icon: '👤',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'data-pasien',
      forUser: sess2.username
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

function openPmoModal() {
  const isPetugas = currentRole === 'petugas';
  const display = isPetugas ? 'none' : 'block';
  
  document.getElementById('pmo-group-obat').style.display = display;
  document.getElementById('pmo-group-waktu').style.display = display;
  document.getElementById('pmo-group-status').style.display = display;
  
  openModal('modal-pmo');
}

async function simpanPMO() {
  const pasienName = document.getElementById('pmo-pasien-input')?.value;
  const obatName = document.getElementById('pmo-obat-input')?.value;
  const waktu = document.getElementById('pmo-waktu-input')?.value;
  const status = document.getElementById('pmo-status-select')?.value;
  const gejala = document.getElementById('pmo-gejala-input')?.value || '';
  const catatan = document.getElementById('pmo-catatan-input')?.value || '';
  
  const isPetugas = currentRole === 'petugas';
  
  // IMMEDIATELY disable button to prevent double submits during file processing/matching
  const btnSubmit = document.querySelector('button[onclick="simpanPMO()"]');
  if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerText = '⌛ Memproses...'; }

  try {
    if(!pasienName || (!isPetugas && (!obatName || !waktu))) {
      showToast('❌ Pasien, Obat, dan Waktu wajib diisi!', 'error');
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = 'Simpan PMO'; }
      return;
    }

    const patient = PATIENTS.find(p => p.name === pasienName);
    if (!patient) {
      showToast('❌ Pasien tidak ditemukan!', 'error');
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = 'Simpan PMO'; }
      return;
    }

  // Handle file input if exists (convert to base64 for simplicity in demo)
  const fileInput = document.getElementById('pmo-foto-bukti');
  let base64Foto = null;

  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    
    // Validate file size before compression (max 10MB to avoid browser hang)
    if (file.size > 10 * 1024 * 1024) {
       showToast('❌ Gambar terlalu besar (Maks 10MB)', 'error');
       return;
    }

    try {
      // More aggressive compression: 800px width, 0.5 quality to ensure payload < 200KB
      base64Foto = await compressImage(file, 0.5, 800); 
    } catch(err) {
      console.warn("Failed to compress image file", err);
      // Fallback to raw if compression fails (though unlikely)
      base64Foto = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }
  }

  // For petugas, handle missing fields with defaults
  let finalObat = obatName;
  let finalWaktu = waktu;
  let finalStatus = status;

  if (isPetugas) {
    if (!finalObat) finalObat = patient.obat || 'Obat Rutin';
    if (!finalWaktu) {
      const now = new Date();
      finalWaktu = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
    finalStatus = 'done'; // Always success if recorded by health officer directly
  }

  // Create new PMO Log entry
  const session = getCurrentSession();
  const pmoEntry = {
    waktu: finalWaktu,
    obat: finalObat,
    status: finalStatus, // done, pending, missed
    gejala: gejala,
    catatan: catatan,
    foto: base64Foto, // Optional base64 image
    recordedBy: session?.nama || 'Unknown',
    recorderRole: session?.role || 'user',
    timestamp: new Date().toISOString()
  };

  if (btnSubmit) { btnSubmit.innerText = '⌛ Mencatat...'; }

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

    if (btnSubmit) { btnSubmit.innerText = '⌛ Mencatat...'; }

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

    // Create Notification: notify the assigned doctor (if any) and the recorder
    const sessNow = getCurrentSession();
    const notifPromises = [];
    // Always notify the recorder
    notifPromises.push(db.collection('notifs').add({
      title: 'PMO Dicatat',
      desc: `Pencatatan obat untuk ${pasienName} telah disimpan oleh Anda.`,
      type: 'success',
      icon: '💊',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'pmo',
      forUser: sessNow.username
    }));
    // Also notify the assigned doctor if one exists
    if (patient.assignedDoctorId) {
      notifPromises.push(db.collection('notifs').add({
        title: 'Update PMO Pasien',
        desc: `Konsumsi obat ${pasienName} baru saja dicatat oleh ${sessNow.nama}.`,
        type: 'info',
        icon: '💊',
        unread: true,
        timestamp: new Date().toISOString(),
        act: 'data-pasien',
        forUser: patient.assignedDoctorId
      }));
    }
    await Promise.all(notifPromises);
    
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

  // Rewrite modal header title and body for the "PMO History" mode
  const titleEl = document.querySelector('#modal-pmo-detail .modal-title');
  if (titleEl) titleEl.textContent = `📋 Riwayat PMO: ${patient.name}`;

  const bodyEl = document.querySelector('#modal-pmo-detail .modal-body');
  if (bodyEl) bodyEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">Memuat riwayat PMO...</div>';

  openModal('modal-pmo-detail');

  try {
    const snapshot = await db.collection('patients').doc(patient.firebaseId).collection('pmo_logs').orderBy('timestamp', 'desc').get();
    
    const body = document.querySelector('#modal-pmo-detail .modal-body');
    if (!body) return;

    if (snapshot.empty) {
      body.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted)">Belum ada riwayat PMO</div>';
      return;
    }

    const logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));

    body.innerHTML = logs.map(log => {
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

      let recordedHtml = '';
      if (log.recordedBy) {
         const roleLabel = ROLE_INFO[log.recorderRole]?.label || log.recorderRole;
         recordedHtml = `<div style="font-size:10px; margin-top:6px; color:var(--primary); font-weight:600;">✍️ Dicatat oleh: ${log.recordedBy} (${roleLabel})</div>`;
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
              <div style="font-size:14px; font-weight:600;">💊 ${log.obat || '-'}</div>
            </div>
            <div style="background:${statusBg}; color:${statusColor}; font-size:11px; padding:4px 8px; border-radius:12px; font-weight:600;">
              ${statusIcon} ${statusLabel}
            </div>
          </div>
          ${gejalaHtml}
          ${catatanHtml}
          ${recordedHtml}
          ${fotoHtml}
        </div>
      `;
    }).join('') + `<button class="btn btn-primary" style="width:calc(100% - 32px); margin:16px;" onclick="closeModal('modal-pmo-detail')">Tutup</button>`;

  } catch (e) {
    console.error("Failed to load PMO history", e);
    const body = document.querySelector('#modal-pmo-detail .modal-body');
    if (body) body.innerHTML = '<div style="padding:20px; text-align:center; color:var(--danger)">Gagal memuat riwayat</div>';
  }
}

// ============ PATIENT EDIT ============
function openEditPatient() {
  if (currentRole !== 'pemegang' && currentRole !== 'petugas' && currentRole !== 'admin') {
    showToast('❌ Anda tidak memiliki akses untuk mengedit pasien', 'error');
    return;
  }
  const pName = document.getElementById('detail-name-text').textContent.trim();
  const p = PATIENTS.find(x => x.name === pName);
  if (!p) return;

  document.getElementById('edit-p-id').value = p.firebaseId || '';
  document.getElementById('edit-p-nama').value = p.name;
  document.getElementById('edit-p-nik').value = p.nik || '';
  document.getElementById('edit-p-diag').value = p.diagnosis || '';
  document.getElementById('edit-p-status').value = p.status || 'stable';
  document.getElementById('edit-p-alamat').value = p.alamat || '';
  document.getElementById('edit-p-desa').value = p.desa || '';
  document.getElementById('edit-p-tgl').value = p.tanggal_lahir || '';
  document.getElementById('edit-p-jk').value = p.gender || 'L';
  document.getElementById('edit-p-pendamping').value = p.pendamping || '';
  document.getElementById('edit-p-obat').value = p.obat || '';
  
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
  const desa = document.getElementById('edit-p-desa').value;
  const tgl = document.getElementById('edit-p-tgl').value;
  const jk = document.getElementById('edit-p-jk').value;
  const pendamping = document.getElementById('edit-p-pendamping').value;
  const obat = document.getElementById('edit-p-obat').value;

  if (!name) {
    showToast('❌ Nama wajib diisi!', 'error');
    return;
  }

  try {
    const pLocal = PATIENTS.find(x => x.firebaseId === fid);
    let age = pLocal?.age || 30;
    if (tgl) {
      const birthYear = new Date(tgl).getFullYear();
      age = new Date().getFullYear() - birthYear;
    }

    if (fid) {
      await db.collection('patients').doc(fid).update({
        name, nik, diagnosis: diag, status, alamat, desa,
        tanggal_lahir: tgl, gender: jk, pendamping, obat, age
      });
    }

    // Update local array
    if (pLocal) {
      pLocal.name = name;
      pLocal.nik = nik;
      pLocal.diagnosis = diag;
      pLocal.status = status;
      pLocal.alamat = alamat;
      pLocal.desa = desa;
      pLocal.tanggal_lahir = tgl;
      pLocal.gender = jk;
      pLocal.pendamping = pendamping;
      pLocal.obat = obat;
      pLocal.age = age;
    }

    closeModal('modal-edit-pasien');
    showToast('✅ Data pasien berhasil diperbarui!', 'success');
    
    // Refresh detail page
    if (pLocal) showPatientDetail(pLocal.id);
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
    const drugData = {
      name: name,
      stok: jumlah,
      min: min,
      kadaluarsa: exp,
      pemasok: vendor,
      lastUpdated: new Date().toISOString(),
      ...getAuditFields('updated'),
    };

    if (editingStokFirebaseId) {
      await db.collection('drugs').doc(editingStokFirebaseId).update(drugData);
      showToast('✅ Stok obat berhasil diperbarui!', 'success');
    } else {
      const existingDrug = DRUGS.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (existingDrug && existingDrug.firebaseId) {
        await db.collection('drugs').doc(existingDrug.firebaseId).update(drugData);
        showToast('✅ Stok obat berhasil diperbarui!', 'success');
      } else {
        await db.collection('drugs').add(drugData);
        showToast('✅ Obat baru berhasil ditambahkan!', 'success');
      }
    }

    closeModal('modal-stok');
    editingStokFirebaseId = null;

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

async function hapusStok(firebaseId) {
  if (!confirm('Hapus obat ini dari inventaris? Penghapusan bersifat permanen.')) return;
  if (!firebaseId) {
    showToast('❌ ID obat tidak valid', 'error');
    return;
  }
  try {
    await db.collection('drugs').doc(firebaseId).delete();
    showToast('🗑️ Obat berhasil dihapus secara permanen', 'success');
    renderStokFull();
    if (typeof renderStockAlerts === 'function') renderStockAlerts();
    if (typeof renderDashboardPMO === 'function') renderDashboardPMO();
  } catch (e) {
    console.error('Failed to delete drug:', e);
    showToast('❌ Gagal menghapus obat', 'error');
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
  const doctorId = (document.getElementById('cons-doctor-select').value || '').toLowerCase();
  const note = document.getElementById('cons-note').value;
  
  if (!activeConsultationPatientId) {
    showToast('❌ Gagal: Data pasien tidak valid', 'error');
    return;
  }
  
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
    console.log(`[Consultation] Saved for patient ${activeConsultationPatientId} to doctor: ${doctorId}`);
    closeModal('modal-consultation');
    activeConsultationPatientId = null; // Clear after success
    
    // Refresh list data
    renderFullPatients();
  } catch (e) {
    console.error("Failed to save consultation:", e);
    showToast('❌ Gagal mengirim pasien', 'error');
  }
}

// ============ MANAJEMEN AKUN (ADMIN) ============
const ROLE_COLORS = {
  admin:      { color: '#7c3aed', bg: '#f5f3ff', icon: '👑' },
  dokter:     { color: '#0891b2', bg: '#ecfeff', icon: '👨‍⚕️' },
  pemegang:   { color: '#059669', bg: '#ecfdf5', icon: '📊' },
  petugas:    { color: '#d97706', bg: '#fffbeb', icon: '🏥' },
  pendamping: { color: '#db2777', bg: '#fdf2f8', icon: '👨‍👩‍👧' },
};

let _akunFilterRole = 'all';
let _akunSearch = '';

function setAkunFilter(role, btn) {
  _akunFilterRole = role;
  document.querySelectorAll('.akun-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterAkun();
}

function filterAkun() {
  const search = (document.getElementById('akun-search')?.value || '').toLowerCase();
  _akunSearch = search;
  _renderAkunCards();
}

function renderManajemenAkun() {
  try {
    // Render stats row
    const statsEl = document.getElementById('akun-stats-row');
    if (statsEl && USERS.length > 0) {
      const roleCounts = {};
      USERS.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });
      const statsItems = [
        { label: 'Total Akun', num: USERS.length, color: '#0f4c81' },
        { label: 'Dokter', num: roleCounts.dokter || 0, color: '#0891b2' },
        { label: 'Petugas', num: roleCounts.petugas || 0, color: '#d97706' },
        { label: 'Pemegang', num: roleCounts.pemegang || 0, color: '#059669' },
        { label: 'Pendamping', num: roleCounts.pendamping || 0, color: '#db2777' },
        { label: 'Admin', num: roleCounts.admin || 0, color: '#7c3aed' },
      ];
      statsEl.innerHTML = statsItems.map(s => `
        <div class="akun-stat-mini" onclick="setAkunFilter('${s.label === 'Total Akun' ? 'all' : s.label.toLowerCase()}', null)">
          <div class="stat-num" style="color:${s.color};">${s.num}</div>
          <div class="stat-lbl">${s.label}</div>
        </div>
      `).join('');
    }

    _renderAkunCards();
  } catch (err) {
    console.error('[renderManajemenAkun] Error:', err);
  }
}

function _renderAkunCards() {
  const el = document.getElementById('user-list-body');
  if (!el) return;

  if (!SYNC_STATUS.isReady && USERS.length === 0) {
    el.innerHTML = `<div style="grid-column:1/-1;padding:60px 20px;text-align:center;color:var(--text-muted);">
      <div style="font-size:32px;margin-bottom:12px;">⌛</div>
      <div style="font-size:14px;font-weight:600;">Sinkronisasi data akun...</div>
    </div>`;
    return;
  }

  let filtered = USERS;
  if (_akunFilterRole && _akunFilterRole !== 'all') {
    filtered = filtered.filter(u => u.role === _akunFilterRole);
  }
  if (_akunSearch) {
    filtered = filtered.filter(u =>
      (u.nama || '').toLowerCase().includes(_akunSearch) ||
      (u.username || u.firebaseId || '').toLowerCase().includes(_akunSearch)
    );
  }

  const countEl = document.getElementById('akun-result-count');
  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    el.innerHTML = `<div style="grid-column:1/-1;padding:60px 20px;text-align:center;color:var(--text-muted);">
      <div style="font-size:40px;margin-bottom:12px;">🔍</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px;">Tidak ada akun ditemukan</div>
      <div style="font-size:13px;">Coba ubah filter atau kata kunci pencarian</div>
    </div>`;
    return;
  }

  el.innerHTML = filtered.map(u => {
    const roleStyle = ROLE_COLORS[u.role] || { color: '#0f4c81', bg: '#f0f7ff', icon: '👤' };
    const roleName = (ROLE_INFO && u.role && ROLE_INFO[u.role]) ? ROLE_INFO[u.role].label : (u.role || 'User');
    const userId = u.username || u.firebaseId || 'unknown';
    const safeId = userId.replace(/'/g, "\\'");
    const info = u.instansi || u.desa || u.alamat || null;

    return `
      <div class="user-card" style="--uc-color:${roleStyle.color};">
        <div class="user-card-top">
          <div class="user-card-avatar" style="background:${roleStyle.bg}; border-color:${roleStyle.color};">
            ${roleStyle.icon}
          </div>
          <div class="user-card-info">
            <div class="user-card-name">${u.nama || 'Tanpa Nama'}</div>
            <div class="user-card-username">@${userId}</div>
          </div>
        </div>
        <div>
          <span class="user-role-badge" style="background:${roleStyle.color};">
            ${roleStyle.icon} ${roleName}
          </span>
        </div>
        <div class="user-card-meta">
          ${info
            ? `<span style="font-size:15px;">🏢</span><span>${info}</span>`
            : `<span style="opacity:0.5;">— Tidak ada info instansi —</span>`}
        </div>
        <div class="user-card-actions">
          <button class="btn-edit-user" onclick="openModalAkun('${safeId}')">✏️ Edit Akun</button>
          <button class="btn-hapus-user" onclick="hapusAkun('${safeId}')" title="Hapus Akun">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}


let editingUsername = null;

function openModalAkun(username = null) {
  editingUsername = username;
  const titleEl = document.querySelector('#modal-akun .modal-title');
  const user = username ? USERS.find(u => (u.username || u.firebaseId) === username) : null;

  if (user) {
    titleEl.textContent = 'Edit Akun: ' + user.nama;
    document.getElementById('akun-nama').value = user.nama || '';
    document.getElementById('akun-username').value = user.username || '';
    document.getElementById('akun-username').disabled = true; // Cannot change username/docID
    document.getElementById('akun-password').value = ''; // Don't show old password
    document.getElementById('akun-password').placeholder = '(Tetap sama jika kosong)';
    document.getElementById('akun-role').value = user.role || 'petugas';
    document.getElementById('akun-instansi').value = user.instansi || user.desa || '';
  } else {
    titleEl.textContent = 'Tambah Akun Baru';
    document.getElementById('akun-nama').value = '';
    document.getElementById('akun-username').value = '';
    document.getElementById('akun-username').disabled = false;
    document.getElementById('akun-password').value = '';
    document.getElementById('akun-password').placeholder = '******';
    document.getElementById('akun-role').value = 'petugas';
    document.getElementById('akun-instansi').value = '';
  }

  openModal('modal-akun');
}

async function simpanAkun() {
  const nama = document.getElementById('akun-nama').value.trim();
  const username = document.getElementById('akun-username').value.trim().toLowerCase();
  const password = document.getElementById('akun-password').value;
  const role = document.getElementById('akun-role').value;
  const instansi = document.getElementById('akun-instansi').value.trim();

  if (!nama || !username) {
    showToast('❌ Nama dan Username wajib diisi!', 'error');
    return;
  }
  if (!editingUsername && !password) {
    showToast('❌ Password wajib diisi untuk akun baru!', 'error');
    return;
  }
  if (!editingUsername && password.length < 6) {
    showToast('❌ Password minimal 6 karakter!', 'error');
    return;
  }

  // Build the Firestore profile data
  const userData = {
    nama,
    username,
    role,
    lastUpdate: new Date().toISOString()
  };
  if (instansi) {
    userData.instansi = instansi;
    if (role === 'petugas') userData.desa = instansi;
  }

  try {
    showToast('⏳ Menyimpan data akun...', 'info');

    if (!editingUsername) {
      // ── CREATE NEW ACCOUNT ──────────────────────────────────────────────
      // 1. Check if username already exists in Firestore
      const existingDoc = await db.collection('users').doc(username).get();
      if (existingDoc.exists) {
        showToast('❌ Username sudah digunakan! Pilih username lain.', 'error');
        return;
      }

      // 2. Use a SECONDARY Firebase App so the admin's session is never interrupted.
      //    createUserWithEmailAndPassword normally auto-signs-in as the new user;
      //    using a separate app instance isolates that side effect completely.
      const dummyEmail = username + '@sijiwa-login.com';
      let firebaseUid = null;
      let secondaryApp = null;

      try {
        // Create a one-time secondary app instance with a unique name
        const secondaryAppName = 'admin-create-' + Date.now();
        secondaryApp = firebase.initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = firebase.auth(secondaryApp);

        const credential = await secondaryAuth.createUserWithEmailAndPassword(dummyEmail, password);
        firebaseUid = credential.user.uid;

      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Auth entry exists without a Firestore profile — just repair the profile below
          console.warn('Auth user already exists, repairing Firestore profile...');
        } else {
          throw authErr; // Re-throw for outer catch
        }
      } finally {
        // Always clean up the secondary app regardless of outcome
        if (secondaryApp) {
          try { await secondaryApp.delete(); } catch (_) {}
        }
      }

      // 3. Write the Firestore profile (admin's main session is still intact)
      if (firebaseUid) userData.uid = firebaseUid;
      userData.id = Date.now();
      await db.collection('users').doc(username).set(userData);

      showToast(`✅ Akun @${username} berhasil dibuat! Pengguna kini bisa login.`, 'success');
      closeModal('modal-akun');

    } else {
      // ── EDIT EXISTING ACCOUNT ──────────────────────────────────────────
      // Only update the Firestore profile (name, role, instansi).
      // Password changes are NOT possible via Client SDK for other users.
      await db.collection('users').doc(username).set(userData, { merge: true });
      showToast(`✅ Profil akun @${username} berhasil diperbarui!`, 'success');
      closeModal('modal-akun');
    }

  } catch (e) {
    console.error('Failed to save account:', e);
    if (e.code === 'auth/email-already-in-use') {
      showToast('❌ Username sudah terdaftar di sistem autentikasi!', 'error');
    } else if (e.code === 'auth/weak-password') {
      showToast('❌ Password terlalu lemah! Minimal 6 karakter.', 'error');
    } else {
      showToast('❌ Gagal menyimpan akun: ' + e.message, 'error');
    }
  }
}

async function hapusAkun(username) {
  if (!username) return;
  if (!confirm(`Apakah Anda yakin ingin menghapus akun @${username}?\nData profil akan dihapus permanen.`)) return;

  try {
    showToast('⏳ Menghapus akun...', 'info');
    await db.collection('users').doc(username).delete();
    showToast('✅ Akun berhasil dihapus!', 'success');
  } catch (e) {
    console.error("Failed to delete account:", e);
    showToast('❌ Gagal menghapus akun', 'error');
  }
}

async function hapusPasien() {
  if (currentRole !== 'pemegang' && currentRole !== 'admin') {
    showToast('❌ Hanya Pemegang Program yang dapat menghapus pasien', 'error');
    return;
  }

  const pName = document.getElementById('detail-name-text').textContent.trim();
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

    // Create Activity Notification — notify WHO made the update and the doctor if assigned
    const sess3 = getCurrentSession();
    const notifBatch = [db.collection('notifs').add({
      title: 'Status Diperbarui',
      desc: `Status ${p?.name || 'Pasien'} diubah menjadi ${status === 'monitor' ? 'Pantau' : status}.`,
      type: 'info',
      icon: '📝',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'data-pasien',
      forUser: sess3.username
    })];
    if (p?.assignedDoctorId && p.assignedDoctorId !== sess3.username) {
      notifBatch.push(db.collection('notifs').add({
        title: 'Status Pasien Berubah',
        desc: `Status pasien Anda, ${p.name}, diubah menjadi ${status === 'monitor' ? 'Pantau' : status}.`,
        type: 'warning',
        icon: '📝',
        unread: true,
        timestamp: new Date().toISOString(),
        act: 'data-pasien',
        forUser: p.assignedDoctorId
      }));
    }
    await Promise.all(notifBatch);
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

    // Create Activity Notification — notify the pemegang who originally sent the patient
    await db.collection('notifs').add({
      title: 'Konsultasi Selesai',
      desc: `Konsultasi untuk ${p?.name || 'Pasien'} telah diselesaikan oleh dokter.`,
      type: 'success',
      icon: '✅',
      unread: true,
      timestamp: new Date().toISOString(),
      act: 'data-pasien',
      forUser: p?.createdBy || p?.petugas || getCurrentSession().username
    });
    // Also notify the current doctor that they completed it
    const sessDoc = getCurrentSession();
    if (sessDoc) {
      await db.collection('notifs').add({
        title: 'Konsultasi Selesai',
        desc: `Anda telah menyelesaikan konsultasi untuk ${p?.name || 'Pasien'}.`,
        type: 'success',
        icon: '✅',
        unread: true,
        timestamp: new Date().toISOString(),
        act: 'data-pasien',
        forUser: sessDoc.username
      });
    }
  } catch (e) {
    console.error("Complete consultation error", e);
    showToast('❌ Gagal mengakhiri konsultasi', 'error');
  }
}
