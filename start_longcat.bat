@echo off
:: 1. 设置 Longcat API 相关的环境变量
set ANTHROPIC_BASE_URL=https://api.longcat.chat/anthropic
set ANTHROPIC_AUTH_TOKEN=ak_2Ub9Ub2NX7rV89U7tE0Ik6j02aE4Y

:: 2. 锁定所有模型档位为 LongCat-2.0-Preview
set ANTHROPIC_MODEL=LongCat-2.0-Preview
set ANTHROPIC_DEFAULT_OPUS_MODEL=LongCat-2.0-Preview
set ANTHROPIC_DEFAULT_SONNET_MODEL=LongCat-2.0-Preview
set ANTHROPIC_DEFAULT_HAIKU_MODEL=LongCat-Flash-Chat

:: 3. 锁定后台子代理模型并设置最高思考强度
set CLAUDE_CODE_SUBAGENT_MODEL=LongCat-Flash-Chat
set CLAUDE_CODE_EFFORT_LEVEL=max

:: 4. 打印一条提示信息，告诉你环境已就绪
echo ========================================
echo  Longcat 环境配置已加载！
echo  正在启动 Claude Code...
echo ========================================

:: 5. 启动 claude 命令
:: 使用 cmd /k 可以保证环境变量在当前窗口持续生效，并且窗口不会在启动后立刻关闭
cmd /k claude