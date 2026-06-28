// 声明变量
let _hdcts = 0;
let onHdctsChange = null;

// 使用 Object.defineProperty 监听 window.hdcts
Object.defineProperty(window, 'hdcts', {
    get() {
        return _hdcts;
    },
    set(newValue) {
        if (_hdcts !== newValue) {
            const oldValue = _hdcts;
            _hdcts = newValue;
            // 触发回调
            if (typeof onHdctsChange === 'function') {
                onHdctsChange(newValue, oldValue);
            }
        }
    },
    enumerable: true,
    configurable: true
});

// 设置监听回调的函数
function setHdctsChangeHandler(callback) {
    onHdctsChange = callback;
}

// DOM 加载完成后，注册监听并初始化
// DOM 加载完成后，注册监听并初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取按钮和卡片元素
    const btn1 = document.getElementById('xy1');
    const btn2 = document.getElementById('xy2');
    const btn3 = document.getElementById('xy3');
    const lb1 = document.getElementById('lb1');
    const lb2 = document.getElementById('lb2');
    const lb3 = document.getElementById('lb3');

    if (!btn1 || !btn2 || !btn3 || !lb1 || !lb2 || !lb3) {
        return;
    }

    btn1.addEventListener('click', () => { hdcts = 0; });
    btn2.addEventListener('click', () => { hdcts = 1; });
    btn3.addEventListener('click', () => { hdcts = 2; });

    // 注册回调：当 hdcts 变化时，修改 class
    setHdctsChangeHandler((newVal, oldVal) => {
        const cards = [lb1, lb2, lb3];
        const oldCard = cards[oldVal];
        let activeCard;
        if (newVal === 0) activeCard = lb1;
        else if (newVal === 1) activeCard = lb2;
        else activeCard = lb3;

        // 1. 移除所有卡片的动画类
        cards.forEach(card => card.classList.remove('active', 'hrzc', 'hrzccq', 'hrzcyc'));

        // 2. 清除所有卡片的行内 transform，避免残留覆盖 CSS 类
        cards.forEach(card => card.style.transform = '');
        
        // 3. 重置无关卡片（既不是旧卡也不是新卡）到右侧隐藏位置
        cards.forEach(card => {
            if (card !== oldCard && card !== activeCard) {
                card.style.transition = 'none';
                card.style.transform = 'translateX(200%)';
                void card.offsetWidth;
                card.style.transition = '';
            }
        });
        
        // 4. 旧卡片离场动画（初始化时 newVal === oldVal 跳过）
        if (oldCard && newVal !== oldVal) {
            if (newVal > oldVal) {
                oldCard.classList.add('hrzccq');
            } else {
                oldCard.classList.add('hrzcyc');
            }
        }

        // 5. 新卡片入场起始方向
        if (newVal !== oldVal) {
            if (newVal < oldVal) {
                activeCard.classList.add('hrzc');   // 从左侧进入
            }
            // 否则从右侧进入，默认 200% 即可
        }

        // 强制应用起始位置
        void activeCard.offsetWidth;

        // 6. 双重 rAF 确保起始帧渲染后，再触发入场动画
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                activeCard.classList.add('active');

                // 更新按钮激活状态
                btn1.className = 'btn an-db' + (newVal === 0 ? ' active' : '');
                btn2.className = 'btn an-db' + (newVal === 1 ? ' active' : '');
                btn3.className = 'btn an-db' + (newVal === 2 ? ' active' : '');
            });
        });

        console.log(`hdcts 变更为 ${newVal}，方向：${newVal > oldVal ? '右进' : newVal < oldVal ? '左进' : '初始'}`);
    });

    // ------------------- 昼夜模式切换 -------------------
    const themeBtn = document.getElementById('ayqh');
    let currentTheme = 'light'
    if (themeBtn) {
        function setTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeBtn.textContent = '暗夜模式';
            } else {
                document.documentElement.removeAttribute('data-theme');
                themeBtn.textContent = '白昼模式';
            }
            currentTheme = theme;
        }

        themeBtn.addEventListener('click', function() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            setTheme(next);
        });

        // 初始化
        if (currentTheme) {
            setTheme(currentTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }

    // 初始化：把当前的 _hdcts 值应用到界面上
    if (typeof onHdctsChange === 'function') {
        onHdctsChange(_hdcts, _hdcts);
    }
});
