/* Tương tác minh họa trong design-system: không lưu dữ liệu hoặc gọi dịch vụ. */
const mobileNav = document.querySelector('#mobile-nav');
const openNav = document.querySelector('[data-open-nav]');
if (mobileNav && openNav) {
  mobileNav.querySelector('[data-mobile-links]').append(...Array.from(document.querySelector('#desktop-nav').children, node => node.cloneNode(true)));
  openNav.addEventListener('click', () => mobileNav.showModal());
  mobileNav.querySelector('[data-close-nav]').addEventListener('click', () => mobileNav.close());
  const desktop = matchMedia('(min-width: 901px)');
  desktop.addEventListener('change', () => { if (desktop.matches) mobileNav.close(); });
}

const previewState = document.querySelector('#preview-state');
const stateContent = document.querySelector('#state-content');
const stateTemplates = {
  loading: '<div class="wf-card" aria-busy="true"><h2 class="wf-card-title">Đang tải dữ liệu</h2><div class="wf-skel" style="height:24px;margin:16px 0"></div><div class="wf-skel" style="height:160px"></div></div>',
  empty: '<div class="wf-empty"><h2>Chưa có hồ sơ</h2><p>Hồ sơ mới sẽ xuất hiện tại đây khi được gửi đến bạn.</p></div>',
  error: '<div class="wf-alert wf-alert--danger" role="alert"><div><h2 class="wf-card-title">Không tải được dữ liệu</h2><p>Kiểm tra kết nối rồi thử lại.</p><button class="wf-btn wf-btn--secondary" data-retry>Thử lại</button></div></div>',
  ai: '<div class="wf-aiprog" aria-busy="true"><h2 class="wf-card-title">AI đang tổng hợp thông tin</h2><p>Đang đối chiếu dữ liệu và nguồn bằng chứng. Chưa có đề xuất để xác nhận.</p><span class="wf-kind wf-kind--ai">✧ AI mô phỏng</span></div>',
  denied: '<div class="wf-empty"><h2>Bạn chưa có quyền xem nội dung này</h2><p>Liên hệ quản trị viên để kiểm tra quyền theo vai trò của bạn.</p></div>'
};
function renderState() {
  const normal = previewState.value === 'normal';
  document.querySelector('#normal-content').hidden = !normal;
  stateContent.hidden = normal;
  stateContent.innerHTML = normal ? '' : stateTemplates[previewState.value];
}
previewState?.addEventListener('change', renderState);
stateContent?.addEventListener('click', event => {
  if (event.target.closest('[data-retry]')) { previewState.value = 'normal'; renderState(); previewState.focus(); }
});

const filters = document.querySelector('#request-filters');
if (filters) {
  const search = document.querySelector('#request-search');
  const kind = document.querySelector('#request-kind');
  const status = document.querySelector('#request-status');
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');
  function filterRows() {
    let visible = 0;
    for (const row of document.querySelectorAll('[data-request]')) {
      row.hidden = !normalize(row.textContent).includes(normalize(search.value.trim())) || (kind.value !== 'all' && row.dataset.kind !== kind.value) || (status.value !== 'all' && row.dataset.status !== status.value);
      if (!row.hidden) visible++;
    }
    document.querySelector('#result-count').textContent = `(${visible})`;
    document.querySelector('#filter-empty').hidden = visible !== 0;
  }
  filters.addEventListener('submit', event => event.preventDefault());
  filters.addEventListener('input', filterRows);
  filters.addEventListener('change', filterRows);
  filters.addEventListener('reset', () => requestAnimationFrame(filterRows));
}

const confirmation = document.querySelector('#decision-confirm');
if (confirmation) {
  const comment = document.querySelector('#decision-comment');
  const error = document.querySelector('#decision-error');
  let pendingDecision;
  for (const button of document.querySelectorAll('[data-decision]')) {
    button.addEventListener('click', () => {
      pendingDecision = button.dataset.decision;
      const missingReason = pendingDecision === 'reject' && !comment.value.trim();
      error.hidden = !missingReason;
      error.textContent = missingReason ? 'Nhập lý do từ chối để người gửi biết cách điều chỉnh.' : '';
      comment.setAttribute('aria-invalid', String(missingReason));
      if (missingReason) { comment.setAttribute('aria-describedby', 'decision-error'); comment.focus(); return; }
      comment.removeAttribute('aria-describedby');
      const label = pendingDecision === 'approve' ? 'Phê duyệt đơn' : 'Từ chối đơn';
      document.querySelector('#confirm-title').textContent = `${label} nghỉ phép?`;
      document.querySelector('#confirm-decision').textContent = label;
      confirmation.returnValue = '';
      confirmation.showModal();
    });
  }
  confirmation.addEventListener('close', () => {
    if (confirmation.returnValue !== 'confirm') return;
    const label = pendingDecision === 'approve' ? 'Đã phê duyệt' : 'Đã từ chối';
    document.querySelector('#decision-status').textContent = `${label} · Kết quả minh họa, tải lại trang để đặt lại.`;
    const toast = document.querySelector('#sample-toast');
    toast.textContent = `${label} trên mẫu giao diện.`;
    setTimeout(() => { toast.textContent = ''; }, 4000);
    document.querySelector('#decision-status').setAttribute('tabindex', '-1');
    document.querySelector('#decision-status').focus();
    document.querySelectorAll('[data-decision]').forEach(button => { button.disabled = true; });
    comment.readOnly = true;
  });
}
