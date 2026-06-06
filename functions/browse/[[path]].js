/**
 * 自定义公开浏览页面
 * 路径: /browse/ 或 /browse/xxx/yyy
 */

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const origin = url.origin;

    let dir = url.pathname.replace(/^\/browse\/?/, '').replace(/\/$/, '');
try { dir = decodeURIComponent(dir); } catch(e) {}
    dir = dir.replace(/\.\./g, '_').replace(/\\/g, '/');

    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('p')) || 1;
    const count = 50;
    const start = (page - 1) * count;

    let files = [], directories = [], totalCount = 0, error = null;
    try {
        let apiUrl = `${origin}/api/public/list?dir=${encodeURIComponent(dir)}&start=${start}&count=${count}&recursive=false`;
        if (search) apiUrl += `&search=${encodeURIComponent(search)}`;
        const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });

        if (res.ok) {
            const data = await res.json();
            files = data.files || [];
            directories = data.directories || [];
            totalCount = data.totalCount || 0;
        } else if (res.status === 403) {
            const data = await res.json();
            error = data.isPrivate ? 'private' : 'forbidden';
        } else {
            error = 'error';
        }
    } catch (e) {
        error = 'error';
    }

    const html = renderPage({ dir, files, directories, totalCount, page, count, start, search, error, origin });
    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

function renderPage(data) {
    const { dir, files, directories, totalCount, page, count, start, search, error, origin } = data;

    const crumbs = dir
        ? [{n: '\u{1F3E0}', p: ''}, ...dir.split('/').map((d, i, a) => ({n: decodeURIComponent(d), p: a.slice(0, i + 1).join('/')}))]
        : [{n: '\u{1F3E0}', p: ''}];
    const bread = crumbs.map((c, i) =>
        i < crumbs.length - 1
            ? `<a href="${c.p === '' ? (crumbs.length > 1 ? '/browse/' : '/') : '/browse/' + c.p}">${escapeHtml(c.n)}</a><span class="sp">/</span>`
            : c.p === ''
                ? `<a href="/">${escapeHtml(c.n)}</a>`
                : `<span>${escapeHtml(c.n)}</span>`
    ).join('');

    let foldersHtml = '';
    if (directories.length) {
                foldersHtml = '<div class="folds">' + directories.map(d => {
                    const name = (typeof d === 'string' ? d : d.name || '').split('/').pop();
                    const p = typeof d === 'string' ? d : d.name || '';
                    const prv = typeof d === 'object' && d.isPrivate;
                    const icon = prv ? '\u{1F512}' : '\u{1F4C1}';
                    const cls = prv ? ' fd fp' : ' fd';
                    const target = prv ? '#' : '/browse/' + encodeURIComponent(p);
                    return `<a class="${cls}" href="${target}"${prv ? ' data-priv="1"' : ''}><span class="fd-i">${icon}</span><span class="fd-n">${escapeHtml(name)}${prv ? '' : ''}</span></a>`;
                }).join('') + '</div>';
    }

    let filesHtml = '';
    if (files.length) {
        filesHtml = '<div class="files" id="files">' + files.map(f => {
            const name = f.name || '';
            const meta = f.metadata || {};
            const isImg = /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(name);
            const fname = name.split('/').pop() || name;
            const fsize = meta.FileSize ? fmtSize(meta.FileSize) : '';
            const furl = origin + '/file/' + encodeURIComponent(name);
            const thumbSrc = isImg ? furl : '';
            return `<div class="file">
                <a class="file-link" href="${escapeHtml(furl)}" target="_blank">
                    <div class="fp">${isImg ? `<img src="${escapeHtml(thumbSrc)}" alt="" loading="lazy">` : '<span class="fx">\u{1F4C4}</span>'}</div>
                </a>
                <div class="fb">
                    <a class="fn" href="${escapeHtml(furl)}" target="_blank" title="${escapeHtml(fname)}"><span class="fn-b">${escapeHtml(fname.replace(/\.[^.]+$/, ""))}</span><span class="fn-e">${escapeHtml(fname.match(/\.[^.]+$/) ? fname.match(/\.[^.]+$/)[0] : "")}</span></a>
                    <div class="fm">${fsize ? `<span>${fsize}</span>` : ''}</div>
                </div>
                <div class="fa">
                    <button class="fa-btn cp" title="复制链接" onclick="copyUrl('${escapeHtml(furl)}')" data-copied="false">\u{1F4CB}</button>
                    <a class="fa-btn dl" href="${escapeHtml(furl)}" download title="下载" target="_blank">\u{2B07}</a>
                </div>
            </div>`;
        }).join('') + '</div>';
    }

    const totalPages = Math.ceil(totalCount / count);
    let pagesHtml = '';
    if (totalPages > 1) {
        const pArr = [];
        for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pArr.push(i);
        pagesHtml = '<div class="pg">';
        if (page > 1) pagesHtml += `<a href="/browse/${dir}?p=${page - 1}">\u{2190}</a>`;
        pArr.forEach(p => {
            pagesHtml += p === page ? `<span class="pg-c">${p}</span>` : `<a href="/browse/${dir}?p=${p}">${p}</a>`;
        });
        if (page < totalPages) pagesHtml += `<a href="/browse/${dir}?p=${page + 1}">\u{2192}</a>`;
        pagesHtml += '</div>';
    }

    const empty = !error && !files.length && !directories.length && !search;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${dir || '浏览'} - Fly2Sun ImgHub</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f5;color:#333;font-size:14px;min-height:100vh}
.bar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.95);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid #e8e8e8;padding:0 16px;display:flex;align-items:center;gap:12px;height:48px}
.bar .bc{flex:1;display:flex;align-items:center;gap:2px;overflow:hidden;font-size:13px;line-height:1}
.bar .bc a{color:#409eff;text-decoration:none;white-space:nowrap}
.bar .bc a:hover{text-decoration:underline}
.bar .bc .sp{margin:0 2px;color:#ccc;font-size:12px}
.bar .bc span:last-child{color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sch{display:flex;align-items:center;gap:4px}
.sch input{height:30px;padding:0 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;outline:none;width:100px;transition:width .2s;background:#fafafa}
.sch input:focus{width:150px;border-color:#409eff;background:#fff}
.sch button{height:30px;padding:0 10px;border:1px solid #e0e0e0;border-radius:6px;background:#fafafa;cursor:pointer;font-size:13px;color:#666;white-space:nowrap}
.sch button:hover{border-color:#409eff;color:#409eff}
.vt{display:flex;gap:3px}.mg{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid #e0e0e0;border-radius:6px;text-decoration:none;font-size:13px;transition:all .15s;color:#aaa}.mg:hover{background:#f0f7ff;border-color:#409eff;color:#409eff;text-decoration:none}@media(prefers-color-scheme:dark){.mg{border-color:#333;color:#666}.mg:hover{background:rgba(64,158,255,.1);border-color:#409eff;color:#66b1ff}}
.vt button{width:30px;height:30px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:#aaa;transition:all .15s}
.vt button:hover{border-color:#409eff;color:#409eff}
.vt button.on{background:#409eff;border-color:#409eff;color:#fff}
.c{max-width:1100px;margin:0 auto;padding:16px}
.st{font-size:12px;color:#aaa;margin-bottom:10px}
.folds{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;margin-bottom:16px}
.fd{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fff;border:1px solid #eee;border-radius:6px;text-decoration:none;transition:border-color .15s}
.fd:hover{border-color:#409eff}
.fd-i{font-size:15px}
.fd-n{font-size:13px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fp{background:#fff8f0!important;border-color:#ffd9b3!important}.fp:hover{border-color:#ffa64d!important}.fp-b{font-size:11px;margin-left:4px;opacity:.6;display:inline-flex;align-items:center;vertical-align:middle}@media(prefers-color-scheme:dark){.fp{background:#2a1e1e!important;border-color:#4a2a2a!important}.fp:hover{border-color:#cc7a3a!important}}
.files{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
.file{background:#fff;border:1px solid #eee;border-radius:6px;overflow:hidden;position:relative;transition:border-color .15s}
.file:hover{border-color:#409eff}
.file .file-link{display:block;width:100%;aspect-ratio:1;background:#fafafa;overflow:hidden}
.file .file-link img{width:100%;height:100%;object-fit:cover}
.file .file-link .fx{display:flex;align-items:center;justify-content:center;height:100%;font-size:32px;opacity:.3}
.file .fb{padding:6px 8px}
.file .fn{display:flex;align-items:center;gap:2px;font-size:12px;color:#333;text-decoration:none;line-height:1.4;overflow:hidden}.fn .fn-b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.fn .fn-e{flex-shrink:0;color:#999;font-size:10px}
.file .fn:hover{color:#409eff}
.file .fm{font-size:11px;color:#ccc;margin-top:1px}
.file .fa{position:absolute;top:4px;right:4px;display:flex;gap:3px;opacity:0;transition:opacity .15s}
.file:hover .fa{opacity:1}
.fa-btn{width:28px;height:28px;border:none;border-radius:5px;background:rgba(255,255,255,.92);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;color:#666;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.fa-btn:hover{background:#fff;color:#409eff}
.fa-btn.cp.copied{background:#67c23a;color:#fff;font-size:11px}
.lv .folds{grid-template-columns:1fr}
.lv .files{grid-template-columns:1fr}
.lv .file{display:flex;flex-direction:row;align-items:center;gap:8px;padding:4px 8px}
.lv .file .file-link{width:32px;height:32px;aspect-ratio:auto;border-radius:4px;flex-shrink:0}
.lv .file .fb{flex:1;padding:0;display:flex;align-items:center;gap:10px;min-width:0}
.lv .file .fn{font-size:13px;flex:1;min-width:0;display:flex;align-items:center;gap:2px;overflow:hidden}.lv .file .fn .fn-b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.lv .file .fn .fn-e{flex-shrink:0;color:#999;font-size:11px}
.lv .file .fm{margin-top:0;flex-shrink:0}
.lv .file .fa{position:static;opacity:1;flex-shrink:0}
.lv .fd{padding:6px 10px}
.pg{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:20px;padding:12px 0}
.pg a,.pg .pg-c{min-width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;text-decoration:none;font-size:13px}
.pg a{background:#fff;border:1px solid #eee;color:#333}
.pg a:hover{background:#f0f7ff;border-color:#409eff;color:#409eff}
.pg .pg-c{background:#409eff;color:#fff}
.emp{text-align:center;padding:60px 20px;color:#bbb}
.emp .e-i{font-size:40px;margin-bottom:10px}
.emp p{font-size:14px}
.err{text-align:center;padding:80px 20px}
.err .e-i{font-size:48px;margin-bottom:12px}
.err h2{font-size:18px;font-weight:500;margin-bottom:16px;color:#666}
.btn{display:inline-block;padding:7px 18px;border-radius:6px;text-decoration:none;font-size:13px;background:#409eff;color:#fff}
.btn:hover{background:#66b1ff}
@media(prefers-color-scheme:dark){
body{background:#14141e;color:#ccc}
.bar{background:rgba(20,20,30,.95);border-color:#2a2a3a}
.bar .bc span:last-child{color:#999}
.fd,.file{background:#1e1e2e;border-color:#2a2a3a}
.fd-n,.file .fn{color:#ccc}.fn .fn-e{color:#888}
.file .file-link{background:#252535}
.pg a{background:#1e1e2e;border-color:#2a2a3a;color:#ccc}
.sch input,.sch button{background:#252535;border-color:#333;color:#ccc}
.vt button{background:#252535;border-color:#333;color:#666}
}
</style>
</head><body>
<div class="bar">
  <div class="bc">${bread}</div>
  <a href="/api/private-folders-panel" class="mg" title="管理私密文件夹">🔒</a><div class="vt">
    <button id="v-tg" title="切换视图" onclick="window.tg()">▣</button></div>
  <form class="sch" action="/browse/${dir}" method="get">
    <input type="text" name="search" placeholder="搜索" value="${escapeHtml(search)}">
    <button>\u{1F50D}</button>
  </form>
</div>
<div class="c" id="main">
${error === 'private'
    ? `<div class="err"><div class="e-i">\u{1F512}</div><h2>仅管理员可查看</h2><a href="/browse/" class="btn">返回</a></div>`
    : error === 'forbidden'
    ? `<div class="err"><div class="e-i">\u{1F6AB}</div><h2>无法访问</h2><a href="/browse/" class="btn">返回</a></div>`
    : error === 'error'
    ? `<div class="err"><div class="e-i">\u{26A0}\u{FE0F}</div><h2>加载失败</h2><a href="/browse/" class="btn">刷新</a></div>`
    : empty
    ? `<div class="emp"><div class="e-i">\u{1F4C2}</div><p>${search ? '没有匹配的文件' : '空的'}</p>${search ? `<a href="/browse/${dir}" style="display:inline-block;margin-top:10px;color:#409eff;font-size:13px">清除搜索</a>` : ''}</div>`
    : `<div class="st">${totalCount} 文件${directories.length ? ' \u{00B7} ' + directories.length + ' 文件夹' : ''}</div>${foldersHtml}${filesHtml}${pagesHtml}`}
</div>
<script>
(function(){var v=localStorage.getItem('fv')||'list';window.tg=function(){var e=document.getElementById('main');if(!e)return;var n=e.classList.toggle('lv');var b=document.getElementById('v-tg');if(b)b.textContent=n?'≡':'▣';localStorage.setItem('fv',n?'list':'grid')};if(v==='list'){var e=document.getElementById('main');if(e)e.classList.add('lv');var b=document.getElementById('v-tg');if(b)b.textContent='≡'}})();
function copyUrl(u){var b=event&&event.target;if(!b||b.dataset.copied==='true')return;navigator.clipboard.writeText(u).then(function(){b.innerHTML='✓';b.classList.add('copied');b.dataset.copied='true';setTimeout(function(){b.innerHTML='\u{1F4CB}';b.classList.remove('copied');b.dataset.copied='false'},2000)}).catch(function(){})}
<\/script>
</body></html>`;
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtSize(mb) {
    const n = parseFloat(mb);
    if (isNaN(n)) return '';
    if (n < 1) return Math.round(n * 1024) + 'KB';
    return n.toFixed(1) + 'MB';
}
