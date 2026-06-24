const bridge = window.AstrBotPluginPage;
let zdsc_currentRules = [];

function zdsc_showToast(message, type = "success") {
    const layer = document.getElementById("toastLayer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    layer.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

function zdsc_escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// 获取 jtc 对象中最大的键数字 + 1
function zdsc_getNextJtcKey(jtcObj) {
    const keys = Object.keys(jtcObj).filter(k => !isNaN(k)).map(Number);
    return keys.length ? String(Math.max(...keys) + 1) : "1";
}

// 重新编号 jtc：把现有的轮次按顺序重新分配 key 为 1, 2, 3...
function zdsc_renumberJtc(jtcObj) {
    const oldKeys = Object.keys(jtcObj).sort((a, b) => Number(a) - Number(b));
    if (oldKeys.length === 0) return {};
    const newJtc = {};
    oldKeys.forEach((oldKey, index) => {
        newJtc[String(index + 1)] = jtcObj[oldKey];
    });
    return newJtc;
}

function zdsc_renderRules() {
    const container = document.getElementById("zdscContainer");
    if (!zdsc_currentRules.length) {
        container.innerHTML = '<div class="empty-state">暂无规则，点击“添加规则”开始</div>';
        return;
    }
    container.innerHTML = "";
    zdsc_currentRules.forEach((rule, idx) => {
        const gjcKey = Object.keys(rule.gjc || {})[0] || '';
        const gjcVal = rule.gjc ? rule.gjc[gjcKey] : '';
        const sfjt = rule.sfjt === 'true';
        const jtc = rule.jtc || {};
        const jtcKeys = Object.keys(jtc).sort((a, b) => Number(a) - Number(b));

        const card = document.createElement("div");
        card.className = "rule-card";
        card.dataset.idx = idx;
        card.innerHTML = `
            <div class="rule-header">
                <div class="hfkts">
                    <text class="hf-tsc">关键词</text>
                    <input type="text" class="keyword-input" placeholder="关键词" value="${zdsc_escapeHtml(gjcKey)}" data-idx="${idx}" data-field="keyword">
                </div>
                <div class="hfkts">
                    <text class="hf-tsc">回复内容</text>
                    <textarea rows="4" class="reply-input" placeholder="回复内容" data-idx="${idx}" data-field="reply">${zdsc_escapeHtml(gjcVal)}</textarea>
                </div>
                <button class="delete-rule" data-idx="${idx}">删除该规则</button>
            </div>
            <label class="rule-switch" style="cursor:pointer; font-size:14px;">
                <input type="checkbox" ${sfjt ? 'checked' : ''} data-idx="${idx}" data-field="sfjt"> 多轮对话
            </label>
            <div class="jtc-section">
                <div class="jtc-title">多轮对话</div>
                ${jtcKeys.map(jtcKey => {
                    const subRules = jtc[jtcKey];
                    if (!Array.isArray(subRules)) return '';
                    const optionsHtml = subRules.map((subItem, subIdx) => {
                        const subKey = Object.keys(subItem)[0] || '';
                        const subVal = subItem[subKey] || '';
                        return `
                            <li class="jtc-item" data-idx="${idx}" data-jtckey="${jtcKey}" data-subidx="${subIdx}">
                                <div class="hfkts">
                                    <text class="hf-tsc">选项 ${subIdx + 1}</text>
                                    <input type="text" placeholder="关键词" value="${zdsc_escapeHtml(subKey)}" data-idx="${idx}" data-jtckey="${jtcKey}" data-subidx="${subIdx}" data-jtcfield="key">
                                </div>
                                <div class="hfkts">
                                    <text class="hf-tsc">回复内容</text>
                                    <input type="text" placeholder="回复内容" value="${zdsc_escapeHtml(subVal)}" data-idx="${idx}" data-jtckey="${jtcKey}" data-subidx="${subIdx}" data-jtcfield="val">
                                </div>
                                <button class="btn-delete-jtc" data-idx="${idx}" data-jtckey="${jtcKey}" data-subidx="${subIdx}" style="background:none; border:none; cursor:pointer; padding-bottom:6px; color:#ef4444;">删除该项</button>
                            </li>
                        `;
                    }).join('');
                    return `
                        <div class="jtc-round" data-jtckey="${jtcKey}">
                            <div style="width:100%; border-top: 1px dashed #d1d5db; margin-bottom:12px; margin-top:12px;"></div>
                            <div class="jtc-round-header">
                                <label style="margin-bottom:12px; display: flex; align-items: center; gap:8px;">
                                    <span class="jtc-round-title">第 ${jtcKey} 轮对话</span>
                                    <button class="btn btn-danger btn-delete-round" data-idx="${idx}" data-jtckey="${jtcKey}" style="font-size:11px; padding:2px 8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">删除该轮</button>
                                </label>
                            </div>
                            <ul class="jtc-list" data-idx="${idx}" data-jtckey="${jtcKey}">
                                ${optionsHtml}
                            </ul>
                            <button class="btn btn-success btn-add-option" data-idx="${idx}" data-jtckey="${jtcKey}" style="font-size:12px; padding:2px 10px; margin-top:6px;">+ 添加选项</button>
                        </div>
                    `;
                }).join('')}
                <button class="btn btn-primary btn-add-round" data-idx="${idx}" style="font-size:13px; padding:4px 14px; margin-top:10px;">+ 添加第 ${jtcKeys.length + 1} 轮对话</button>
            </div>
        `;
        const chk = card.querySelector('.rule-switch input');
        const jtcSection = card.querySelector('.jtc-section');
        if (chk && jtcSection) {
            jtcSection.style.display = chk.checked ? '' : 'none';
        }
        container.appendChild(card);
    });
    zdsc_attachEvents();
}

function zdsc_attachEvents() {
    const container = document.getElementById("zdscContainer");
    if (!container) return;

    // 删除规则
    container.querySelectorAll('.delete-rule').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            zdsc_currentRules.splice(idx, 1);
            zdsc_renderRules();
            zdsc_showToast("规则已删除", "success");
        };
    });

    // 关键词/回复修改
    container.querySelectorAll('.keyword-input, .reply-input').forEach(inp => {
        inp.onchange = () => {
            const idx = parseInt(inp.dataset.idx);
            const field = inp.dataset.field;
            const rule = zdsc_currentRules[idx];
            if (!rule) return;
            if (field === 'keyword') {
                const oldKey = Object.keys(rule.gjc)[0];
                const oldVal = rule.gjc[oldKey];
                rule.gjc = { [inp.value]: oldVal };
            } else if (field === 'reply') {
                const oldKey = Object.keys(rule.gjc)[0];
                rule.gjc[oldKey] = inp.value;
            }
        };
    });

    // 多轮对话开关
    container.querySelectorAll('.rule-switch input').forEach(chk => {
        chk.onchange = () => {
            const idx = parseInt(chk.dataset.idx);
            const rule = zdsc_currentRules[idx];
            if (!rule) return;
            rule.sfjt = chk.checked ? 'true' : 'false';
            const section = chk.closest('.rule-switch')?.nextElementSibling;
            if (section && section.classList.contains('jtc-section')) {
                section.style.display = chk.checked ? '' : 'none';
            }
        };
    });

    // 删除整轮对话（并重新编号）
    container.querySelectorAll('.btn-delete-round').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            const jtcKey = btn.dataset.jtckey;
            const rule = zdsc_currentRules[idx];
            if (!rule || !rule.jtc) return;

            // 删除指定轮次
            delete rule.jtc[jtcKey];

            // 重新编号：把剩余的轮次按顺序重新分配 key 为 1, 2, 3...
            const oldKeys = Object.keys(rule.jtc).sort((a, b) => Number(a) - Number(b));
            if (oldKeys.length === 0) {
                rule.jtc = {};
            } else {
                const newJtc = {};
                oldKeys.forEach((oldKey, index) => {
                    newJtc[String(index + 1)] = rule.jtc[oldKey];
                });
                rule.jtc = newJtc;
            }

            zdsc_renderRules();
            zdsc_showToast("轮次已删除，剩余轮次已重新编号", "success");
        };
    });

    // 添加选项（向指定轮次添加一个子规则）
    container.querySelectorAll('.btn-add-option').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            const jtcKey = btn.dataset.jtckey;
            const rule = zdsc_currentRules[idx];
            if (!rule || !rule.jtc || !rule.jtc[jtcKey]) return;
            if (!Array.isArray(rule.jtc[jtcKey])) {
                rule.jtc[jtcKey] = [];
            }
            rule.jtc[jtcKey].push({ "新选项": "新回复" });
            zdsc_renderRules();
            zdsc_showToast(`第 ${jtcKey} 轮已添加选项`, "success");
        };
    });

    // 添加新轮次
    container.querySelectorAll('.btn-add-round').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            const rule = zdsc_currentRules[idx];
            if (!rule) return;
            if (!rule.jtc || typeof rule.jtc !== 'object') {
                rule.jtc = {};
            }
            const newKey = zdsc_getNextJtcKey(rule.jtc);
            rule.jtc[newKey] = [{ "新选项": "新回复" }];
            zdsc_renderRules();
            zdsc_showToast(`已添加第 ${newKey} 轮对话`, "success");
        };
    });

    // 选项内容修改
    container.querySelectorAll('.jtc-item input').forEach(inp => {
        inp.onchange = () => {
            const idx = parseInt(inp.dataset.idx);
            const jtcKey = inp.dataset.jtckey;
            const subIdx = parseInt(inp.dataset.subidx);
            const field = inp.dataset.jtcfield;
            const rule = zdsc_currentRules[idx];
            if (!rule || !rule.jtc || !rule.jtc[jtcKey]) return;
            const subRules = rule.jtc[jtcKey];
            if (!Array.isArray(subRules) || subIdx >= subRules.length) return;
            const item = subRules[subIdx];
            if (field === 'key') {
                const oldVal = Object.values(item)[0];
                subRules[subIdx] = { [inp.value]: oldVal };
            } else if (field === 'val') {
                const oldKey = Object.keys(item)[0];
                subRules[subIdx] = { [oldKey]: inp.value };
            }
        };
    });

    // 删除单个选项
    container.querySelectorAll('.btn-delete-jtc').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            const jtcKey = btn.dataset.jtckey;
            const subIdx = parseInt(btn.dataset.subidx);
            const rule = zdsc_currentRules[idx];
            if (!rule || !rule.jtc || !rule.jtc[jtcKey]) return;
            const subRules = rule.jtc[jtcKey];
            if (!Array.isArray(subRules) || subIdx >= subRules.length) return;
            subRules.splice(subIdx, 1);
            if (subRules.length === 0) {
                delete rule.jtc[jtcKey];
            }
            zdsc_renderRules();
            zdsc_showToast("选项已删除", "success");
        };
    });
}

function zdsc_addRule() {
    zdsc_currentRules.push({
        gjc: { "新关键词": "新回复" },
        sfjt: "false",
        jtc: {}
    });
    zdsc_showToast("添加成功", "success");
    zdsc_renderRules();
}

async function zdsc_loadRules() {
    try {
        if (!bridge) throw new Error("桥接对象未找到");
        await bridge.ready();
        const result = await bridge.apiGet("hqgz", { file: "zdsc.json" });
        console.log("加载返回:", result);

        let data = null;
        if (result && result.success === true) {
            data = result.data;
        } else if (Array.isArray(result)) {
            data = result;
        } else {
            throw new Error("返回数据格式错误");
        }

        if (!Array.isArray(data)) {
            zdsc_currentRules = [];
        } else {
            zdsc_currentRules = data.map(item => {
                const rule = {
                    gjc: item.gjc || { "默认关键词": "默认回复" },
                    sfjt: item.sfjt || "false",
                    jtc: item.jtc || {}
                };
                if (typeof rule.jtc !== 'object' || Array.isArray(rule.jtc)) {
                    rule.jtc = {};
                }
                Object.keys(rule.jtc).forEach(key => {
                    if (!Array.isArray(rule.jtc[key])) {
                        rule.jtc[key] = [];
                    }
                });
                return rule;
            });
        }

        zdsc_renderRules();
        zdsc_showToast(`加载成功，共 ${zdsc_currentRules.length} 条规则`, "success");
    } catch (err) {
        console.error(err);
        zdsc_showToast("加载失败: " + err.message, "error");
        zdsc_currentRules = [];
        zdsc_renderRules();
    }
}

async function zdsc_saveRules() {
    for (let i = 0; i < zdsc_currentRules.length; i++) {
        const rule = zdsc_currentRules[i];
        const keyword = Object.keys(rule.gjc)[0];
        const reply = rule.gjc[keyword];
        if (!keyword || !keyword.trim()) {
            zdsc_showToast(`第 ${i+1} 条规则的关键词不能为空`, "error");
            return;
        }
        if (!reply || !reply.trim()) {
            zdsc_showToast(`第 ${i+1} 条规则的回复内容不能为空`, "error");
            return;
        }
        if (rule.jtc) {
            const keys = Object.keys(rule.jtc);
            for (let ki = 0; ki < keys.length; ki++) {
                const key = keys[ki];
                const subList = rule.jtc[key];
                if (!Array.isArray(subList)) continue;
                for (let si = 0; si < subList.length; si++) {
                    const subItem = subList[si];
                    const subKey = Object.keys(subItem)[0];
                    const subVal = subItem[subKey];
                    if (!subKey || !subKey.trim()) {
                        zdsc_showToast(`第 ${i+1} 条规则的第 ${key} 轮第 ${si+1} 项关键词不能为空`, "error");
                        return;
                    }
                    if (!subVal || !subVal.trim()) {
                        zdsc_showToast(`第 ${i+1} 条规则的第 ${key} 轮第 ${si+1} 项回复不能为空`, "error");
                        return;
                    }
                }
            }
        }
    }

    try {
        if (!bridge) throw new Error("桥接对象未找到");
        await bridge.ready();
        const result = await bridge.apiPost("bcgz", { file: "zdsc.json", data: zdsc_currentRules });
        console.log("保存返回:", result);
        if (Array.isArray(result)) {
            zdsc_showToast("保存成功", "success");
        } else if (result && result.success === true) {
            zdsc_showToast("保存成功", "success");
        } else {
            zdsc_showToast("保存失败: " + (result?.message || "未知错误"), "error");
        }
    } catch (err) {
        console.error(err);
        zdsc_showToast("保存失败: " + err.message, "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("zdscBtn").addEventListener("click", zdsc_addRule);
    document.getElementById("zdscsaveBtn").addEventListener("click", zdsc_saveRules);
    document.getElementById("zdscrefreshBtn").addEventListener("click", zdsc_loadRules);
    zdsc_loadRules();
});
