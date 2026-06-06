/**
 * 私密文件夹管理面板
 * 路径: /api/private-folders-panel
 * 未登录自动跳转 /adminLogin
 */
import { getDatabase } from '../utils/databaseAdapter.js';
import { authenticate, AUTH_SCOPE } from '../utils/auth/authCore.js';

const PF_KEY = 'manage@privateFolders';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // 鉴权检查
    const authResult = await authenticate({
        env, request, requiredPermission: null,
        authScope: AUTH_SCOPE.ADMIN,
    });

    if (!authResult.authorized) {
        if (url.searchParams.get('api') === '1') {
            return new Response(JSON.stringify({ error: 'unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response('', { status: 302, headers: { 'Location': '/adminLogin' } });
    }

    if (url.searchParams.get('api') === '1') {
        return handleApi(context);
    }

    const html = await renderPage(context);
    return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
}

async function handleApi(context) {
    const { request, env } = context;
    const db = getDatabase(env);

    if (request.method === 'GET') {
        return json({ folders: await getPrivateFolders(db) });
    }

    if (request.method === 'POST') {
        try {
            const body = await request.json();
            let list = await getPrivateFolders(db);
            const f = (body.folder || '').trim().replace(/^\/+|\/+$/g, '');

            if (body.action === 'toggle') {
                if (list.includes(f)) list = list.filter(x => x !== f);
                else list.push(f);
            }

            await db.put(PF_KEY, JSON.stringify(list));
            return json({ folders: list, isPrivate: list.includes(f) });
        } catch (e) {
            return json({ error: e.message }, 400);
        }
    }
    return json({ error: 'Method not allowed' }, 405);
}

async function getPrivateFolders(db) {
    try { const r = await db.get(PF_KEY); return r ? JSON.parse(r) : []; }
    catch { return []; }
}

function json(data, s = 200) {
    return new Response(JSON.stringify(data), {
        status: s, headers: { 'Content-Type': 'application/json' }
    });
}

async function renderPage(context) {
    const { env, request } = context;
    const db = getDatabase(env);
    const privateFolders = await getPrivateFolders(db);

    // 获取目录树展示所有文件夹
    const treeFolders = [];
    try {
        const treeUrl = new URL('/api/directoryTree', request.url);
        const resp = await fetch(treeUrl, { headers: request.headers });
        if (resp.ok) {
            const data = await resp.json();
            function walk(node, path) {
                if (!node) return;
                // 标准化路径：去掉首尾斜杠
                const seg = (node.name || '').replace(/^\/+|\/+$/g, '');
                const p = path ? path + '/' + seg : seg;
                if (p) treeFolders.push(p);
                if (node.children) node.children.forEach(c => walk(c, p));
            }
            if (data.tree) walk(data.tree, '');
        }
    } catch (e) {}

    // 标准化私密文件夹路径
    const privNorm = privateFolders.map(f => f.replace(/^\/+|\/+$/g, ''));

    // 合并：显示所有文件夹，标记私密状态
    const map = new Map();
    treeFolders.forEach(f => map.set(f, { name: f, isPrivate: privNorm.includes(f) }));
    privateFolders.forEach(f => {
        const n = f.replace(/^\/+|\/+$/g, '');
        if (!map.has(n)) map.set(n, { name: n, isPrivate: true });
    });
    const folderList = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh'));

    const items = folderList.map(f => `
    <li class="${f.isPrivate ? 'p' : ''}">
      <span class="nm">📁 ${esc(f.name)}</span>
      <label class="sw">
        <input type="checkbox" ${f.isPrivate ? 'checked' : ''} data-f="${esc(f.name)}">
        <span class="sl"></span>
      </label>
    </li>`).join('') || '<li class="empty">暂无文件夹</li>';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>私密文件夹管理</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f7fa;color:#333;padding:20px;font-size:14px}
.c{max-width:540px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.06);padding:24px}
.h{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.h h1{font-size:17px}
.h .b{font-size:11px;color:#999;background:#f5f5f5;padding:2px 10px;border-radius:10px}
.sub{font-size:12px;color:#aaa;margin-bottom:14px}
ul{list-style:none}
li{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid #eee;border-radius:8px;margin-bottom:5px;transition:all .15s}
li:hover{background:#fafafa;border-color:#e0e0e0}
li.p{background:#f0f7ff;border-color:#b3d8ff}
li.p:hover{background:#e6f0ff}
.nm{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.sw{position:relative;display:inline-block;width:38px;height:20px;flex-shrink:0;margin-left:8px}
.sw input{opacity:0;width:0;height:0}
.sl{position:absolute;cursor:pointer;inset:0;background:#ddd;border-radius:20px;transition:.2s}
.sl:before{content:"";position:absolute;height:14px;width:14px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s}
.sw input:checked+.sl{background:#409eff}
.sw input:checked+.sl:before{transform:translateX(18px)}
.empty{text-align:center;padding:30px;color:#bbb;font-size:13px}
.toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 22px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.1);opacity:0;transition:opacity .3s;pointer-events:none}
.toast.s{opacity:1}
.toast.ok{background:#f0f9eb;color:#67c23a}
.toast.err{background:#fef0f0;color:#f56c6c}
@media(prefers-color-scheme:dark){body{background:#14141e;color:#ccc}.c{background:#1e1e2e}li{border-color:#333}li:hover{background:#252535}li.p{background:#1a2a3e;border-color:#2a4a6e}.sl{background:#444}.b{background:#2a2a3a;color:#888}}
</style>
</head>
<body>
<div id="t" class="toast"></div>
<div class="c">
  <div class="h"><h1>🔒 私密文件夹</h1><span class="b">${privateFolders.length} 个私密</span></div>
  <p class="sub">开启 = 文件夹对普通用户隐藏，仅管理员可见</p>
  <ul id="list">${items}</ul>
</div>
<script>
function toast(m, ok) {
  var t = document.getElementById('t');
  t.textContent = m; t.className = 'toast s ' + (ok ? 'ok' : 'err');
  setTimeout(function(){ t.className = 'toast'; }, 2500);
}
document.getElementById('list').addEventListener('change', function(e) {
  if (e.target.tagName !== 'INPUT') return;
  var cb = e.target, name = cb.dataset.f, oldChecked = !cb.checked;
  fetch('?api=1', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'toggle', folder: name })
  }).then(function(r){ return r.json(); }).then(function(d) {
    if (d.error) { cb.checked = oldChecked; toast(d.error, false); return; }
    var li = cb.closest('li');
    li.classList.toggle('p', cb.checked);
    toast(cb.checked ? '🔒 已设为私密' : '🔓 已取消私密', true);
  }).catch(function(){ cb.checked = oldChecked; toast('操作失败', false); });
});
<\/script>
</body></html>`;
}

function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
