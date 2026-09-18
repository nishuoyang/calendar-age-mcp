# data-mcp-server

[English](README.md) | 简体中文

`data-mcp-server` 是一个确定性的 MCP 服务，用于公历与中国农历之间的日期转换，以及基于明确历法规则的年龄计算。

## 功能范围

支持的历法：

- 公历（Gregorian）
- 中国农历（Chinese lunar），通过 `lunar-javascript` 使用现代中国标准历法规则

支持的年龄体系：

- 从出生日期到计算日期的完整经过天数
- 公历周岁
- 农历周岁
- 以农历新年为分界的虚岁

v0.1 使用本地 stdio 通信。所有工具调用均为只读、幂等、确定性操作，运行时不访问网络。

## 支持范围

规范化后的公历日期必须位于 `1900-01-01` 至 `2100-12-31` 之间。对应的农历边界月份为 `1899-12` 和 `2100-12`。

超出范围的日期会返回稳定错误：

```text
DATE_OUT_OF_RANGE
```

历法转换引擎为 `lunar-javascript` `1.7.7`，版本由 `package-lock.json` 固定。

## 环境要求

- Node.js 22 或更高版本
- npm

## 安装与构建

```powershell
npm install
npm run build
npm test
```

开发时可执行：

```powershell
npm run typecheck
npm run test:watch
```

构建完成后，服务入口为：

```text
dist/index.js
```

## MCP 客户端配置

先构建项目，然后在 MCP 客户端中配置服务进程：

```json
{
  "mcpServers": {
    "calendar-age-mcp": {
      "command": "node",
      "args": [
        "E:\\AiProject\\data-mcp\\dist\\index.js"
      ]
    }
  }
}
```

服务通过 stdio 与客户端通信：

- MCP 客户端启动 `node dist/index.js`
- 请求通过子进程的 `stdin` 发送
- 响应通过子进程的 `stdout` 返回
- `stderr` 保留给诊断日志

## 工具

### `calendar_convert_date`

在公历和中国农历之间进行双向转换。

```json
{
  "date": {
    "calendar": "chinese_lunar",
    "year": 2005,
    "month": 5,
    "day": 19,
    "is_leap_month": false
  },
  "target_calendar": "gregorian",
  "response_format": "json"
}
```

返回结果包含规范化后的公历日期：

```text
2005-06-25
```

### `calendar_calculate_age`

按照明确指定的年龄体系计算年龄。

```json
{
  "birth_date": {
    "calendar": "chinese_lunar",
    "year": 2005,
    "month": 5,
    "day": 19,
    "is_leap_month": false
  },
  "as_of_date": {
    "calendar": "gregorian",
    "year": 2026,
    "month": 9,
    "day": 16
  },
  "timezone": "Asia/Shanghai",
  "age_systems": [
    "chronological_days",
    "gregorian_completed_years",
    "chinese_lunar_completed_years",
    "chinese_nominal_age"
  ],
  "leap_month_policy": "regular_month",
  "nominal_age_rule": "lunar_new_year",
  "response_format": "json"
}
```

上述示例的结果为：

- 公历周岁：21
- 农历周岁：21
- 虚岁：22
- 完整经过天数：7753

如果省略 `as_of_date`，服务会使用 `timezone` 解析计算当天日期。默认时区为 `Asia/Shanghai`。

### `calendar_list_birthdays`

将生日映射到指定年份范围和目标历法。单次请求最多支持 100 个包含在内的历法年份。

```json
{
  "birth_date": {
    "calendar": "chinese_lunar",
    "year": 2005,
    "month": 5,
    "day": 19,
    "is_leap_month": false
  },
  "start_year": 2026,
  "end_year": 2030,
  "target_calendar": "gregorian",
  "leap_month_policy": "regular_month",
  "response_format": "json"
}
```

返回结果包含每年的映射日期、`count` 和 `has_more`。

## 闰月生日策略

- `regular_month`：目标农历年有相同闰月时使用闰月；没有时使用普通月份和相同日期。该策略为默认值。
- `skip`：目标农历年没有对应闰月时，跳过该年的生日。
- `strict`：目标农历年没有对应闰月时，返回 `AMBIGUOUS_LEAP_BIRTHDAY`。

服务不会隐式选择 `skip` 或 `strict`。

## 输出格式

每个工具都支持：

```json
{
  "response_format": "json"
}
```

可选值：

- `json`：返回完整结构化 JSON 文本，同时保留 `structuredContent`
- `markdown`：返回便于阅读的 Markdown 文本，结构化数据保持一致

## 已知限制

- 不支持时辰、小时级农历边界和八字相关功能。
- 时区仅用于在省略 `as_of_date` 时解析当天日期。
- 公历 2 月 29 日生日只在真实存在 2 月 29 日的闰年计入生日；服务不会自行采用不同地区的 2 月 28 日或 3 月 1 日规则。
- 当前只支持公历和中国农历，尚未实现伊斯兰历、希伯来历、波斯历等扩展历法。
- 如需扩大支持日期范围，必须增加独立来源的边界 fixture 并更新 ADR。

更多设计决策见 [docs/adr/0001-v0.1-contract-decisions.md](docs/adr/0001-v0.1-contract-decisions.md)。
