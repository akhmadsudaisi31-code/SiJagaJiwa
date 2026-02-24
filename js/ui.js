/**
 * SIODGJ - UI Utilities
 * Modal, Toast, Sidebar controls
 */

// ============ MODAL ============
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Close modal when clicking overlay
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('show');
    }
  });
});

// ============ TOAST ============
function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type || ''}`;
  toast.innerHTML = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============ SIDEBAR ============
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
  } else {
    document.getElementById('sidebar').classList.toggle('closed');
    const main = document.querySelector('.main-content');
    if (main) main.classList.toggle('expanded');
  }
}

function closeSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
  }
}

// ============ PROFILE TABS ============
function switchProfileTab(tabName) {
  // Update buttons
  const buttons = document.querySelectorAll('.ptab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  // Find button by onclick attribute since we don't have IDs
  const targetBtn = Array.from(buttons).find(b => b.getAttribute('onclick').includes(`('${tabName}')`));
  if (targetBtn) targetBtn.classList.add('active');

  // Update content sections
  const contents = document.querySelectorAll('.ptab-content');
  contents.forEach(content => content.classList.remove('active'));
  const targetContent = document.getElementById(`ptab-${tabName}`);
  if (targetContent) targetContent.classList.add('active');
}
