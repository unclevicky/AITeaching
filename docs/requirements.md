开发指令：医疗智慧平台国赛 Web Demo (V1.0)
# 1. 项目愿景与定位
• 定位：这是一项国家级比赛的演示用 Web Demo，需部署至云端通过浏览器访问。
• 核心目标：追求极致的视觉真实感、顺滑的交互动效、以及 AI 数字人的“中枢感”。
• 工程原则：重前端表现，轻后端逻辑。放弃开源重型后台，采用纯 B/S 架构（Vue3/React SPA + 轻量级 BFF 接口层），追求前台的视觉冲击力和毫秒级响应。
# 2. 技术栈要求
• 前端框架：Vue 3 (基于 Vite 构建) 或 React 18。
• 样式与状态：Tailwind CSS (UI 快速构建) + Pinia/Redux (全局状态管理) + Vue Router/React Router。
• 动画引擎：lottie-web (用于数字人骨骼动画渲染，确保天生透明背景和极致性能)。
• 后端中转 (BFF)：轻量级 Node.js (Express) 或 Python (FastAPI)，仅用于安全存放 API Key 并作为前端与 MiniMax S2S 之间的 WebSocket 代理。
• 音频流技术：前端使用 Web Audio API (navigator.mediaDevices.getUserMedia) 采集麦克风流。
# 3. 核心组件实现逻辑
A. 全局悬浮数字人 (GlobalAvatar Web版)
• 挂载位置：直接挂载在前端应用的最高层级（如 Vue 的 App.vue 中，与 <router-view> 同级）。
• 视觉排版：使用 CSS 绝对定位 position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;，确保在任何路由页面下都悬浮于主内容之上。
• 状态机控制：
1. IDLE (空闲)：微弱呼吸、眨眼动作。
2. LISTENING (聆听)：身体微前倾，UI 底部出现动态声波效果。
3. SPEAKING (播报)：身体有自然的交流态摆动，模拟说话神态。
• 交互兜底：在数字人旁边放置一个浮动的“麦克风”图标按钮，支持鼠标点击唤醒（解决浏览器全局快捷键必须聚焦的限制）。
B. AI 语音交互中枢 (MiniMax S2S)
• 集成路径：前端请求浏览器麦克风权限 -> WebSocket 传至后端 BFF -> 透传给 MiniMax speech-01 接口 -> 后端将回传的音频流与文本流实时推送至前端。
• 意图拦截 (Intent Mapping)：
• 在后端对 MiniMax 返回的文本进行关键词精准正则拦截，不经过大模型长考。
• 匹配规则：
• “大屏/面板/数据” -> 触发 OPEN_DASHBOARD。
• “诊断/CT/病例” -> 触发 OPEN_DIAGNOSIS。
• “考核/测试” -> 触发 OPEN_EXAM。
• “PPT/幻灯片” -> 触发 OPEN_PPT。
• 指令执行：前端 WebSocket 监听到指令后，直接调用 Router push 跳转页面，同时改变数字人状态至 SPEAKING，播放回传音频。
C. UI 框架与菜单 (Placeholder Menus)
• 布局设计：极具科技感的深色系（Dark Mode）左侧/顶部玻璃拟态（Glassmorphism）导航栏，主区域为业务内容区。
• 功能占位（V1.0 仅需实现静态高端 UI 和页面路由，无需真实后台数据）：
1. 数字大屏 (/dashboard)：嵌入 Echarts 动态折线图/地图占位。
2. 智能诊断 (/diagnosis)：包含一个高大上的“CT 影像上传/拖拽舱”和“诊断结果流式输出区”。
3. PPT 展示 (/presentation)：高清演示图片轮播组件。
4. 随堂测试 (/exam)：带有“扫码参与”二维码的实时统计大屏UI。
# 4. 第一步开发任务清单 (请按顺序执行)
1. 工程初始化：搭建 Vite + Vue3/React 前端项目结构，配置 Tailwind CSS 深色主题和 Router 基础路由表。

2. 数字人与 Lottie：编写 GlobalAvatar 组件，引入 Lottie 占位动画，通过全局状态（Store）或事件总线实现 IDLE/LISTENING/SPEAKING 三态的纯前端手动切换（点击按钮测试）。

3. 录音与权限跑通：编写 useAudioRecorder 钩子/工具类，处理浏览器麦克风权限申请，实现音频流切片采集。

4. WebSocket 链路接入：编写 BFF 后端代码（Python/Node），跑通“前端录音 -> BFF转发 -> MiniMax S2S -> BFF回传 -> 前端播放”的完整多模态交互闭环。

  #  💡 给 AI 的编码约束说明：

5. 不要写复杂的数据库/ORM 代码，我们不需要持久化存储，所有的用户、影像、题库信息全部在前端写死 JSON 或者在后端内存中 Mock。

6. 请严格处理浏览器的音频自动播放策略 (Autoplay Policy)，确保在第一次发声前，有一个需要用户点击交互的按钮（例如“进入系统”或“启动助理”）。

7. UI 风格请参考『医疗科技/赛博大屏』风格，大量使用 backdrop-blur、深蓝/青蓝色调和 CSS 过渡动画（Transitions）以提升“昂贵感”。

8. minimaxi的url、model、token配置放在配置文件中，方便调试

9. 所有需要语音操作的步骤，都需要添加“快捷键”进行兜底操作，以免“语音失效”