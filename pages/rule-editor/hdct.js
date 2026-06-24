// 1. 声明私有存储变量
let _hdcts = 0;
let onHdctsChange = null;

// 2. 使用 Object.defineProperty 监听 window.hdcts
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

// 3. 设置监听回调的函数
function setHdctsChangeHandler(callback) {
    onHdctsChange = callback;
}

// 4. DOM 加载完成后，注册监听并初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取两个按钮元素
    const btn1 = document.getElementById('xy1');
    const btn2 = document.getElementById('xy2');
    const btn3 = document.getElementById('xy3');
    const lb1 = document.getElementById('lb1');
    const lb2 = document.getElementById('lb2');

    if (!btn1 || !btn2 || !btn3) {
        return;
    }
    btn1.addEventListener('click', () => {
        // 点击时
        hdcts = 0;
    });
    btn2.addEventListener('click', () => {
        // 点击时
        hdcts = 1;
    });
    btn3.addEventListener('click', () => {
        // 点击时
        hdcts = 2;
    });
    // 注册回调：当 hdcts 变化时，修改 class
    setHdctsChangeHandler((newVal, oldVal) => {
        if (newVal === 0) {
            // hdcts = 0 时：xy1 激活，xy2 取消激活
            btn1.className = 'btn an-db active';
            btn2.className = 'btn an-db';
            btn3.className = 'btn an-db';
            lb1.style.display = 'block';
            lb2.style.display = 'none';
            lb3.style.display = 'none';
        } else if(newVal === 1){
            // hdcts = 其他值时：xy2 激活，xy1 取消激活
            btn2.className = 'btn an-db active';
            btn1.className = 'btn an-db';
            btn3.className = 'btn an-db';
            lb2.style.display = 'block';
            lb1.style.display = 'none';
            lb3.style.display = 'none';
        } else{
            btn3.className = 'btn an-db active';
            btn1.className = 'btn an-db';
            btn2.className = 'btn an-db';
            lb3.style.display = 'block';
            lb1.style.display = 'none';
            lb2.style.display = 'none';
        }
        console.log(`hdcts 变更为 ${newVal}，已切换按钮状态`);
    });

    // 5. 初始化：把当前的 _hdcts 值应用到界面上
    // 直接触发一次回调
    if (typeof onHdctsChange === 'function') {
        onHdctsChange(_hdcts, _hdcts);
    }
});
