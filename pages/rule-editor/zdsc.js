const bridge = window.AstrBotPluginPage;
let zdsc_data = [];
let zdsc_xzxm = 0;

document.addEventListener('DOMContentLoaded', function() {
    const zdsc_tjgz = document.getElementById('zdsc_tjgz');
    const zdsc_bcgz = document.getElementById('zdsc_bcgz');
    const zdsc_sxgz = document.getElementById('zdsc_sxgz');
    (async function() {
        await zdsc_loadRules();
    })();
    zdsc_tjgz.addEventListener('click', () => { 
        // 构造新规则
        const newRule = {
            gjc: { "新关键词": "新回复" },
            sfjt: "false",
            jtc: {}
        };
        // 添加到数据数组末尾
        zdsc_data.push(newRule);
        // 选中新添加的规则（最后一条）
        zdsc_xzxm = zdsc_data.length - 1;
        // 刷新界面
        zdsc_renderList();
        zdsc_updateReply();
        zdsc_showToast('已添加新规则', 'success');
    });
    zdsc_bcgz.addEventListener('click', () => { 
        (async function() {
            await zdsc_saveRules(zdsc_data);
        })();
    });
    zdsc_sxgz.addEventListener('click', () => { 
        //刷新
        (async function() {
            await zdsc_loadRules();
        })();
    });
    const container = document.getElementById('zdsc_lb');
    if (container) {
        container.addEventListener('click', function(e) {
            // 找到被点击的 .lbx 元素（包括子元素点击）
            const lbx = e.target.closest('.lbx');
            if (!lbx) return;
            if (lbx.classList.contains('active')) return;
            // 读取 data-index 属性
            const index = parseInt(lbx.dataset.index, 10);
            if (!isNaN(index)) {
                zdsc_xzxm = index;
                zdsc_renderList();
                zdsc_updateReply();
            }
        });
    }
    const keywordInput = document.getElementById('zdsc_ppgjc');
    if (keywordInput) {
        keywordInput.addEventListener('input', function() {
            if (typeof zdsc_xzxm === 'undefined' || !Array.isArray(zdsc_data) || zdsc_data.length === 0) return;
            const rule = zdsc_data[zdsc_xzxm];
            if (!rule) return;
            const newKeyword = this.value;
            // 获取旧回复（保留原来的回复值）
            const gjc = rule.gjc || {};
            const oldReply = Object.values(gjc)[0] || '';
            // 更新 gjc 的键为新关键词，值不变
            rule.gjc = { [newKeyword]: oldReply };
            // 更新复选框状态（根据新关键词是否以 >:// 开头）
            const checkbox = document.getElementById('zdsc_sfqy');
            if (checkbox) {
                checkbox.checked = !newKeyword.startsWith('>:://');
            }
            // 重新渲染列表，使关键词显示变化
            zdsc_renderList();
            zdsc_updateReply();
        });
    }
    
    // ---------- 删除规则 ----------
    const delRuleBtn = document.getElementById('zdsc_scgz');
    if (delRuleBtn) {
        delRuleBtn.addEventListener('click', function() {
            // 检查是否有选中的规则
            if (typeof zdsc_xzxm === 'undefined' || !Array.isArray(zdsc_data) || zdsc_data.length === 0) {
                zdsc_showToast('没有可删除的规则', 'error');
                return;
            }
    
            // 删除指定索引的规则
            zdsc_data.splice(zdsc_xzxm, 1);
    
            // 更新选中索引
            if (zdsc_data.length === 0) {
                zdsc_xzxm = undefined;  // 无数据时取消选中
            } else if (zdsc_xzxm >= zdsc_data.length) {
                zdsc_xzxm = zdsc_data.length - 1;  // 若删除的是最后一项，则选中新最后一项
            }
            // 如果 zdsc_xzxm 为 undefined，后续渲染会清空控件
    
            // 刷新界面
            zdsc_renderList();      // 重新渲染列表
            zdsc_updateReply();     // 更新输入框和多轮区域（内部会调用 zdsc_qtlcdh 清空或显示）
            zdsc_showToast('规则已删除', 'success');
        });
    }
    // ---------- 回复文本域 ----------
    const replyTextarea = document.getElementById('zdsc_hfnr');
    if (replyTextarea) {
        replyTextarea.addEventListener('input', function() {
            if (typeof zdsc_xzxm === 'undefined' || !Array.isArray(zdsc_data) || zdsc_data.length === 0) return;
            const rule = zdsc_data[zdsc_xzxm];
            if (!rule) return;
            const gjc = rule.gjc || {};
            const keys = Object.keys(gjc);
            const keyword = keys.length > 0 ? keys[0] : '';
            // 更新回复值
            rule.gjc = { [keyword]: this.value };
            // 不需要重绘列表，因为列表只显示关键词
        });
    }

    // ---------- 复选框 ----------
    const checkbox = document.getElementById('zdsc_sfqy');
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            if (typeof zdsc_xzxm === 'undefined' || !Array.isArray(zdsc_data) || zdsc_data.length === 0) return;
            const rule = zdsc_data[zdsc_xzxm];
            if (!rule) return;
            const gjc = rule.gjc || {};
            const keys = Object.keys(gjc);
            let keyword = keys.length > 0 ? keys[0] : '';
            const oldReply = Object.values(gjc)[0] || '';
            // 如果复选框取消选中（即要加前缀），且关键词不以前缀开头则添加
            if (!this.checked && !keyword.startsWith('>:://')) {
                keyword = '>:://' + keyword;
            } else if (this.checked && keyword.startsWith('>:://')) {
                // 如果选中（即要去掉前缀），且关键词以前缀开头则移除
                keyword = keyword.slice(5);
            }
            rule.gjc = { [keyword]: oldReply };
            // 更新关键词输入框
            const input = document.getElementById('zdsc_ppgjc');
            if (input) input.value = keyword;
            // 重新渲染列表
            zdsc_renderList();
            zdsc_updateReply();
        });
    }
    // ---------- 多轮对话----------
    const dldhan = document.getElementById('zdsc_dldhan');
    if (dldhan) {
        dldhan.addEventListener('change', function() {
            if (typeof zdsc_xzxm === 'undefined' || !Array.isArray(zdsc_data) || zdsc_data.length === 0) {
                return;
            }
            const rule = zdsc_data[zdsc_xzxm];
            if (!rule) return;
            // 根据复选框状态设置 sfjt 为字符串 "true" 或 "false"
            rule.sfjt = this.checked ? "true" : "false";
            // 列表不显示 sfjt，所以无需重绘列表；但如果你将来想在界面上显示状态，可调用 zdsc_renderList()
            zdsc_updateReply();
        });
    }
    // 监听多轮对话输入变化
    const dllb = document.getElementById('zdsc_dllb');
    if (dllb) {
        dllb.addEventListener('input', function(e) {
            const target = e.target;
            // 只处理关键词输入框和回复文本域（可以按类名区分）
            if (!target.matches('.yc-srk')) return; // 或更精确的类名，如 opt-keyword / opt-reply
    
            const roundKey = target.dataset.round;
            const optIdx = parseInt(target.dataset.optidx, 10);
            if (!roundKey || isNaN(optIdx)) return;
    
            const rule = zdsc_data[zdsc_xzxm];
            if (!rule || !rule.jtc || !rule.jtc[roundKey]) return;
            const options = rule.jtc[roundKey];
            if (optIdx >= options.length) return;
    
            const opt = options[optIdx];
            const oldKeyword = Object.keys(opt)[0];
            const oldReply = opt[oldKeyword];
    
            // 判断是关键词还是回复（通过标签名或自定义类）
            if (target.tagName === 'INPUT') {
                // 修改关键词
                const newKeyword = target.value;
                delete opt[oldKeyword];
                opt[newKeyword] = oldReply;
            } else if (target.tagName === 'TEXTAREA') {
                // 修改回复
                opt[oldKeyword] = target.value;
            }
            // 数据已更新，无需重绘
        });
        dllb.addEventListener('click', function(e) {
            // ---- 删除 ----
            const delTarget = e.target.closest('.del-round, .del-option');
            if (delTarget) {
                const roundKey = delTarget.dataset.round;
                if (!roundKey) return;
                const rule = zdsc_data[zdsc_xzxm];
                if (!rule || !rule.jtc) return;
            
                if (delTarget.classList.contains('del-round')) {
                    // 删除整个轮次
                    delete rule.jtc[roundKey];
                    // 重新编号（保持键连续）
                    const oldKeys = Object.keys(rule.jtc).sort((a, b) => Number(a) - Number(b));
                    if (oldKeys.length === 0) {
                        rule.jtc = {};
                    } else {
                        const newJtc = {};
                        oldKeys.forEach((key, idx) => {
                            newJtc[String(idx + 1)] = rule.jtc[key];
                        });
                        rule.jtc = newJtc;
                    }
                    // 重新渲染多轮区域
                    zdsc_qtlcdh(rule.jtc);
                    // 可选：同步主列表（如显示轮次数量变化）
                    zdsc_renderList();
                    return;
                }
            
                if (delTarget.classList.contains('del-option')) {
                    const optIdx = parseInt(delTarget.dataset.optidx, 10);
                    if (isNaN(optIdx)) return;
                    if (!rule.jtc[roundKey] || !Array.isArray(rule.jtc[roundKey])) return;
                    // 删除指定选项
                    rule.jtc[roundKey].splice(optIdx, 1);
                    // 如果该轮次为空，删除该轮次并重新编号
                    if (rule.jtc[roundKey].length === 0) {
                        delete rule.jtc[roundKey];
                        const oldKeys = Object.keys(rule.jtc).sort((a, b) => Number(a) - Number(b));
                        if (oldKeys.length === 0) {
                            rule.jtc = {};
                        } else {
                            const newJtc = {};
                            oldKeys.forEach((key, idx) => {
                                newJtc[String(idx + 1)] = rule.jtc[key];
                            });
                            rule.jtc = newJtc;
                        }
                    }
                    zdsc_qtlcdh(rule.jtc);
                    zdsc_renderList(); // 同步主列表
                    return;
                }
            }
        
            // ---- 添加选项 ----
            const addBtn = e.target.closest('.add-option-btn');
            if (addBtn) {
                const roundKey = addBtn.dataset.round;
                if (!roundKey) return;
                const rule = zdsc_data[zdsc_xzxm];
                if (rule && rule.jtc && rule.jtc[roundKey]) {
                    rule.jtc[roundKey].push({ "新选项": "新回复" });
                    zdsc_qtlcdh(rule.jtc);
                }
                return;
            }
        
            // ---- 添加轮次 ----
            if (e.target.id === 'zdsc_tjdlcgz') {
                const rule = zdsc_data[zdsc_xzxm];
                if (rule) {
                    if (!rule.jtc) rule.jtc = {};
                    const maxKey = Math.max(0, ...Object.keys(rule.jtc).map(Number));
                    const newKey = String(maxKey + 1);
                    rule.jtc[newKey] = [{ "新选项": "新回复" }];
                    zdsc_qtlcdh(rule.jtc);
                }
            }
        });
    }
})
        
        /**
         * 渲染规则列表到页面上
         * @param {Array} zdsc_data - 规则数组，每个元素包含 gjc, sfjt, jtc 等字段
         */
        function zdsc_renderList() {
            const container = document.getElementById('zdsc_lb');
            if (!container) {
                return;
            }
        
            // 清空容器
            container.innerHTML = '';
        
            // 如果规则为空或不是数组，显示提示
            if (!Array.isArray(zdsc_data) || zdsc_data.length === 0) {
                container.innerHTML = '<text class="lb-wtext">暂无规则</text>';
                return;
            }
        
            let html = '';
            zdsc_data.forEach((rule, idx) => {
                const keyword = Object.keys(rule.gjc || {})[0] || '';
                // 判断 span 的 class：以 ">:://" 开头用 tys，否则用 qyz
                const spanClass = keyword.startsWith('>:://') ? 'tys' : 'qyz';
                const displayKeyword = keyword.startsWith('>:://') ? keyword.slice(5) : keyword;
                // 判断当前项是否激活（编号等于 zdsc_xzxm）
                const isActive = (typeof zdsc_xzxm !== 'undefined' && idx === zdsc_xzxm);
                const divClass = 'lbx' + (isActive ? ' active' : '');
                html += `<div class="${divClass}" data-index="${idx}">
            <span class="${spanClass}"></span>
            ${displayKeyword}
        </div>`;
    });
    container.innerHTML = html;
}

function zdsc_updateReply() {
    const keywordInput = document.getElementById('zdsc_ppgjc');
    const replyTextarea = document.getElementById('zdsc_hfnr');
    const checkbox = document.getElementById('zdsc_sfqy');
    const dldhan = document.getElementById('zdsc_dldhan');
    const dldhlb = document.getElementById('zdsc_dllb');

    // 如果没有选中项或数据为空，清空所有控件
    if (typeof zdsc_xzxm === 'undefined' || !Array.isArray(zdsc_data) || zdsc_data.length === 0) {
        if (keywordInput) keywordInput.value = '';
        if (replyTextarea) replyTextarea.value = '';
        if (checkbox) checkbox.checked = true;  // 默认未加前缀
        return;
    }

    const rule = zdsc_data[zdsc_xzxm];
    if (!rule) {
        if (keywordInput) keywordInput.value = '';
        if (replyTextarea) replyTextarea.value = '';
        if (checkbox) checkbox.checked = true;
        return;
    }

    const gjc = rule.gjc || {};
    const keys = Object.keys(gjc);
    const keyword = keys.length > 0 ? keys[0] : '';
    const reply = keys.length > 0 ? gjc[keys[0]] : '';
    const dldn = rule.sfjt?.toLowerCase().trim() === "true";
    const displayKeyword = keyword.startsWith('>:://') ? keyword.slice(5) : keyword;
    // 更新关键词输入框
    if (keywordInput) keywordInput.value = displayKeyword;
    // 更新回复文本域
    if (replyTextarea) replyTextarea.value = reply;
    // 更新复选框：如果关键词以 >:// 开头，则取消选中，否则选中
    if (checkbox) {
        checkbox.checked = !keyword.startsWith('>:://');
    }
    if (dldhan){
        dldhan.checked = dldn;
    }
    if(dldhlb){
        dldhlb.style.display = dldn ? 'flex' : 'none';
        if(dldn == true){
            zdsc_qtlcdh(rule.jtc);
        }
        else{
            return
        }
    }
}

function zdsc_qtlcdh(jtc) {
    const dldhlb = document.getElementById('zdsc_dllb');
    if (typeof jtc !== 'object' || Array.isArray(jtc) || Object.keys(jtc).length === 0){
        dldhlb.innerHTML = `
                <ul-x>
                    <button class="an an-x" id="zdsc_tjdlcgz">
                        <svg style="display: block; flex-shrink: 0; width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        添加轮次
                    </button>
                </ul-x>`;
        return;
    }
    let html = '';
    Object.keys(jtc).sort((a, b) => Number(a) - Number(b)).forEach(roundKey => {
        console.log('jtc 键:', Object.keys(jtc));
        const options = jtc[roundKey];
        html += `
                <div class="ycxf-bjl">
                    <span class="d"></span>
                    第${roundKey}轮对话
                    <svg data-round="${roundKey}" class="sc-svg-x del-round" style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </div>
            `
        // 渲染该轮次的所有选项
        options.forEach((opt, index) => {
            const keyword = Object.keys(opt)[0];  // 提取键（关键词）
            const reply = opt[keyword];           // 提取值（回复内容）
            html += `
                <ul>
                    <li class="ycxf-bjl">
                        <span class="d"></span>
                        规则${index + 1}
                        <svg data-round="${roundKey}" data-optidx="${index}" class="sc-svg-x del-option" style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </li>
                    <li class="bjx-srk">
                        <span class="js">匹配关键词</span>
                        <input data-round="${roundKey}" data-optidx="${index}" class="yc-srk" value="${keyword}" placeholder="请输入关键词...">
                    </li>
                    <li class="bjx-srk">
                        <span class="js">回复内容</span>
                        <textarea  data-round="${roundKey}" data-optidx="${index}" row="3" style="resize: vertical;" class="yc-srk" placeholder="请输入文字或HTML...">${reply}</textarea>
                    </li>
                </ul>
            `;
        });
        html += `
            <ul>
                <button data-round="${roundKey}" class="bc an-x add-option-btn">
                <svg style="display: block; flex-shrink: 0; width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    添加规则
                </button>
            </ul>
        `;
    });
    html += `
        <ul-x>
            <button class="an an-x" id="zdsc_tjdlcgz">
                <svg style="display: block; flex-shrink: 0; width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                添加轮次
            </button>
        </ul-x>`;
    dldhlb.innerHTML = html;
}

/**
 * 从后端加载规则 JSON
 */
async function zdsc_loadRules() {
    try {
        if (!bridge) throw new Error("Bridge not available");
        await bridge.ready();
        const result = await bridge.apiGet("hqgz", { file: "zdsc.json" });

        // 判断是否成功获取
        let data = null;
        if (result && result.success === true) {
            data = result.data;
        } else if (Array.isArray(result)) {
            data = result;
        } else {
            zdsc_showToast("加载失败: 返回格式错误", "error");
        }

        // 规范化数据（确保数组格式）
        const rules = Array.isArray(data) ? data : [];
        zdsc_data = data;
        zdsc_renderList();
        zdsc_updateReply();
        zdsc_showToast(`加载成功，共 ${rules.length} 条规则`, "success");
    } catch (err) {
        console.error(err);
        zdsc_showToast("加载失败: " + err.message, "error");
    }
}
/**
 * 保存规则 JSON 到后端
 * @param {Array} rules - 规则数组
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function zdsc_saveRules(rules) {
    // ---------- 1. 数据校验 ----------
    if (!Array.isArray(rules) || rules.length === 0) {
        zdsc_showToast("没有可保存的规则", "error");
        return;
    }

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        const gjc = rule.gjc || {};
        const keys = Object.keys(gjc);

        // 基础校验：关键词和回复不能为空
        if (keys.length === 0) {
            zdsc_showToast(`第 ${i+1} 条规则缺少关键词`, "error");
            return;
        }
        const keyword = keys[0];
        const reply = gjc[keyword];
        if (!keyword || keyword.trim() === '') {
            zdsc_showToast(`第 ${i+1} 条规则的关键词不能为空`, "error");
            return;
        }
        if (!reply || reply.trim() === '') {
            zdsc_showToast(`第 ${i+1} 条规则的回复内容不能为空`, "error");
            return;
        }

        // ---------- 多轮对话校验（sfjt === "true"） ----------
        if (rule.sfjt === "true") {
            const jtc = rule.jtc;
            if (!jtc || typeof jtc !== 'object' || Array.isArray(jtc)) {
                zdsc_showToast(`第 ${i+1} 条规则（多轮模式）缺少 jtc 配置`, "error");
                return;
            }
            const roundKeys = Object.keys(jtc);
            if (roundKeys.length === 0) {
                zdsc_showToast(`第 ${i+1} 条规则（多轮模式）至少需要一个轮次`, "error");
                return;
            }
            for (let roundKey of roundKeys) {
                const options = jtc[roundKey];
                if (!Array.isArray(options) || options.length === 0) {
                    zdsc_showToast(`第 ${i+1} 条规则的第 ${roundKey} 轮没有选项`, "error");
                    return;
                }
                for (let optIdx = 0; optIdx < options.length; optIdx++) {
                    const opt = options[optIdx];
                    if (typeof opt !== 'object') {
                        zdsc_showToast(`第 ${i+1} 条规则的第 ${roundKey} 轮第 ${optIdx+1} 项格式错误`, "error");
                        return;
                    }
                    const optKeys = Object.keys(opt);
                    if (optKeys.length === 0) {
                        zdsc_showToast(`第 ${i+1} 条规则的第 ${roundKey} 轮第 ${optIdx+1} 项缺少关键词`, "error");
                        return;
                    }
                    const optKeyword = optKeys[0];
                    const optReply = opt[optKeyword];
                    if (!optKeyword || optKeyword.trim() === '') {
                        zdsc_showToast(`第 ${i+1} 条规则的第 ${roundKey} 轮第 ${optIdx+1} 项关键词不能为空`, "error");
                        return;
                    }
                    if (!optReply || optReply.trim() === '') {
                        zdsc_showToast(`第 ${i+1} 条规则的第 ${roundKey} 轮第 ${optIdx+1} 项回复不能为空`, "error");
                        return;
                    }
                }
            }
        }
    }
    try {
        if (!bridge) throw new Error("Bridge not available");
        await bridge.ready();
        const result = await bridge.apiPost("bcgz", { file: "zdsc.json", data: rules });

        // 判断保存是否成功
        const isSuccess = Array.isArray(result) || (result && result.success === true);
        console.log(isSuccess);
        if (isSuccess) {
            zdsc_showToast("保存成功", "success");
        } else {
            zdsc_showToast("保存失败: " + (result?.message || "未知错误"), "error");
        }
    } catch (err) {
        console.error(err);
        zdsc_showToast("加载失败: " + err.message, "error");
    }
}

function zdsc_showToast(message, type = "success") {
    const layer = document.getElementById("xxtc");       // 获取容器
    const toast = document.createElement("div");         // 创建提示元素
    toast.className = `toast ${type}`;                   // 设置样式类（可区分成功/错误）
    toast.textContent = message;                         // 写入消息内容
    layer.appendChild(toast);                            // 添加到容器
    setTimeout(() => toast.remove(), 2600);              // 2.6秒后自动移除
}
