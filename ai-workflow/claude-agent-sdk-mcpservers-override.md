# Claude Agent SDK: options.mcpServers가 파일 기반 MCP 설정을 통째로 대체하는 함정

> 2026-07-08, 아이나(Agent4Discord) 봇에서 TimeTree MCP가 안 잡히던 문제의 근본 원인.

## 증상

- `claude` CLI 대화 세션에서는 user-scope MCP 서버(`~/.claude.json`의 `mcpServers`)가 잘 붙는데,
  **Claude Agent SDK의 `query()`로 만든 세션에서는 같은 서버가 아예 안 보인다.**
- 에러도 없다 — 도구 목록에 `mcp__<server>__*`가 그냥 없을 뿐. 모델은 ToolSearch로 엉뚱한
  대체재(예: claude.ai Google Calendar 커넥터)를 찾아 헤맨다.
- 로그 근거: 봇 로그 전체에서 `mcp__timetree` 호출 0건 (구동 환경 2곳 모두).

## 원인

`query({ options: { mcpServers: {...} } })`처럼 **`mcpServers`를 명시적으로 넘기면
파일 기반 MCP 설정(`~/.claude.json`, `.mcp.json`)과 병합되지 않고 통째로 대체**된다.
Agent4Discord는 in-process discord 도구 서버 하나만 담아 넘기고 있었으므로,
timetree 등 사용자 설정 서버가 SDK 세션에서 전부 사라졌다.

## 해결 패턴

SDK 쪽에서 user-scope 서버를 직접 읽어 병합하고, `allowedTools`에 서버 단위
허용 규칙(`mcp__<name>`)을 추가한다:

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { query, type McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

function loadUserMcpServers(): Record<string, McpServerConfig> {
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf-8');
    return (JSON.parse(raw) as { mcpServers?: Record<string, McpServerConfig> }).mcpServers ?? {};
  } catch {
    return {};
  }
}

const mcpServers: Record<string, McpServerConfig> = { ...loadUserMcpServers() };
const allowedTools = Object.keys(mcpServers).map((n) => `mcp__${n}`);
// 이후 in-process SDK 서버(createSdkMcpServer 결과)를 같은 맵에 추가해도 된다
```

## 검증 방법

세션 시작 시 SDK가 내보내는 `system/init` 메시지의 `mcp_servers` 배열에서
`name=상태`를 확인한다 (`timetree=connected`). 도구 호출은 `mcp__timetree__get_events`
같은 `tool_use` 블록으로 로그에 남는다.

## 관련

- stdio MCP 서버 자체를 빠르게 검증하려면 JSON-RPC를 직접 쏘면 된다:
  `initialize` → `notifications/initialized` → `tools/call` (newline-delimited JSON, stdout).
  서버 로그는 stderr로 나온다.
- 적용 커밋: Agent4Discord `src/sessions/sessionManager.ts` (아이나 비서 PC, `D:\aina\bot\Agent4Discord`)
