import { getDatabase } from '../../utils/databaseAdapter.js';

const PRIVATE_FOLDERS_KEY = 'manage@privateFolders';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
};

export async function onRequest(context) {
    const { request, env } = context;
    const db = getDatabase(env);

    // OPTIONS 预检
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // GET: 获取私密文件夹列表
    if (request.method === 'GET') {
        const list = await getPrivateFolders(db);
        return new Response(JSON.stringify({ folders: list }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    // POST: 添加私密文件夹
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const folder = (body.folder || '').trim().replace(/^\/+|\/+$/g, '');

            if (!folder) {
                return new Response(JSON.stringify({ error: 'Folder path is required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            const list = await getPrivateFolders(db);
            if (list.includes(folder)) {
                return new Response(JSON.stringify({ error: 'Folder already in private list' }), {
                    status: 409,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            list.push(folder);
            await db.put(PRIVATE_FOLDERS_KEY, JSON.stringify(list));

            return new Response(JSON.stringify({ folders: list }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    // DELETE: 移除私密文件夹
    if (request.method === 'DELETE') {
        try {
            const body = await request.json();
            const folder = (body.folder || '').trim().replace(/^\/+|\/+$/g, '');

            if (!folder) {
                return new Response(JSON.stringify({ error: 'Folder path is required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            let list = await getPrivateFolders(db);
            list = list.filter(f => f !== folder);
            await db.put(PRIVATE_FOLDERS_KEY, JSON.stringify(list));

            return new Response(JSON.stringify({ folders: list }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
}

/**
 * 获取私密文件夹列表（供其他模块调用）
 */
export async function getPrivateFolders(db) {
    try {
        const raw = await db.get(PRIVATE_FOLDERS_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

/**
 * 检查路径是否在私密文件夹中（供其他模块调用）
 * @param {string} path - 文件路径或目录路径
 * @param {string[]} privateFolders - 私密文件夹列表
 */
export function isInPrivateFolder(path, privateFolders) {
    if (!privateFolders || privateFolders.length === 0) return false;
    const normalized = path.replace(/^\/+|\/+$/g, '');
    for (const pf of privateFolders) {
        const nf = pf.replace(/^\/+|\/+$/g, '');
        if (normalized === nf || normalized.startsWith(nf + '/')) {
            return true;
        }
    }
    return false;
}
