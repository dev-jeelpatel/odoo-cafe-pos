export const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Cafe POS — API Docs</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
  header{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:2rem 2.5rem;display:flex;align-items:center;gap:1rem}
  header h1{font-size:1.75rem;font-weight:700;color:#fff}
  header p{color:#c7d2fe;font-size:.95rem;margin-top:.25rem}
  .badge{display:inline-block;padding:.2rem .65rem;border-radius:999px;font-size:.72rem;font-weight:700;letter-spacing:.04em}
  .badge-green{background:#16a34a;color:#fff}
  .badge-blue{background:#2563eb;color:#fff}
  .badge-yellow{background:#d97706;color:#fff}
  .badge-red{background:#dc2626;color:#fff}
  .badge-purple{background:#7c3aed;color:#fff}
  .container{max-width:1100px;margin:0 auto;padding:2rem 1.5rem}
  .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
  .info-card{background:#1e293b;border:1px solid #334155;border-radius:.75rem;padding:1.25rem}
  .info-card h3{font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}
  .info-card p{font-size:1.1rem;font-weight:600;color:#f1f5f9}
  .section{margin-bottom:2.5rem}
  .section-title{font-size:1.1rem;font-weight:700;color:#a5b4fc;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:1px solid #1e293b}
  .endpoint{background:#1e293b;border:1px solid #334155;border-radius:.75rem;margin-bottom:.6rem;overflow:hidden}
  .endpoint-header{display:flex;align-items:center;gap:.75rem;padding:.85rem 1.25rem;cursor:pointer;transition:background .15s}
  .endpoint-header:hover{background:#263348}
  .method{min-width:60px;text-align:center}
  .path{font-family:'Courier New',monospace;font-size:.9rem;color:#e2e8f0;flex:1}
  .desc{font-size:.82rem;color:#64748b;margin-left:auto}
  .auth-chip{font-size:.7rem;background:#312e81;color:#a5b4fc;border-radius:4px;padding:.1rem .4rem}
  .endpoint-body{display:none;padding:1rem 1.25rem;border-top:1px solid #334155;background:#162032}
  .endpoint-body.open{display:block}
  .endpoint-body pre{background:#0f172a;border-radius:.5rem;padding:.85rem 1rem;font-size:.8rem;color:#7dd3fc;overflow-x:auto;margin-top:.5rem}
  .cred-box{background:#1e293b;border:1px solid #4ade80;border-radius:.75rem;padding:1.25rem;margin-bottom:2rem}
  .cred-box h3{color:#4ade80;font-size:.9rem;margin-bottom.75rem}
  .cred-row{display:flex;gap:1rem;margin-top:.5rem;flex-wrap:wrap}
  .cred-item{background:#0f172a;border-radius:.5rem;padding:.5rem .85rem;font-family:monospace;font-size:.85rem;color:#f1f5f9}
  .cred-label{color:#64748b;font-size:.75rem;margin-bottom:.2rem}
  footer{text-align:center;padding:2rem;color:#475569;font-size:.82rem;border-top:1px solid #1e293b;margin-top:2rem}
</style>
</head>
<body>
<header>
  <div>
    <h1>☕ Cafe POS — API Reference</h1>
    <p>Restaurant Point-of-Sale &amp; Kitchen Display System · Backend v1.0.0</p>
  </div>
</header>

<div class="container">

  <div class="info-grid" style="margin-top:1.5rem">
    <div class="info-card"><h3>Base URL</h3><p>http://localhost:5000/api</p></div>
    <div class="info-card"><h3>Auth</h3><p>Bearer JWT</p></div>
    <div class="info-card"><h3>Database</h3><p>PostgreSQL 17</p></div>
    <div class="info-card"><h3>Realtime</h3><p>Socket.IO</p></div>
  </div>

  <div class="cred-box">
    <h3>🔑 Default Login Credentials</h3>
    <div class="cred-row">
      <div class="cred-item"><div class="cred-label">Email</div>admin@cafe.com</div>
      <div class="cred-item"><div class="cred-label">Password</div>admin123</div>
      <div class="cred-item"><div class="cred-label">Role</div>ADMIN</div>
      <div class="cred-item"><div class="cred-label">Frontend</div>http://localhost:3000</div>
    </div>
  </div>

  <!-- AUTH -->
  <div class="section">
    <div class="section-title">🔐 Authentication  <span class="badge badge-green">auth</span></div>
    ${ep('POST','/api/auth/login','Login and get JWT token',false,`{ "email": "admin@cafe.com", "password": "admin123" }`,`{ "token": "eyJ...", "user": { "id": "...", "name": "Admin", "role": "ADMIN" } }`)}
    ${ep('POST','/api/auth/register','Register new user',true,`{ "name": "Staff 1", "email": "staff@cafe.com", "password": "pass123", "role": "EMPLOYEE" }`)}
    ${ep('GET','/api/auth/me','Get current authenticated user',true)}
  </div>

  <!-- ORDERS -->
  <div class="section">
    <div class="section-title">🛒 Orders  <span class="badge badge-blue">orders</span></div>
    ${ep('GET','/api/orders','List all orders (with filters: status, date)',true)}
    ${ep('POST','/api/orders','Create new order',true,`{ "orderType": "DINE_IN", "tableId": "...", "items": [{ "productId": "...", "quantity": 2 }] }`)}
    ${ep('GET','/api/orders/:id','Get single order with items & payments',true)}
    ${ep('PUT','/api/orders/:id','Update order (add items, notes, etc.)',true)}
    ${ep('PUT','/api/orders/:id/status','Update order status',true,`{ "status": "CONFIRMED" }`)}
    ${ep('PUT','/api/orders/:id/kitchen-status','Update kitchen status',true,`{ "kitchenStatus": "TO_COOK" }`)}
    ${ep('PUT','/api/orders/:id/items/:itemId/kitchen-complete','Toggle item kitchen done',true,`{ "kitchenCompleted": true }`)}
    ${ep('POST','/api/orders/:id/pay','Process payment (atomic transaction)',true,`{ "payments": [{ "method": "CASH", "amount": 250 }] }`)}
    ${ep('DELETE','/api/orders/:id','Cancel/delete order',true)}
  </div>

  <!-- PRODUCTS -->
  <div class="section">
    <div class="section-title">☕ Products  <span class="badge badge-purple">catalog</span></div>
    ${ep('GET','/api/products','List all active products',true)}
    ${ep('POST','/api/products','Create product',true,`{ "name": "Espresso", "categoryId": "...", "price": 120, "tax": 5, "unit": "PIECE" }`)}
    ${ep('PUT','/api/products/:id','Update product',true)}
    ${ep('DELETE','/api/products/:id','Soft-delete product (sets active=false)',true)}
  </div>

  <!-- CATEGORIES -->
  <div class="section">
    <div class="section-title">🏷️ Categories  <span class="badge badge-purple">catalog</span></div>
    ${ep('GET','/api/categories','List all categories',true)}
    ${ep('POST','/api/categories','Create category',true,`{ "name": "Hot Drinks", "color": "#ef4444" }`)}
    ${ep('PUT','/api/categories/:id','Update category',true)}
    ${ep('DELETE','/api/categories/:id','Delete category',true)}
  </div>

  <!-- CUSTOMERS -->
  <div class="section">
    <div class="section-title">👥 Customers  <span class="badge badge-green">crm</span></div>
    ${ep('GET','/api/customers','List / search customers (?search=name)',true)}
    ${ep('POST','/api/customers','Create customer',true,`{ "name": "Riya Sharma", "phone": "9876543210", "email": "riya@email.com" }`)}
    ${ep('PUT','/api/customers/:id','Update customer',true)}
    ${ep('DELETE','/api/customers/:id','Delete customer',true)}
  </div>

  <!-- FLOORS & TABLES -->
  <div class="section">
    <div class="section-title">🏢 Floors &amp; Tables  <span class="badge badge-blue">tables</span></div>
    ${ep('GET','/api/floors','List floors with tables',true)}
    ${ep('POST','/api/floors','Create floor',true,`{ "name": "Ground Floor" }`)}
    ${ep('POST','/api/floors/:floorId/tables','Add table to floor',true,`{ "tableNumber": "T1", "seats": 4 }`)}
    ${ep('PUT','/api/floors/:floorId/tables/:tableId','Update table',true)}
    ${ep('DELETE','/api/floors/:id','Delete floor',true)}
  </div>

  <!-- COUPONS -->
  <div class="section">
    <div class="section-title">🎟️ Coupons  <span class="badge badge-yellow">discounts</span></div>
    ${ep('GET','/api/coupons','List all coupons',true)}
    ${ep('POST','/api/coupons','Create coupon',true,`{ "code": "SAVE20", "discountType": "PERCENTAGE", "discountValue": 20, "active": true }`)}
    ${ep('PUT','/api/coupons/:id','Update coupon',true)}
    ${ep('DELETE','/api/coupons/:id','Delete coupon',true)}
  </div>

  <!-- PROMOTIONS -->
  <div class="section">
    <div class="section-title">🎁 Promotions  <span class="badge badge-yellow">discounts</span></div>
    ${ep('GET','/api/promotions','List all promotions',true)}
    ${ep('POST','/api/promotions','Create promotion',true,`{ "name": "Happy Hour", "promotionType": "ORDER", "minOrderAmount": 500, "discountType": "PERCENTAGE", "discountValue": 10 }`)}
    ${ep('PUT','/api/promotions/:id','Update promotion',true)}
    ${ep('DELETE','/api/promotions/:id','Delete promotion',true)}
  </div>

  <!-- SESSIONS -->
  <div class="section">
    <div class="section-title">🕐 Sessions  <span class="badge badge-blue">sessions</span></div>
    ${ep('GET','/api/sessions','List all sessions',true)}
    ${ep('GET','/api/sessions/current','Get current open session',true)}
    ${ep('POST','/api/sessions/open','Open a new session',true)}
    ${ep('POST','/api/sessions/close','Close current session (atomic summary)',true)}
  </div>

  <!-- USERS -->
  <div class="section">
    <div class="section-title">👤 Users / Employees  <span class="badge badge-red">admin</span></div>
    ${ep('GET','/api/users','List all users (Admin only)',true)}
    ${ep('POST','/api/users','Create user',true,`{ "name": "Cashier 1", "email": "c1@cafe.com", "password": "pass123", "role": "CASHIER" }`)}
    ${ep('PUT','/api/users/:id','Update user',true)}
    ${ep('PUT','/api/users/:id/password','Change password',true,`{ "password": "newpass123" }`)}
    ${ep('PUT','/api/users/:id/archive','Archive user',true)}
    ${ep('DELETE','/api/users/:id','Delete user',true)}
  </div>

  <!-- PAYMENT METHODS -->
  <div class="section">
    <div class="section-title">💳 Payment Methods  <span class="badge badge-red">admin</span></div>
    ${ep('GET','/api/payment-methods','List payment methods with enabled state',true)}
    ${ep('PUT','/api/payment-methods/:id','Toggle enabled/disabled',true,`{ "enabled": false }`)}
  </div>

  <!-- REPORTS -->
  <div class="section">
    <div class="section-title">📊 Reports  <span class="badge badge-red">admin</span></div>
    ${ep('GET','/api/reports/dashboard','Dashboard analytics (?period=today|week|month)',true)}
    ${ep('GET','/api/reports/audit-logs','Audit log trail',true)}
  </div>

  <!-- SOCKET -->
  <div class="section">
    <div class="section-title">⚡ Socket.IO Events  <span class="badge badge-purple">realtime</span></div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="badge badge-purple">EMIT</span>
        <span class="path">kitchen:new-order</span>
        <span class="desc">New order sent to kitchen</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="badge badge-purple">EMIT</span>
        <span class="path">kitchen:status-update</span>
        <span class="desc">Order kitchen status changed</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="badge badge-purple">EMIT</span>
        <span class="path">kitchen:item-update</span>
        <span class="desc">Individual item marked complete</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="badge badge-purple">EMIT</span>
        <span class="path">order:paid</span>
        <span class="desc">Order payment completed</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="badge badge-purple">EMIT</span>
        <span class="path">table:status-update</span>
        <span class="desc">Table availability changed</span>
      </div>
    </div>
  </div>

</div>

<footer>Cafe POS API · PostgreSQL 17 + Prisma · Node.js + Express · Socket.IO</footer>

<script>
  document.querySelectorAll('.endpoint-header').forEach(h => {
    h.addEventListener('click', () => {
      const body = h.nextElementSibling;
      if (body && body.classList.contains('endpoint-body')) {
        body.classList.toggle('open');
      }
    });
  });
</script>
</body>
</html>`;

function ep(method: string, path: string, desc: string, auth = true, reqBody?: string, resBody?: string): string {
  const colors: Record<string,string> = { GET:'badge-green', POST:'badge-blue', PUT:'badge-yellow', DELETE:'badge-red', PATCH:'badge-purple' };
  const bodySection = (reqBody || resBody) ? `
    <div class="endpoint-body">
      ${reqBody ? `<div style="color:#94a3b8;font-size:.8rem;margin-bottom:.4rem">Request Body</div><pre>${reqBody}</pre>` : ''}
      ${resBody ? `<div style="color:#94a3b8;font-size:.8rem;margin:.75rem 0 .4rem">Response</div><pre>${resBody}</pre>` : ''}
    </div>` : '';
  return `<div class="endpoint">
    <div class="endpoint-header">
      <span class="badge method ${colors[method] || 'badge-green'}">${method}</span>
      <span class="path">${path}</span>
      <span class="desc">${desc}</span>
      ${auth ? '<span class="auth-chip">🔒 JWT</span>' : '<span class="auth-chip" style="background:#1e293b;color:#64748b">public</span>'}
    </div>${bodySection}
  </div>`;
}
