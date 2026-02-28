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
  } else if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
    const userDesa = session?.desa || session?.alamat;
    if (!userDesa) {
      displayPatients = [];
    } else {
      const cleanUserDesa = userDesa.replace("Desa ", "").trim();
      displayPatients = PATIENTS.filter(p => {
        if (p.desa && session.desa && p.desa === session.desa) return true;
        return p.alamat && (p.alamat === "Desa " + cleanUserDesa || p.alamat === cleanUserDesa);
      });
    }
  }
  
  if (!el) return;
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
    let displayPickups = PICKUPS;
    if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
      const userDesa = session?.desa || session?.alamat;
      if (userDesa) {
        const cleanUserDesa = userDesa.replace('Desa ', '').trim();
        displayPickups = PICKUPS.filter(p => {
          const patient = PATIENTS.find(pt => pt.name === p.patient);
          if (!patient) return false;
          if (patient.desa && session.desa && patient.desa === session.desa) return true;
          return patient.alamat && (patient.alamat === "Desa " + cleanUserDesa || patient.alamat === cleanUserDesa);
        });
      } else {
        displayPickups = [];
      }
    }

    const totalPickups = displayPickups.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPickups = displayPickups.filter(p => p.date === 'Hari Ini' || p.date === todayStr).length;
    
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

async function showPatientDetail(id) {
  const p = PATIENTS.find(x => x.id === id);
  if (!p) return;
  
  // Show base detail first
  showPage('patient-detail');
  
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

  // Fetch ALL PMO logs (all-time) for the patient
  const detailPmoEl = document.getElementById('detail-pmo-status');
  detailPmoEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">Memuat riwayat PMO...</div>';
  
  try {
    const logsSnap = await db.collection('patients').doc(p.firebaseId).collection('pmo_logs')
      .orderBy('timestamp', 'desc')
      .get();
    
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

  } catch (err) {
    console.error("Failed to fetch PMO logs", err);
    detailPmoEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:11px; color:var(--danger);">Gagal memuat riwayat PMO</div>';
  }

  // Role-based action buttons
  const editBtn = document.getElementById('btn-edit-pasien');
  const deleteBtn = document.getElementById('btn-hapus-pasien');
  const consBtn = document.getElementById('btn-konsultasi-pasien');
  
  const hasFullAccess = (currentRole === 'pemegang' || currentRole === 'petugas' || currentRole === 'admin');
  
  if (editBtn) editBtn.style.display = hasFullAccess ? 'block' : 'none';
  if (deleteBtn) deleteBtn.style.display = (currentRole === 'pemegang' || currentRole === 'admin') ? 'block' : 'none';
  if (consBtn) consBtn.style.display = (currentRole === 'pemegang' || currentRole === 'admin') ? 'block' : 'none';
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
  // Group by patient to show patient-centric view
  let patientsWithPmo = PATIENTS.filter(p => p.obat); 
  
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

async function renderBarChart() {
  const ctx = document.getElementById('dashboardChart');
  if (!ctx || !window.Chart) return;

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
    const pmoResults = await Promise.all(
      patientsWithId.map(p => db.collection('patients').doc(p.firebaseId).collection('pmo_logs').get())
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
  } else if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
    const userDesa = session?.desa || session?.alamat;
    if (!userDesa) {
      displayPatients = [];
    } else {
      const cleanUserDesa = userDesa.replace("Desa ", "").trim();
      displayPatients = PATIENTS.filter(p => {
        if (p.desa && session.desa && p.desa === session.desa) return true;
        return p.alamat && (p.alamat === "Desa " + cleanUserDesa || p.alamat === cleanUserDesa);
      });
    }
  }
  
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
  
  if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
    const userDesa = session?.desa || session?.alamat;
    if (!userDesa) {
      displayPatients = [];
    } else {
      const cleanUserDesa = userDesa.replace('Desa ', '').trim();
      displayPatients = PATIENTS.filter(p => {
        if (p.desa && session.desa && p.desa === session.desa) return true;
        return p.alamat && (p.alamat === "Desa " + cleanUserDesa || p.alamat === cleanUserDesa);
      });
    }
  }

  // Broadened Visibility (as requested): Show ALL patients in Monitor PMO

  el.innerHTML = displayPatients.map((p, i) => `
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
let globalChatContacts = [];

async function renderChat() {
  const session = getCurrentSession();
  if (!session) return;
  
  const contactEl = document.getElementById('chat-contact-list');
  contactEl.innerHTML = '<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">Memuat riwayat chat...</div>';
  
  showContactList();

  try {
    const snapshot = await db.collection('chats')
      .where('participants', 'array-contains', session.username)
      .get();
    
    if (snapshot.empty) {
      globalChatContacts = [];
      contactEl.innerHTML = `
        <div style="padding:40px 20px; text-align:center;">
          <div style="font-size:32px; margin-bottom:12px;">💬</div>
          <div style="font-size:13px; font-weight:700; color:var(--text);">Belum ada percakapan</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px; margin-bottom:16px;">Mulai chat baru dengan menekan tombol + di atas</div>
          <button class="btn btn-sm" onclick="openNewChatList()" style="background:var(--navy); color:white; padding:6px 16px; border-radius:20px;">Mulai Chat</button>
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

  contactEl.innerHTML = contacts.map(c => `
    <div class="contact-item" onclick="selectContact('${c.id}', '${c.name}')">
      <div class="header-avatar" style="font-size:14px; width:46px; height:46px; flex-shrink:0;">${c.name.charAt(0)}</div>
      <div class="c-info" style="min-width:0; flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="c-name" style="font-size:14px; font-weight:700; color:var(--text);">${c.name}</div>
          <div class="c-time" style="font-size:11px; color:var(--text-muted);">${c.time || ''}</div>
        </div>
        <div class="c-preview" style="font-size:12px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">${c.snippet || ''}</div>
      </div>
    </div>
  `).join('');
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

  document.getElementById('chat-contact-view').style.display = 'flex';
  document.getElementById('chat-active-view').style.display = 'none';
  document.getElementById('chat-back-btn').style.display = 'none';
  document.getElementById('chat-header-avatar').style.display = 'none';
  document.getElementById('chat-header-name').textContent = 'Chat Terintegrasi';
  document.getElementById('chat-header-status').style.display = 'none';
}

function selectContact(id, name) {
  selectedContactId = id;
  selectedContactName = name;
  const session = getCurrentSession();
  
  document.getElementById('chat-back-btn').style.display = 'block';
  document.getElementById('chat-avatar-text').textContent = name.charAt(0);
  document.getElementById('chat-header-avatar').style.display = 'flex';
  document.getElementById('chat-header-name').textContent = name;
  document.getElementById('chat-header-status').style.display = 'block';
  
  document.getElementById('chat-contact-view').style.display = 'none';
  document.getElementById('chat-active-view').style.display = 'flex';

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
  let displayPatients = PATIENTS;
  
  if (currentRole === 'dokter') {
    displayPatients = PATIENTS.filter(p => p.assignedDoctorId === session?.username);
  } else if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
    const userDesa = session?.desa || session?.alamat;
    if (userDesa) {
      const cleanUserDesa = userDesa.replace('Desa ', '').trim();
      displayPatients = PATIENTS.filter(p => {
        if (p.desa && session.desa && p.desa === session.desa) return true;
        return p.alamat && (p.alamat === "Desa " + cleanUserDesa || p.alamat === cleanUserDesa);
      });
    } else {
      displayPatients = [];
    }
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

function downloadReportExcel() {
  const session = getCurrentSession();
  let displayPatients = PATIENTS;

  if (currentRole === 'dokter') {
    displayPatients = PATIENTS.filter(p => p.assignedDoctorId === session?.username);
  } else if (currentRole === 'pendamping' || (currentRole === 'petugas' && session?.desa)) {
    const userDesa = session?.desa || session?.alamat;
    if (userDesa) {
      const cleanUserDesa = userDesa.replace('Desa ', '').trim();
      displayPatients = PATIENTS.filter(p => {
        if (p.desa && session.desa && p.desa === session.desa) return true;
        return p.alamat && (p.alamat === "Desa " + cleanUserDesa || p.alamat === cleanUserDesa);
      });
    } else {
      displayPatients = [];
    }
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
          <div style="font-size:12px; color:#7f1d1d; margin-bottom:12px;">Fitur ini akan menghapus SELURUH data pasien, jadwal, stok obat, dan chat secara permanen.</div>
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
    createdAt: new Date().toISOString()
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
  document.getElementById('edit-p-desa').value = p.desa || '';
  
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

  if (!name) {
    showToast('❌ Nama wajib diisi!', 'error');
    return;
  }

  try {
    if (fid) {
      await db.collection('patients').doc(fid).update({
        name, nik, diagnosis: diag, status, alamat, desa
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
      p.desa = desa;
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
