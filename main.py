import asyncio
import json
import os
import re
import secrets
import tempfile
import time
from datetime import datetime

import httpx

import astrbot.api.message_components as Comp
from astrbot.api import logger
from astrbot.api.event import AstrMessageEvent, MessageChain, filter
from astrbot.api.message_components import Plain
from astrbot.api.star import Context, Star, register
from astrbot.api.web import error_response, json_response, request


@register("astrbot_plugin_qqAI", "HAGo", "QQ消息处理功能插件", "v1.3.0")
class MyPlugin(Star):
    def __init__(self, context: Context, config: dict = None):
        super().__init__(context)
        self.context = context
        self.config = config or {}
        # 用于保存机器人 API 对象
        self.bot = None
        # 插件json所在路径
        self.jsonxd = os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ),
            "plugin_data",
            "astrbot_plugin_qqAI",
        )

        # 变量声明
        # 进群验证列表未完成
        self.jqyzlb = {}
        # 验证释放倒计时
        self.jqyzdjs = {}
        # 文件相关
        # 缓存的数据
        self.wjhdsj = {}
        # 缓存有效期（秒）
        self.wjhcsj = 120
        # 私信会话
        self.sx_hh = {}
        # 私信会话释放倒计时
        self.sx_sfdjs = {}
        # 群聊会话
        self.ql_hh = {}
        # 群聊会话释放倒计时
        self.ql_sfdjs = {}

        # 读取配置项：QQ群白名单
        qql = self.config.get("qq_q_fw", "")
        # 读取配置项：意见反馈接收群号
        self.qqyjfk = self.config.get("qq_q_yj", "")
        # 读取配置项：入群验证群
        qqy = self.config.get("qq_q_yz", "")
        # 读取配置项html渲染接口
        self.html_jk_xr = self.config.get(
            "qq_q_html", "http://localhost:8999/text2img/generate"
        )
        # 读取超时时间和重试次数
        self.qqsj = self.config.get("qq_q_yzsj", 300)
        self.qqcs = self.config.get("qq_q_yzcs", 3)
        # 读取配置项是否学习
        self.xx_kg = self.config.get("qq_q_xx", True)
        # qq白名单转换成列表
        if qql and qql.strip():
            self.qqbmd = [line.strip() for line in qql.splitlines() if line.strip()]
        else:
            self.qqbmd = []
        # qq验证白名单转换
        if qqy and qqy.strip():
            self.qqyz = [line.strip() for line in qqy.splitlines() if line.strip()]
        else:
            self.qqyz = []

        # 注册 API 路由
        self.context.register_web_api(
            "/astrbot_plugin_qqAI/hqgz", self.api_get_rules, ["GET"], "获取规则"
        )
        self.context.register_web_api(
            "/astrbot_plugin_qqAI/bcgz", self.api_save_rules, ["POST"], "保存规则"
        )
        # 进程锁
        # 普通公用锁
        self.jcs = asyncio.Lock()
        # 验证独立锁
        self.yzdjcs = asyncio.Lock()
        # 存储文件专用锁
        self.cjwjdjcs = asyncio.Lock()
        # 私信会话锁
        self.sx_hhs = asyncio.Lock()
        # 群聊会话锁
        self.ql_hhs = asyncio.Lock()

        asyncio.create_task(self.pzwj_fzbcz())

    async def pzwj_fzbcz(self):
        """检查并创建必需的配置文件"""
        for filename in ["zlhf.json", "zdhf.json", "zdsc.json"]:
            filepath = os.path.join(self.jsonxd, filename)
            if not os.path.exists(filepath):
                await self.json_xg(filename, [])
                logger.info(f"已创建默认配置文件: {filename}")

    async def terminate(self):
        """插件被卸载/停用时会调用"""
        for task in self.jqyzdjs.values():
            if not task.done():
                task.cancel()
        self.jqyzdjs.clear()
        for task in self.sx_sfdjs.values():
            if not task.done():
                task.cancel()
        self.sx_sfdjs.clear()
        for task in self.ql_sfdjs.values():
            if not task.done():
                task.cancel()
        self.ql_sfdjs.clear()
        logger.info("QQAI轻量 已卸载/重载")

    # 群聊消息处理
    async def qlxx(self, event: AstrMessageEvent):
        """群聊消息处理"""
        # 获取群号
        dqql = event.message_obj.group_id
        # 获取机器人自己
        bot_id = event.message_obj.self_id
        # 原生
        # qqysxx = event.message_obj.message
        # 消息id
        xx_id = event.message_obj.message_id
        # 优先处理验证，不然有bug
        user_id = str(event.message_obj.sender.user_id)
        if dqql in self.qqyz:
            async with self.yzdjcs:
                sfzmd = user_id in self.jqyzlb
            if sfzmd:
                ysxx = event.message_obj.message
                xxwb = ""
                sfch = False

                for comp in ysxx:
                    if isinstance(comp, Comp.Plain):
                        xxwb += comp.text
                    elif isinstance(comp, Comp.At):
                        continue  # 忽略 @
                    elif isinstance(comp, Comp.Reply):
                        # 忽略引用
                        continue
                    else:
                        # 图片、视频、文件、卡片等均不允许
                        sfch = True
                        break
                # 如果包含非法组件或纯文本为空（只有@或空消息）
                if sfch or not xxwb.strip():
                    # 尝试撤回消息
                    try:
                        await self.bot.api.call_action(
                            "delete_msg", message_id=event.message_obj.message_id
                        )
                    except Exception as e:
                        logger.error(f"撤回失败{e}")
                    # 回复警告
                    yield event.plain_result(
                        "验证时请勿发送图片、视频、文件等非文本内容，请重新发送验证码"
                    )
                    return
                async for result in self.yzxxcl(event, user_id, xxwb.strip()):
                    yield result
                return
        # ---------------------------------
        if dqql in self.qqbmd:
            # 遍历消息链，判断是否被 @
            xxwb = ""
            pd_at_sf = False
            for comp in event.message_obj.message:
                if isinstance(comp, Comp.Plain):
                    xxwb += comp.text
                elif isinstance(comp, Comp.At):
                    # 对比 @ 对象的 ID 是否等于机器人 ID
                    if str(comp.qq) == str(bot_id):
                        pd_at_sf = True
            lb = self.ql_hh.get(user_id)
            if lb:
                hh_dyd = lb["dy"]
                hh_lc = lb["lc"]
                jtc = hh_dyd.get(hh_lc, [])
                for item in jtc:
                    if isinstance(item, dict):
                        for hh_gjc, hh_hf in item.items():
                            if hh_gjc == xxwb.strip() and not xxwb.startswith(">:://"):
                                now = datetime.now()
                                dqsj = now.strftime("%Y-%m-%d %H:%M:%S")
                                hh_hf = hh_hf.replace("{{当前时间}}", dqsj)
                                sftg = re.search(r":::(\d{3})$", hh_hf)
                                if sftg:
                                    # 跳转轮次
                                    next_lc = str(int(sftg.group(1)))
                                    # 更新会话
                                    jtc_qc = hh_dyd.get(next_lc, [])
                                elif re.search(r":::end$", hh_hf):
                                    jtc_qc = []
                                else:
                                    # 匹配成功，执行回复，并推进轮次
                                    next_lc = str(int(hh_lc) + 1)
                                    # 更新会话
                                    jtc_qc = hh_dyd.get(next_lc, [])
                                hh_hf = re.sub(r":::(end|\d{3})$", "", hh_hf)
                                if jtc_qc == []:
                                    async with self.ql_hhs:
                                        task = self.ql_sfdjs.pop(user_id, None)
                                        if task and not task.done():
                                            task.cancel()
                                        del self.ql_hh[user_id]
                                else:
                                    async with self.ql_hhs:
                                        self.ql_hh[user_id]["lc"] = next_lc
                                        task = self.ql_sfdjs.pop(user_id, None)
                                        if task and not task.done():
                                            task.cancel()
                                        sxybhh = asyncio.create_task(
                                            self.qqyb_hh(user_id)
                                        )
                                        self.ql_sfdjs[user_id] = sxybhh
                                # 回复
                                # 构建消息链
                                chain = [Comp.At(qq=int(user_id))]
                                if hh_hf.strip().startswith("<!DOCTYPE html>"):
                                    logger.info("检测到 HTML，调用本地渲染服务")
                                    try:
                                        img_bytes = await self.html_xr(hh_hf)
                                        # 将字节数据写入临时文件
                                        with tempfile.NamedTemporaryFile(
                                            suffix=".png", delete=False
                                        ) as tmp:
                                            tmp.write(img_bytes)
                                            tmp_path = tmp.name
                                        # 发送临时文件路径
                                        chain.append(Comp.Image(file=tmp_path))
                                        asyncio.create_task(self.html_sc(tmp_path))
                                        logger.info("图片生成并发送成功")
                                    except Exception as e:
                                        logger.error(f"HTML渲染失败: {e}")
                                        clean = self.html_jjwb(hh_hf)  # 去掉标签
                                        chain.append(
                                            Comp.Plain(
                                                clean[:200] if clean else "图片生成失败"
                                            )
                                        )
                                    yield event.chain_result(chain)
                                    return
                                chain.append(Comp.Plain(hh_hf))
                                yield event.chain_result(chain)
                                return
                async with self.ql_hhs:
                    task = self.ql_sfdjs.pop(user_id, None)
                    if task and not task.done():
                        task.cancel()
                    del self.ql_hh[user_id]
                yield event.plain_result("不在选项内，终止对话")
                return
            if pd_at_sf:
                # 机器人被 @ 了
                if xxwb.strip():
                    hfxl = await self.xx_at_pt(user_id, xxwb.strip())
                    if hfxl:
                        yield event.chain_result(hfxl)
                else:
                    yield event.plain_result("有什么需要我帮助的吗？")
            else:
                # 没有被 @
                sfcg, hfxl = await self.xx_zl_pt(user_id, xxwb.strip(), xx_id)
                if sfcg:
                    yield event.chain_result(hfxl)

    # 私聊消息处理
    async def slxx(self, event: AstrMessageEvent):
        """私聊消息处理"""
        ysxx = event.message_obj.message
        ysdx = event.message_obj.raw_message
        xxwb = ""
        for comp in ysxx:
            if isinstance(comp, Comp.Plain):
                xxwb += comp.text
            else:
                # 图片、视频、文件、卡片等忽略
                continue
        # 统一转为字符串
        if isinstance(ysdx, dict):
            user_id = str(ysdx.get("user_id", ""))
        else:
            user_id = str(getattr(event, "sender_id", ""))  # 备用
        if not user_id:
            return
        jg = (None, None)
        async with self.sx_hhs:
            lb = self.sx_hh.get(user_id)
            if lb and xxwb.strip() == "意见反馈":
                lb["sj"] = int(time.time())
                task = self.sx_sfdjs.pop(user_id, None)
                if task and not task.done():
                    task.cancel()
                sxybhh = asyncio.create_task(self.ssyb_hh(user_id))
                self.sx_sfdjs[user_id] = sxybhh
                jg = ("yjcy", None)
            elif xxwb.strip() == "意见反馈":
                self.sx_hh[user_id] = {"sj": int(time.time())}
                sxybhh = asyncio.create_task(self.ssyb_hh(user_id))
                self.sx_sfdjs[user_id] = sxybhh
                jg = ("zjfk", None)
            elif not xxwb.strip():
                yield event.plain_result("暂不支持非文字消息哦~请发送文字反馈")
            else:
                if not lb:
                    return
                task = self.sx_sfdjs.pop(user_id, None)
                if task and not task.done():
                    task.cancel()
                del self.sx_hh[user_id]
                jg = ("sdfk", None)
        if jg[0] == "zjfk":
            yield event.plain_result(
                "有什么意见需要反馈呢？直接说出来（目前只允许文字反馈）"
            )
        elif jg[0] == "sdfk":
            yield event.plain_result("意见收到啦！感谢你的反馈")
            platform = event.unified_msg_origin.split(":")[0]
            fsdql = f"{platform}:GroupMessage:{self.qqyjfk}"
            xxl = MessageChain(
                [Plain(f"意见反馈\n来自用户：{user_id}\n反馈内容：{xxwb}")]
            )
            await self.context.send_message(fsdql, xxl)
        elif jg[0] == "yjcy":
            yield event.plain_result("您已处于反馈等待中，请直接发送文字内容哦~")
        else:
            return

    # 入群通知处理
    async def xttz(self, event: AstrMessageEvent):
        """系统通知处理"""
        ysdx = event.message_obj.raw_message
        if isinstance(ysdx, dict):
            dqqh = str(ysdx.get("group_id", ""))
            user_id = str(ysdx.get("user_id", ""))
            group_id = str(ysdx.get("group_id", ""))
        else:
            dqqh = str(getattr(event, "group_id", ""))  # 备用
            user_id = str(getattr(event, "user_id", ""))
            group_id = str(getattr(event, "group_id", ""))
        if not user_id:
            return
        if dqqh in self.qqyz:
            yzm = f"{secrets.randbelow(1000000):06d}"
            async with self.yzdjcs:
                self.jqyzlb[user_id] = {
                    "yzm": yzm,
                    "sj": int(time.time()),
                    "cs": self.qqcs,
                }
                # 创建一个异步任务，延迟 self.qqsj 秒后执行超时函数
                ybrwdj = asyncio.create_task(self.yzdjst(user_id, group_id))
                self.jqyzdjs[user_id] = ybrwdj
            # 构建欢迎消息链
            fsxxl = [
                Comp.At(qq=int(user_id)),
                Comp.Plain(
                    f" 欢迎加入群聊！\n您的进群验证码是：{yzm}\n请在 {self.qqsj // 60} 分钟内在本群回复验证码"
                ),
                Comp.Plain(f"\n错误超过 {self.qqcs} 次将会被移出群聊"),
            ]
            yield event.chain_result(fsxxl)

    # 退群通知处理
    async def xttz_tqtz(self, event: AstrMessageEvent):
        ysdx = event.message_obj.raw_message
        if isinstance(ysdx, dict):
            user_id = str(ysdx.get("user_id", ""))
        else:
            user_id = str(getattr(event, "user_id", ""))
        if not user_id:
            return
        try:
            # 调用 OneBot 的 get_stranger_info API
            result = await self.bot.api.call_action(
                "get_stranger_info", user_id=int(user_id)
            )
            user_name = result.get("nickname", user_id)
        except Exception as e:
            logger.error(f"获取用户信息失败: {e}")
            user_name = user_id
        yield event.plain_result(f"很遗憾{user_name}退出了该群")

    # 所有消息处理
    @filter.event_message_type(filter.EventMessageType.ALL)
    async def syxx(self, event: AstrMessageEvent):
        """
        统一事件入口
        """
        if self.bot is None:
            self.bot = event.bot
        raw = event.message_obj.raw_message
        if raw is None:
            return
        # 系统通知
        if raw.get("post_type") == "notice":
            # 入群
            if raw.get("notice_type") == "group_increase":
                async for res in self.xttz(event):
                    yield res
                return
            elif raw.get("notice_type") == "group_decrease":
                # 退群通知
                sub_type = raw.get("sub_type", "")
                if sub_type == "leave":
                    # 主动退群
                    async for res in self.xttz_tqtz(event):
                        yield res
                    return
        # 普通
        if raw.get("post_type") == "message":
            # 群聊
            if raw.get("message_type") == "group":
                async for res in self.qlxx(event):
                    yield res
            # 私聊
            elif raw.get("message_type") == "private":
                async for res in self.slxx(event):
                    yield res

    # ----辅助方法

    # 验证系统
    # 验证码校验
    async def yzxxcl(self, event: AstrMessageEvent, user_id: str, yhyzm: str):
        """处理验证码校验"""
        group_id = event.message_obj.group_id
        # 锁内字典读写
        async with self.yzdjcs:
            # 先移除倒计时
            ybrwdj = self.jqyzdjs.pop(user_id, None)
            if ybrwdj and not ybrwdj.done():
                ybrwdj.cancel()

            lb = self.jqyzlb.get(user_id)
            if not lb:
                return

            # 核对验证码
            yzmhd = yhyzm.strip() == lb["yzm"]
            if yzmhd:
                # 正确
                del self.jqyzlb[user_id]
                jg = ("success", None, None)  # (结果, 新验证码, 剩余次数)
            else:
                # 错误
                lb["cs"] -= 1
                cshd = lb["cs"] <= 0
                if cshd:
                    # 次数用完
                    del self.jqyzlb[user_id]
                    jg = ("kick", None, None)
                else:
                    # 还有剩余次数
                    xyzm = f"{secrets.randbelow(1000000):06d}"
                    ybrwdj = asyncio.create_task(self.yzdjst(user_id, group_id))
                    self.jqyzdjs[user_id] = ybrwdj
                    lb["yzm"] = xyzm
                    lb["sj"] = int(time.time())
                    jg = ("retry", xyzm, lb["cs"])

        # 锁外处理发送消息
        if jg[0] == "success":
            yield event.plain_result(" 验证通过，欢迎加入群聊！")

        elif jg[0] == "kick":
            try:
                await self.bot.api.call_action(
                    "set_group_kick",
                    group_id=int(group_id),
                    user_id=int(user_id),
                    reject_add_request=False,
                )
                yield event.plain_result(f"用户 {user_id} 因次数耗尽，已被移出群聊")
            except Exception:
                yield event.plain_result("踢出失败，请联系管理员")

        else:
            # 构建回复消息
            _, xyzm, sycs = jg
            xxl = [
                Comp.At(qq=int(user_id)),
                Comp.Plain(f" 验证码错误，还剩 {sycs} 次机会！新验证码：{xyzm}"),
            ]
            yield event.chain_result(xxl)

    # 验证倒计时
    async def yzdjst(self, user_id, group_id):
        try:
            kick = False
            await asyncio.sleep(self.qqsj)  # 等待超时秒数
            # 超时后要执行
            async with self.yzdjcs:
                lb = self.jqyzlb.get(user_id)
                if not lb:
                    return
                del self.jqyzlb[user_id]
                self.jqyzdjs.pop(user_id, None)
                kick = True
            if kick:
                try:
                    await self.bot.api.call_action(
                        "set_group_kick",
                        group_id=int(group_id),
                        user_id=int(user_id),
                        reject_add_request=False,
                    )
                    await self.bot.api.call_action(
                        "send_group_msg",
                        group_id=int(group_id),
                        message=f"用户 {user_id} 验证超时，已被移出群聊",
                    )
                except Exception as e:
                    logger.error(f"超时踢人失败: {e}")
                    # 发送失败通知
                    await self.bot.api.call_action(
                        "send_group_msg",
                        group_id=int(group_id),
                        message=f"用户 {user_id} 验证超时，但踢人失败，请管理员手动处理",
                    )
        except asyncio.CancelledError:
            logger.info(f"超时任务被取消: user_id={user_id}")
        finally:
            # 任务结束后
            self.jqyzdjs.pop(user_id, None)

    # 私信会话释放倒计时
    async def ssyb_hh(self, user_id):
        try:
            await asyncio.sleep(600)  # 等待超时秒数
            # 超时后要执行
            async with self.sx_hhs:
                lb = self.sx_hh.get(user_id)
                if not lb:
                    return
                del self.sx_hh[user_id]
                self.sx_sfdjs.pop(user_id, None)
        except asyncio.CancelledError:
            # 任务被取消
            logger.info(f"超时任务已取消: user_id={user_id}")
        except Exception as e:
            logger.info(f"错误{e}，用户：{user_id}")

    # 群聊会话释放倒计时
    async def qqyb_hh(self, user_id):
        try:
            await asyncio.sleep(600)  # 等待超时秒数
            # 超时后要执行
            async with self.ql_hhs:
                lb = self.ql_hh.get(user_id)
                if not lb:
                    return
                del self.ql_hh[user_id]
                self.ql_sfdjs.pop(user_id, None)
        except asyncio.CancelledError:
            # 任务被取消
            logger.info(f"超时任务已取消: user_id={user_id}")
        except Exception as e:
            logger.info(f"错误{e}，用户：{user_id}")

    def html_jjwb(self, html: str) -> str:
        """从HTML中提取纯文本（降级使用）"""
        # 去掉 style 和 script 标签及其内容
        html = re.sub(
            r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE
        )
        html = re.sub(
            r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE
        )
        # 去掉所有 HTML 标签
        text = re.sub(r"<[^>]+>", "", html)
        # 去掉多余空白行
        text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        return text[:200] if text else "图片生成失败"

    # ---------------------------------

    # 文件相关读取
    async def json_dq(self, dqdwj: str):
        """
        加载配置文件
        """
        # 判断缓存是否有效
        hfztyx = self.wjhdsj.get(dqdwj)
        if hfztyx and (time.time() - hfztyx["time"] < self.wjhcsj):
            # 缓存有效，直接返回
            return hfztyx["data"]

        async with self.jcs:
            # 双重检查（防止多个协程同时读磁盘）
            hfztyx = self.wjhdsj.get(dqdwj)
            if hfztyx and (time.time() - hfztyx["time"] < self.wjhcsj):
                return hfztyx["data"]
            wjdlj = os.path.join(self.jsonxd, dqdwj)
            # 如果文件不存在，直接返回默认值
            if not os.path.exists(wjdlj):
                data = []
                self.wjhdsj[dqdwj] = {"data": data, "time": time.time()}
                return data

            try:
                with open(wjdlj, encoding="utf-8") as f:
                    data = json.load(f)
                    self.wjhdsj[dqdwj] = {"data": data, "time": time.time()}
                    return data
            except (json.JSONDecodeError, Exception) as e:
                logger.error(f"读取文件 {dqdwj} 失败: {e}")
                return []

    async def json_xg(self, dqdwj: str, data):
        """
        修改配置文件
        """
        async with self.cjwjdjcs:
            wjdlj = os.path.join(self.jsonxd, dqdwj)
            # 确保目录存在
            os.makedirs(self.jsonxd, exist_ok=True)
            try:
                with open(wjdlj, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                # 写入成功后立即更新缓存
                self.wjhdsj[dqdwj] = {"data": data, "time": time.time()}
                logger.info(f"文件 {dqdwj} 写入成功")
                return True
            except Exception as e:
                logger.error(f"写入文件 {dqdwj} 失败: {e}")
                return False

    # ---------------------------------

    async def xx_at_pt(self, user_id, hfxx):
        hflb_pt = await self.json_dq("zdhf.json")
        hflb_ai = await self.json_dq("zdsc.json")
        if hflb_pt == []:
            if hflb_ai == []:
                return [
                    Comp.At(qq=int(user_id)),
                    Comp.Plain("我还在学习呢！这个我还不会回复哦~"),
                ]
            else:
                hflb = hflb_ai
        else:
            hflb = hflb_pt
        for item in hflb:
            if not isinstance(item, dict):
                continue

            gjc = item.get("gjc", {})
            sfjt = item.get("sfjt", False)
            jtc = item.get("jtc", {})
            if isinstance(gjc, dict) and hfxx in gjc and not hfxx.startswith(">:://"):
                hfdf = gjc[hfxx]
                if sfjt == "true" and jtc != {}:
                    async with self.ql_hhs:
                        self.ql_hh[user_id] = {
                            "sj": int(time.time()),
                            "lc": "1",
                            "dy": jtc,
                        }
                        sxybhh = asyncio.create_task(self.qqyb_hh(user_id))
                        self.ql_sfdjs[user_id] = sxybhh
                now = datetime.now()
                dqsj = now.strftime("%Y-%m-%d %H:%M:%S")
                # 普通文本替换占位符
                hfdf = hfdf.replace("{{当前时间}}", dqsj)
                # 构建消息链
                chain = [Comp.At(qq=int(user_id))]
                if hfdf.strip().startswith("<!DOCTYPE html>"):
                    logger.info("检测到 HTML，调用本地渲染服务")
                    try:
                        img_bytes = await self.html_xr(hfdf)
                        # 将字节数据写入临时文件
                        with tempfile.NamedTemporaryFile(
                            suffix=".png", delete=False
                        ) as tmp:
                            tmp.write(img_bytes)
                            tmp_path = tmp.name
                        # 发送临时文件路径
                        chain.append(Comp.Image(file=tmp_path))
                        asyncio.create_task(self.html_sc(tmp_path))
                        logger.info("图片生成并发送成功")
                    except Exception as e:
                        logger.error(f"HTML渲染失败: {e}")
                        clean = self.html_jjwb(hfdf)  # 去掉标签
                        chain.append(
                            Comp.Plain(clean[:200] if clean else "图片生成失败")
                        )
                    return chain
                chain.append(Comp.Plain(hfdf))
                return chain
        if hflb == hflb_pt and hflb_ai != []:
            hflb = hflb_ai
            for item in hflb:
                if not isinstance(item, dict):
                    continue

                gjc = item.get("gjc", {})
                sfjt = item.get("sfjt", False)
                jtc = item.get("jtc", {})
                if (
                    isinstance(gjc, dict)
                    and hfxx in gjc
                    and not hfxx.startswith(">:://")
                ):
                    hfdf = gjc[hfxx]
                    if sfjt == "true" and jtc != {}:
                        async with self.ql_hhs:
                            self.ql_hh[user_id] = {
                                "sj": int(time.time()),
                                "lc": "1",
                                "dy": jtc,
                            }
                            sxybhh = asyncio.create_task(self.qqyb_hh(user_id))
                            self.ql_sfdjs[user_id] = sxybhh
                    now = datetime.now()
                    dqsj = now.strftime("%Y-%m-%d %H:%M:%S")
                    # 普通文本替换占位符
                    hfdf = hfdf.replace("{{当前时间}}", dqsj)
                    # 构建消息链
                    chain = [Comp.At(qq=int(user_id))]
                    if hfdf.strip().startswith("<!DOCTYPE html>"):
                        logger.info("检测到 HTML，调用本地渲染服务")
                        try:
                            img_bytes = await self.html_xr(hfdf)
                            # 将字节数据写入临时文件
                            with tempfile.NamedTemporaryFile(
                                suffix=".png", delete=False
                            ) as tmp:
                                tmp.write(img_bytes)
                                tmp_path = tmp.name
                            # 发送临时文件路径
                            chain.append(Comp.Image(file=tmp_path))
                            asyncio.create_task(self.html_sc(tmp_path))
                            logger.info("图片生成并发送成功")
                        except Exception as e:
                            logger.error(f"HTML渲染失败: {e}")
                            clean = self.html_jjwb(hfdf)  # 去掉标签
                            chain.append(
                                Comp.Plain(clean[:200] if clean else "图片生成失败")
                            )
                        return chain
                    chain.append(Comp.Plain(hfdf))
                    return chain
        await self.xx_at_xx(hfxx)
        return None

    async def xx_zl_pt(self, user_id, hfxx, xxid):
        hflb_pt = await self.json_dq("zlhf.json")
        if hflb_pt == []:
            return False, []
        for item in hflb_pt:
            if not isinstance(item, dict):
                continue
            gjc = item.get("gjc", {})
            if hfxx in gjc and not hfxx.startswith(">:://"):
                reply_text = gjc[hfxx]  # 文本回复
                tp = item.get("tp", "")  # 图片地址
                sp = item.get("sp", "")  # 视频地址
                dt = item.get("dt", False)  # 是否只显示图片，视频链接形式显示
                # 确保回复文本为字符串
                if isinstance(reply_text, bytes):
                    reply_text = reply_text.decode("utf-8")
                elif not isinstance(reply_text, str):
                    reply_text = str(reply_text)
                # 构建消息链（先加引用）
                chain = [Comp.Reply(id=xxid)]
                now = datetime.now()
                dqsj = now.strftime("%Y-%m-%d %H:%M:%S")
                # 普通文本替换占位符
                reply_text = reply_text.replace("{{当前时间}}", dqsj)
                if reply_text.strip().startswith("<!DOCTYPE html>"):
                    logger.info("检测到 HTML，调用本地渲染服务")
                    try:
                        img_bytes = await self.html_xr(reply_text)
                        # 将字节数据写入临时文件
                        with tempfile.NamedTemporaryFile(
                            suffix=".png", delete=False
                        ) as tmp:
                            tmp.write(img_bytes)
                            tmp_path = tmp.name
                        # 发送临时文件路径
                        chain.append(Comp.Image(file=tmp_path))
                        asyncio.create_task(self.html_sc(tmp_path))
                        logger.info("图片生成并发送成功")
                    except Exception as e:
                        logger.error(f"HTML渲染失败: {e}")
                        clean = self.html_jjwb(reply_text)  # 去掉标签
                        chain.append(
                            Comp.Plain(clean[:200] if clean else "图片生成失败")
                        )
                    return True, chain
                # 先处理文本
                if reply_text:
                    chain.append(Comp.Plain(reply_text))

                if dt:
                    # dt=true图片 + 视频链接形式
                    if tp:
                        chain.append(Comp.Image(file=tp))
                    if sp:
                        chain.append(Comp.Plain(f"\n{sp}"))  # 视频作为纯文本链接
                else:
                    # dt=false默认图片和视频都发
                    if tp:
                        chain.append(Comp.Image(file=tp))
                    if sp:
                        # 优先使用视频组件，若不支持可改为 Comp.Plain(sp)
                        chain.append(Comp.Video(file=sp))
                return True, chain
        return False, []

    async def xx_at_xx(self, xxwb):
        # 检查学习功能是否开启
        if not self.xx_kg:
            return
        # 读取主词库
        zdhf = await self.json_dq("zdhf.json")
        if not zdhf:
            return

        # 读取或初始化学习词库
        try:
            zdsc = await self.json_dq("zdsc.json")
            if not isinstance(zdsc, list):
                zdsc = []
        except Exception:
            zdsc = []

        # 匹配规则 xxwb 必须以关键词开头，且总长度不超过关键词长度+2
        for item in zdhf:
            gjc = item.get("gjc", {})
            for kw, reply in gjc.items():
                if (
                    xxwb.startswith(kw)
                    and len(xxwb) <= len(kw) + 2
                    and not xxwb.startswith(">:://")
                ):
                    new_entry = {
                        "gjc": {xxwb: reply},
                        "sfjt": item.get("sfjt", "false"),
                        "jtc": item.get("jtc", {}),
                    }
                    # 去重
                    if not any(e.get("gjc", {}).get(xxwb) == reply for e in zdsc):
                        zdsc.append(new_entry)
                        success = await self.json_xg("zdsc.json", zdsc)
                        if success:
                            logger.info(f"学习成功: {xxwb} -> {reply}")
                        else:
                            logger.error("学习失败: 保存 zdsc.json 失败")
                    return

    # ---------------------------------

    # html渲染
    async def html_xr(self, html_content: str) -> bytes:
        # 确保 html_content 是字符串
        if isinstance(html_content, bytes):
            html_content = html_content.decode("utf-8")
        elif not isinstance(html_content, str):
            html_content = str(html_content)
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(self.html_jk_xr, json={"html": html_content})
            resp.raise_for_status()
            return resp.content

    async def html_sc(self, file_path: str, delay: int = 10):
        """延迟删除临时文件"""
        await asyncio.sleep(delay)
        try:
            os.remove(file_path)
            logger.info(f"临时文件已删除: {file_path}")
        except Exception as e:
            logger.warning(f"删除临时文件失败: {e}")

    # =================================

    # Web API 处理器
    async def api_get_rules(self):
        """
        Web API: 获取规则文件内容
        前端调用: bridge.apiGet("hqgz", { file: "rules.json" })
        """
        try:
            file_name = request.query.get("file", "zdhf.json", type=str)
            data = await self.json_dq(file_name)
            if not data or (isinstance(data, dict) and not data):
                data = []
            return json_response({"success": True, "data": data, "message": "获取成功"})
        except Exception as e:
            logger.error(f"api_get_rules 异常: {e}", exc_info=True)
            return error_response(f"服务器错误: {str(e)}", status_code=500)

    async def api_save_rules(self):
        """
        Web API: 保存规则文件
        前端调用: bridge.apiPost("bcgz", { file: "rules.json", data: [...] })
        """
        try:
            payload = await request.json(default={})
            if payload is None:
                return error_response("请求体必须是 JSON", status_code=400)
            file_name = payload.get("file", "zdhf.json")
            data = payload.get("data", [])
            if not isinstance(data, list):
                return error_response("数据格式错误，必须是数组", status_code=400)
            success = await self.json_xg(file_name, data)
            if success:
                return json_response({"success": True, "message": "保存成功"})
            else:
                return error_response("保存失败", status_code=500)
        except Exception as e:
            logger.error(f"api_save_rules 异常: {e}", exc_info=True)
            return error_response(f"服务器错误: {str(e)}", status_code=500)

    @filter.llm_tool(name="query_gostore_rule")
    async def tool_get_internal_rules(
        self, event: AstrMessageEvent, export_full: bool, search_keywords: list
    ):
        """从内部词库查询对应的规则数据。

        Args:
            export_full(boolean): 是否返回完整词库。仅当用户明确要求（如“发我一下完整词库”）时设为 true，否则默认 false。
            search_keywords(array[string]): 用户问题拆解出的核心关键词和近义词列表。**【必须】传入标准的列表格式（例如 ["安装", "linux", "部署"]），绝对禁止仅传入单个字符串。如果需要获取整个词库时也必须传入一个空的列表[]
        """
        try:
            # 1. 读取完整的内部词库
            all_data = await self.json_dq("zdhf.json")
            all_gjc = []
            for item in all_data:
                gjc = item.get("gjc", {})
                if gjc:
                    all_gjc.append(gjc)

            # 2. 场景 A：AI 判断需要返回完整词库
            if export_full:
                result_text = f"以下为完整内部词库数据：\n```json\n{json.dumps(all_gjc, ensure_ascii=False, indent=2)}\n```"
                return result_text

            # 3. 场景 B：AI 判断只需检索部分词库（按近义词/关键词）
            matched_data = []
            if search_keywords:  # 如果 AI 拆解出了关键词列表
                for item in all_gjc:
                    for keyword, reply in item.items():
                        for term in search_keywords:
                            # 只要词库的关键字中包含了 AI 传回的关键词/近义词，就算匹配
                            if term in keyword:
                                matched_data.append(item)
                                break  # 跳出内部循环，防止重复添加同一个 item

            # 4. 封装返回值
            if matched_data:
                result_text = f"根据用户问题拆解出的关键词 {json.dumps(search_keywords)}，在词库中检索到以下相关规则：\n```json\n{json.dumps(matched_data, ensure_ascii=False, indent=2)}\n```"
            else:
                result_text = f"根据用户问题拆解出的关键词 {json.dumps(search_keywords)}，在词库中未检索到匹配条目。"

            return result_text

        except Exception as e:
            logger.error(f"工具调用失败: {e}")
            return "获取内部词库失败，请稍后重试。"
