const bridge = window.AstrBotPluginPage;
let zlhf_data = [];
let zlhf_xzxm = 0;

document.addEventListener('DOMContentLoaded', function() {
    const zlhf_tjgz = document.getElementById('zlhf_tjgz');
    const zlhf_bcgz = document.getElementById('zlhf_bcgz');
    const zlhf_sxgz = document.getElementById('zlhf_sxgz');
    (async function() {
        await zlhf_loadRules();
    })();
    zlhf_tjgz.addEventListener('click', () => { 
        // 构造新规则
        const newRule = {
            gjc: {
              "#新关键词": "新回复"
            },
            tp: "",
            sp: "",
            dt: "false"
        };
        // 添加到数据数组末尾
        zlhf_data.push(newRule);
        // 选中新添加的规则（最后一条）
        zlhf_xzxm = zlhf_data.length - 1;
        // 刷新界面
        zlhf_renderList();
        zlhf_updateReply();
        zlhf_showToast('已添加新规则', 'success');
    });
    zlhf_bcgz.addEventListener('click', () => { 
        (async function() {
            await zlhf_saveRules(zlhf_data);
        })();
    });
    zlhf_sxgz.addEventListener('click', () => { 
        //刷新
        (async function() {
            await zlhf_loadRules();
        })();
    });
    const container = document.getElementById('zlhf_lb');
    if (container) {
        container.addEventListener('click', function(e) {
            // 找到被点击的 .lbx 元素（包括子元素点击）
            const lbx = e.target.closest('.lbx');
            if (!lbx) return;
            if (lbx.classList.contains('active')) return;
            // 读取 data-index 属性
            const index = parseInt(lbx.dataset.index, 10);
            if (!isNaN(index)) {
                zlhf_xzxm = index;
                zlhf_renderList();
                zlhf_updateReply();
            }
        });
    }
    const keywordInput = document.getElementById('zlhf_ppgjc');
    if (keywordInput) {
        keywordInput.addEventListener('input', function() {
            if (typeof zlhf_xzxm === 'undefined' || !Array.isArray(zlhf_data) || zlhf_data.length === 0) return;
            const rule = zlhf_data[zlhf_xzxm];
            if (!rule) return;
            const newKeyword = this.value;
            // 获取旧回复（保留原来的回复值）
            const gjc = rule.gjc || {};
            const oldReply = Object.values(gjc)[0] || '';
            // 更新 gjc 的键为新关键词，值不变
            rule.gjc = { [newKeyword]: oldReply };
            // 更新复选框状态（根据新关键词是否以 >:// 开头）
            const checkbox = document.getElementById('zlhf_sfqy');
            if (checkbox) {
                checkbox.checked = !newKeyword.startsWith('>:://');
            }
            // 重新渲染列表，使关键词显示变化
            zlhf_renderList();
            zlhf_updateReply();
        });
    }
    
    // ---------- 删除规则 ----------
    const delRuleBtn = document.getElementById('zlhf_scgz');
    if (delRuleBtn) {
        delRuleBtn.addEventListener('click', function() {
            // 检查是否有选中的规则
            if (typeof zlhf_xzxm === 'undefined' || !Array.isArray(zlhf_data) || zlhf_data.length === 0) {
                zlhf_showToast('没有可删除的规则', 'error');
                return;
            }
    
            // 删除指定索引的规则
            zlhf_data.splice(zlhf_xzxm, 1);
    
            // 更新选中索引
            if (zlhf_data.length === 0) {
                zlhf_xzxm = undefined;  // 无数据时取消选中
            } else if (zlhf_xzxm >= zlhf_data.length) {
                zlhf_xzxm = zlhf_data.length - 1;  // 若删除的是最后一项，则选中新最后一项
            }
            // 如果 zlhf_xzxm 为 undefined，后续渲染会清空控件
    
            // 刷新界面
            zlhf_renderList();      // 重新渲染列表
            zlhf_updateReply();     // 更新输入框和多轮区域（内部会调用 zlhf_qtlcdh 清空或显示）
            zlhf_showToast('规则已删除', 'success');
        });
    }
    // ---------- 回复文本域 ----------
    const replyTextarea = document.getElementById('zlhf_hfnr');
    if (replyTextarea) {
        replyTextarea.addEventListener('input', function() {
            if (typeof zlhf_xzxm === 'undefined' || !Array.isArray(zlhf_data) || zlhf_data.length === 0) return;
            const rule = zlhf_data[zlhf_xzxm];
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
    const checkbox = document.getElementById('zlhf_sfqy');
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            if (typeof zlhf_xzxm === 'undefined' || !Array.isArray(zlhf_data) || zlhf_data.length === 0) return;
            const rule = zlhf_data[zlhf_xzxm];
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
            const input = document.getElementById('zlhf_ppgjc');
            if (input) input.value = keyword;
            // 重新渲染列表
            zlhf_renderList();
            zlhf_updateReply();
        });
    }
    // ---------- 触发词输入框 ----------
    const hftp = document.getElementById('zlhf_hftp');
    if (hftp) {
        hftp.addEventListener('input', function() {
            if (typeof zlhf_xzxm === 'undefined' || !Array.isArray(zlhf_data) || zlhf_data.length === 0) return;
            const rule = zlhf_data[zlhf_xzxm];
            if (!rule) return;
            rule.tp = this.value;
        });
    }
    
    // ---------- 回复词输入框 ----------
    const hfsp = document.getElementById('zlhf_hfsp');
    if (hfsp) {
        hfsp.addEventListener('input', function() {
            if (typeof zlhf_xzxm === 'undefined' || !Array.isArray(zlhf_data) || zlhf_data.length === 0) return;
            const rule = zlhf_data[zlhf_xzxm];
            if (!rule) return;
            rule.sp = this.value;
        });
    }
    
    // ---------- 多轮开关（复选框） ----------
    const tpsphh = document.getElementById('zlhf_tpsphh');
    if (tpsphh) {
        tpsphh.addEventListener('change', function() {
            if (typeof zlhf_xzxm === 'undefined' || !Array.isArray(zlhf_data) || zlhf_data.length === 0) return;
            const rule = zlhf_data[zlhf_xzxm];
            if (!rule) return;
            rule.dt = this.checked ? "true" : "false";
            // 由于 dt 变化可能影响界面其他部分（如多轮区域显示），可调用 zlhf_updateReply() 刷新
            // 但 updateReply 会重新读取 rule.dt 并设置复选框状态，为避免死循环，可单独处理
            // 这里仅更新数据，不重绘，因为界面已经反映当前复选框状态
        });
    }
})
        
/**
 * 渲染规则列表到页面上
 * @param {Array} zlhf_data - 规则数组，每个元素包含 gjc, sfjt, jtc 等字段
 */
function zlhf_renderList() {
    const container = document.getElementById('zlhf_lb');
    if (!container) {
        return;
    }
    // 清空容器
    container.innerHTML = '';
    
        // 如果规则为空或不是数组，显示提示
        if (!Array.isArray(zlhf_data) || zlhf_data.length === 0) {
            container.innerHTML = '<text class="lb-wtext">暂无规则</text>';
            return;
        }
    
        let html = '';
        zlhf_data.forEach((rule, idx) => {
            const keyword = Object.keys(rule.gjc || {})[0] || '';
            // 判断 span 的 class：以 ">:://" 开头用 tys，否则用 qyz
            const spanClass = keyword.startsWith('>:://') ? 'tys' : 'qyz';
            const displayKeyword = keyword.startsWith('>:://') ? keyword.slice(5) : keyword;
            // 判断当前项是否激活（编号等于 zlhf_xzxm）
            const isActive = (typeof zlhf_xzxm !== 'undefined' && idx === zlhf_xzxm);
            const divClass = 'lbx' + (isActive ? ' active' : '');
            html += `<div class="${divClass}" data-index="${idx}">
            <span class="${spanClass}"></span>
            ${displayKeyword}
        </div>`;
    });
    container.innerHTML = html;
}

function zlhf_updateReply() {
    const keywordInput = document.getElementById('zlhf_ppgjc');
    const replyTextarea = document.getElementById('zlhf_hfnr');
    const checkbox = document.getElementById('zlhf_sfqy');
    const hftp = document.getElementById('zlhf_hftp');
    const hfsp = document.getElementById('zlhf_hfsp');
    const tpsphh = document.getElementById('zlhf_tpsphh');
    // 如果没有选中项或数据为空，清空所有控件
    if (typeof zlhf_xzxm === 'undefined' || !Array.isArray(zlhf_data) || zlhf_data.length === 0) {
        if (keywordInput) keywordInput.value = '';
        if (replyTextarea) replyTextarea.value = '';
        if (checkbox) checkbox.checked = true;  // 默认未加前缀
        return;
    }

    const rule = zlhf_data[zlhf_xzxm];
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
    const dldn = rule.dt?.toLowerCase().trim() === "true";
    const displayKeyword = keyword.startsWith('>:://') ? keyword.slice(5) : keyword;
    // 更新关键词输入框
    if (keywordInput) keywordInput.value = displayKeyword;
    // 更新回复文本域
    if (replyTextarea) replyTextarea.value = reply;
    // 更新复选框：如果关键词以 >:// 开头，则取消选中，否则选中
    if (checkbox) {
        checkbox.checked = !keyword.startsWith('>:://');
    }
    if (hftp){
        hftp.value = rule.tp
    }
    if (hfsp){
        hfsp.value = rule.sp
    }
    if (tpsphh){
        tpsphh.checked = dldn
    }
}

/**
 * 从后端加载规则 JSON
 */
async function zlhf_loadRules() {
    try {
        if (!bridge) throw new Error("Bridge not available");
        await bridge.ready();
        const result = await bridge.apiGet("hqgz", { file: "zlhf.json" });

        // 判断是否成功获取
        let data = null;
        if (result && result.success === true) {
            data = result.data;
        } else if (Array.isArray(result)) {
            data = result;
        } else {
            zlhf_showToast("加载失败: 返回格式错误", "error");
        }

        // 规范化数据（确保数组格式）
        const rules = Array.isArray(data) ? data : [];
        zlhf_data = data;
        zlhf_renderList();
        zlhf_updateReply();
        zlhf_showToast(`加载成功，共 ${rules.length} 条规则`, "success");
    } catch (err) {
        console.error(err);
        zlhf_showToast("加载失败: " + err.message, "error");
    }
}
/**
 * 保存规则 JSON 到后端
 * @param {Array} rules - 规则数组
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function zlhf_saveRules(rules) {
    // ---------- 1. 数据校验 ----------
    if (!Array.isArray(rules) || rules.length === 0) {
        zlhf_showToast("没有可保存的规则", "error");
        return;
    }

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        const gjc = rule.gjc || {};
        const keys = Object.keys(gjc);

        // 基础校验：关键词和回复不能为空
        if (keys.length === 0) {
            zlhf_showToast(`第 ${i+1} 条规则缺少关键词`, "error");
            return;
        }
        const keyword = keys[0];
        const reply = gjc[keyword];
        if (!keyword || keyword.trim() === '') {
            zlhf_showToast(`第 ${i+1} 条规则的关键词不能为空`, "error");
            return;
        }
        if (!reply || reply.trim() === '') {
            zlhf_showToast(`第 ${i+1} 条规则的回复内容不能为空`, "error");
            return;
        }
    }
    try {
        if (!bridge) throw new Error("Bridge not available");
        await bridge.ready();
        const result = await bridge.apiPost("bcgz", { file: "zlhf.json", data: rules });

        // 判断保存是否成功
        const isSuccess = Array.isArray(result) || (result && result.success === true);
        console.log(isSuccess);
        if (isSuccess) {
            zlhf_showToast("保存成功", "success");
        } else {
            zlhf_showToast("保存失败: " + (result?.message || "未知错误"), "error");
        }
    } catch (err) {
        console.error(err);
        zlhf_showToast("加载失败: " + err.message, "error");
    }
}

function zlhf_showToast(message, type = "success") {
    const layer = document.getElementById("xxtc");       // 获取容器
    const toast = document.createElement("div");         // 创建提示元素
    toast.className = `toast ${type}`;                   // 设置样式类（可区分成功/错误）
    toast.textContent = message;                         // 写入消息内容
    layer.appendChild(toast);                            // 添加到容器
    setTimeout(() => toast.remove(), 2600);              // 2.6秒后自动移除
}
