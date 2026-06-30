// ═══ AUTH GUARD - dùng chung cho index.html & quan-ly-phong-hop.html ═══
(function(){
  function readStore(){
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
    return { token, userRaw };
  }

  const { token, userRaw } = readStore();

  if(!token || !userRaw){
    window.location.href = '/login.html';
    return;
  }

  let user;
  try { user = JSON.parse(userRaw); } catch(e){ user = null; }
  if(!user){
    window.location.href = '/login.html';
    return;
  }

  // Trang quản lý phòng (data-require-admin) chỉ cho Admin truy cập
  if(document.body.hasAttribute('data-require-admin') && user.role !== 'admin'){
    window.location.href = '/';
    return;
  }

  window.CURRENT_USER = user;

  // Gắn Authorization header vào mọi request gọi tới /api/...
  const originalFetch = window.fetch;
  window.fetch = function(url, options){
    options = options || {};
    if(typeof url === 'string' && url.startsWith('/api/')){
      options.headers = Object.assign({}, options.headers, { 'Authorization': 'Bearer ' + token });
    }
    return originalFetch(url, options).then(res => {
      if(res.status === 401){
        localStorage.removeItem('token'); localStorage.removeItem('user');
        sessionStorage.removeItem('token'); sessionStorage.removeItem('user');
        window.location.href = '/login.html';
      }
      return res;
    });
  };

  function logout(){
    localStorage.removeItem('token'); localStorage.removeItem('user');
    sessionStorage.removeItem('token'); sessionStorage.removeItem('user');
    window.location.href = '/login.html';
  }
  window.logout = logout;

  function initials(name){
    return (name||'').trim().split(/\s+/).map(p=>p[0]).slice(-2).join('').toUpperCase();
  }

  document.addEventListener('DOMContentLoaded', function(){
    const roleLabel = user.role === 'admin' ? 'Admin' : 'User';
    const infoEl = document.querySelector('.user-info');
    const avatarEl = document.querySelector('.avatar');
    if(infoEl){
      infoEl.textContent = user.fullName + ' · ' + roleLabel;
      infoEl.style.cursor = 'pointer';
      infoEl.title = 'Đăng xuất';
      infoEl.onclick = logout;
    }
    if(avatarEl){
      avatarEl.textContent = initials(user.fullName);
      avatarEl.style.cursor = 'pointer';
      avatarEl.title = 'Đăng xuất';
      avatarEl.onclick = logout;
    }

    // Ẩn link "Quản Lý" trên menu nếu không phải Admin
    if(user.role !== 'admin'){
      document.querySelectorAll('a.nav-link-admin').forEach(el => el.style.display = 'none');
    }
  });
})();
