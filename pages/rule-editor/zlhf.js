const bridge = window.AstrBotPluginPage;
let zlhf_currentRules = [];

function zlhf_showToast(message, type = "success") {
    const layer = document.getElementById("toastLayer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    layer.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

function zlhf_escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function zlhf_renderRules() {
    const container = document.getElementById("zlhfContainer");
    if (!zlhf_currentRules.length) {
        container.innerHTML = '<div class="empty-state">暂无规则，点击“添加规则”开始</div>';
        return;
    }
    container.innerHTML = "";
    zlhf_currentRules.forEach((rule, idx) => {
        const gjcKey = Object.keys(rule.gjc || {})[0] || '';
        const gjcVal = rule.gjc ? rule.gjc[gjcKey] : '';
        const dt = rule.dt === 'true';
        const tp = rule.tp || '';
        const sp = rule.sp || '';

        const card = document.createElement("div");
        card.className = "rule-card";
        card.innerHTML = `
            <div class="rule-header" style="margin-bottom: 10px;">
                <div class="hfkts" >
                    <text class="hf-tsc">关键词</text>
                    <input type="text" class="keyword-input" placeholder="关键词" value="${zlhf_escapeHtml(gjcKey)}" data-idx="${idx}" data-field="keyword">
                </div>
                <div class="hfkts">
                    <text class="hf-tsc">回复内容</text>
                    <textarea rows="4" class="reply-input" placeholder="回复内容" data-idx="${idx}" data-field="reply">${zlhf_escapeHtml(gjcVal)}</textarea>
                </div>
                <button class="delete-rule" data-idx="${idx}">删除该规则</button>
            </div>
            <div class="hfkts">
                <text class="hf-tsc">发送视频</text>
                <input type="text" class="sp-input" placeholder="视频链接" value="${zlhf_escapeHtml(sp)}" data-idx="${idx}" data-field="sp">
            </div>
            <div class="hfkts" style="margin-top: 10px;">
                <text class="hf-tsc">发送图片</text>
                <input type="text" class="tp-input" placeholder="图片链接" value="${zlhf_escapeHtml(tp)}" data-idx="${idx}" data-field="tp">
            </div>
            <label class="rule-switch" style="cursor:pointer; font-size:14px;margin-top: 10px;">
                <input type="checkbox" ${dt ? 'checked' : ''} data-idx="${idx}" data-field="dt"> 图片视频混合模式（图片发送图片，视频发送链接）
            </label>
        `;
        container.appendChild(card);
    });
    zlhf_attachEvents();
}

function zlhf_attachEvents() {
    const container = document.getElementById("zlhfContainer");
    if (!container) return;
    // 删除规则
    container.querySelectorAll('.delete-rule').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            zlhf_currentRules.splice(idx, 1);
            zlhf_renderRules();
        };
    });

    // 关键词和回复内容
    container.querySelectorAll('.keyword-input, .reply-input').forEach(inp => {
        inp.onchange = () => {
            const idx = parseInt(inp.dataset.idx);
            const field = inp.dataset.field;
            if (field === 'keyword') {
                const oldKey = Object.keys(zlhf_currentRules[idx].gjc)[0];
                const oldVal = zlhf_currentRules[idx].gjc[oldKey];
                zlhf_currentRules[idx].gjc = { [inp.value]: oldVal };
            } else if (field === 'reply') {
                const oldKey = Object.keys(zlhf_currentRules[idx].gjc)[0];
                zlhf_currentRules[idx].gjc[oldKey] = inp.value;
            }
        };
    });

    // 发送视频 (sp)
    container.querySelectorAll('.sp-input').forEach(inp => {
        inp.onchange = () => {
            const idx = parseInt(inp.dataset.idx);
            zlhf_currentRules[idx].sp = inp.value;
        };
    });

    // 发送图片 (tp)
    container.querySelectorAll('.tp-input').forEach(inp => {
        inp.onchange = () => {
            const idx = parseInt(inp.dataset.idx);
            zlhf_currentRules[idx].tp = inp.value;
        };
    });

    // 图片视频混合模式 (dt)
    container.querySelectorAll('.rule-switch input').forEach(chk => {
        chk.onchange = () => {
            const idx = parseInt(chk.dataset.idx);
            zlhf_currentRules[idx].dt = chk.checked ? 'true' : 'false';
        };
    });
}

function zlhf_addRule() {
    zlhf_currentRules.push({
        gjc: { "新关键词": "新回复" },
        tp: "",
        sp: "",
        dt: "false"
    });
    zlhf_showToast("添加成功", "success");
    zlhf_renderRules();
}

async function zlhf_loadRules() {
    try {
        if (!bridge) throw new Error("桥接对象未找到");
        await bridge.ready();
        // 传递文件名参数，指定读取 zlhf.json
        const result = await bridge.apiGet("hqgz", { file: "zlhf.json" });
        let data = null;
        if (result && result.success === true) {
            data = result.data;
        } else if (Array.isArray(result)) {
            data = result;
        } else {
            throw new Error("返回数据格式错误");
        }

        // 兼容 data 为 {} 或 null/undefined，视为空数组
        if (data === null || data === undefined) {
            zlhf_currentRules = [];
        } else if (Array.isArray(data)) {
            zlhf_currentRules = data.map(item => {
                const dt = item.dt !== undefined ? item.dt : (item.sfjt === 'true' ? 'true' : 'false');
                const { jtc, sfjt, ...cleanItem } = item;
                return {
                    ...cleanItem,
                    dt: dt,
                    tp: item.tp || "",
                    sp: item.sp || ""
                };
            });
        } else if (typeof data === 'object' && Object.keys(data).length === 0) {
            zlhf_currentRules = [];
        } else {
            throw new Error("返回数据不是数组");
        }

        zlhf_renderRules();
        zlhf_showToast(`加载成功，共 ${zlhf_currentRules.length} 条规则`, "success");
    } catch (err) {
        console.error(err);
        zlhf_showToast("加载失败: " + err.message, "error");
        zlhf_currentRules = [];
        zlhf_renderRules();
    }
}

async function zlhf_saveRules() {
    for (let i = 0; i < zlhf_currentRules.length; i++) {
        const rule = zlhf_currentRules[i];
        const keyword = Object.keys(rule.gjc)[0];
        const reply = rule.gjc[keyword];
        if (!keyword || !keyword.trim()) {
            zlhf_showToast(`第 ${i+1} 条规则的关键词不能为空`, "error");
            return;
        }
        if (!reply || !reply.trim()) {
            zlhf_showToast(`第 ${i+1} 条规则的回复内容不能为空`, "error");
            return;
        }
    }
    try {
        if (!bridge) throw new Error("桥接对象未找到");
        await bridge.ready();
        // 传递文件名和要保存的数据，指定保存到 zlhf.json
        const result = await bridge.apiPost("bcgz", { file: "zlhf.json", data: zlhf_currentRules });
        console.log("保存返回:", result);
        if (Array.isArray(result)) {
            zlhf_showToast("保存成功", "success");
        } else if (result && result.success === true) {
            zlhf_showToast("保存成功", "success");
        } else {
            zlhf_showToast("保存失败: " + (result?.message || "未知错误"), "error");
        }
    } catch (err) {
        console.error(err);
        zlhf_showToast("保存失败: " + err.message, "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("zlhfBtn").addEventListener("click", zlhf_addRule);
    document.getElementById("zlhfsaveBtn").addEventListener("click", zlhf_saveRules);
    document.getElementById("zlhfrefreshBtn").addEventListener("click", zlhf_loadRules);
    zlhf_loadRules();
});
