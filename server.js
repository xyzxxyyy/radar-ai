import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const rootDir = resolve(".");
const distDir = join(rootDir, "dist");
const apiPort = Number(process.env.PORT || process.env.API_PORT || 8787);
const apiHost = process.env.HOST || "0.0.0.0";
const defaultOpenAiModel = "gpt-5.4-mini";
const defaultDeepSeekModel = "deepseek-v4-flash";

function loadEnvFile() {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function normalizeBaseUrl(value, fallback, providerKey) {
  let url = String(value || fallback || "").trim();
  if (!url) {
    return fallback;
  }

  if (providerKey) {
    url = url.replace(new RegExp(`^${providerKey}_BASE_URL=`, "i"), "").trim();
  }

  url = url.replace(/\/(chat\/completions|responses)\/?$/i, "");

  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }

  return url.replace(/\/+$/, "");
}

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "sources",
    "risk",
    "procrastination",
    "encouragement",
    "plan",
    "rest",
    "reasonText",
    "strategyTitle",
    "detailAdvice",
    "alternatives",
  ],
  properties: {
    summary: { type: "string" },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "detail", "weight"],
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
          weight: { type: "number" },
        },
      },
    },
    risk: { type: "string" },
    procrastination: { type: "string" },
    encouragement: { type: "string" },
    plan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "minutes", "tag"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          minutes: { type: "number" },
          tag: { type: "string" },
        },
      },
    },
    rest: { type: "string" },
    reasonText: { type: "string" },
    strategyTitle: { type: "string" },
    detailAdvice: {
      type: "array",
      items: { type: "string" },
    },
    alternatives: {
      type: "array",
      items: { type: "string" },
    },
  },
};

const interviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "summary", "signals", "risk", "suggestion"],
  properties: {
    score: { type: "number" },
    summary: { type: "string" },
    signals: {
      type: "array",
      items: { type: "string" },
    },
    risk: { type: "string" },
    suggestion: { type: "string" },
  },
};

const interviewPrompt = [
  "你是“学压雷达”的AI压力访谈评估助手，服务对象是青少年学生。",
  "你需要根据学生对访谈问题的回答，评估其当前学习压力值，分数范围是0到100。",
  "评估时重点观察：主观紧张程度、任务失控感、身体疲劳信号、拖延/逃避倾向、外部期待压力、是否需要降低任务密度。",
  "不要做医学诊断或心理疾病诊断。若出现明显自伤风险、强烈痛苦或持续失眠，只能温和建议尽快联系可信任的家长、老师或专业人士。",
  "输出必须是中文，并严格符合JSON结构。",
].join("\n");

const systemPrompt = [
  "你是“学压雷达”的真实 AI 分析助手，服务对象是青少年学生。",
  "你的任务是根据学生输入、本地规则评分、AI访谈结果、用户选择的需求类型和建议风格，生成灵活多变的学习压力观察、时间管理建议、拖延原因分析和今日计划。",
  "必须根据用户的 supportGoal 和 adviceStyle 改变输出重点：排优先级时强调排序和取舍；缓解焦虑时先降压再启动；解决拖延时拆小动作和降低门槛；考前复习时强调错题和高频题；安排今晚时间时给出清晰时间块。",
  "内容要比模板更具体，避免总是重复同一套话。detailAdvice 至少给 3 条不同角度建议，alternatives 给 2 条备用方案。",
  "不要做医学、心理疾病诊断，不要使用治疗承诺；如果状态很差，只建议减少任务密度、休息、和可信任的家长/老师沟通。",
  "输出必须是中文，温和、具体、可执行，且严格符合提供的 JSON Schema。",
].join("\n");

const chatSystemPrompt = [
  "你是“学压雷达”的 AI 陪伴计划教练，服务对象是青少年学生。",
  "你的主要目标是缓解用户当下的学习压力，并引导用户制定可执行的学习计划。",
  "对话风格要温和、自然、像可靠的学长学姐或学习教练，可以偶尔闲聊几句，但不要跑题太久。",
  "优先帮助用户：说清楚压力来源、拆分任务、确定第一步、安排休息、做今日或本周计划。",
  "不要做医学诊断、心理疾病诊断或治疗承诺。遇到明显强烈痛苦、自伤风险或持续失眠等情况，要建议用户尽快联系可信任的家长、老师或专业人士。",
  "回复尽量简短具体，通常用 2-5 个要点；如果用户只是想聊天，可以先接住情绪，再轻轻把话题带回下一步计划。",
  "不要使用 Markdown 加粗语法，不要输出 ** 符号；需要强调时直接用自然中文表达。",
].join("\n");

const adultSystemPrompt = [
  "你是“压力雷达”的成人工作生活压力与任务协助 AI。",
  "服务对象是所有想缓解压力、梳理任务、处理工作生活事项的成年人，不只局限于学生。",
  "你需要结合用户填写的工作时长、睡眠、任务负荷、截止压力、生活负荷、情绪、上传文件信息、文本文件内容、粘贴内容和补充说明，生成个性化压力评估和行动计划。",
  "你可以帮助用户：提取文件或粘贴内容里的任务、排序优先级、制定今日/本周计划、起草邮件/消息/汇报/会议纪要/表格填写要点、给出线上任务的操作步骤。",
  "你不能声称自己已经登录外部网站、提交表单、发送邮件或替用户完成真实外部操作。只能提供可复制草稿、检查清单和步骤，除非未来系统接入了明确授权的外部工具。",
  "不要做医学诊断、心理疾病诊断或治疗承诺。若用户表现出强烈痛苦、持续失眠、自伤风险等，只能温和建议联系可信任的人或专业人士。",
  "如涉及法律、医疗、财务、合同、人事处分、公司机密等高风险内容，要提醒用户自行核对、脱敏或咨询专业人士。",
  "输出必须是中文，具体、自然、可执行，不要空泛。只返回一个 JSON 对象，不要使用 Markdown 代码块。",
  "JSON 必须包含 pressureScore、summary、pressureSources、workLifeRisk、plan、taskDrafts、onlineTaskHelp、boundaries、nextStep。",
].join("\n");

const adultChatSystemPrompt = [
  "你是“压力雷达”成人分区里的 AI 朋友与任务协助助手。",
  "你面向成年人，既能陪用户聊聊天、缓解情绪压力，也能协助用户完成工作、生活和线上任务。",
  "你的语气要像可靠、温暖、清醒的朋友：先接住情绪，再帮用户把事情变清楚。不要说教，不要机械模板化。",
  "你可以帮助用户：梳理压力来源、拆解任务、制定计划、分析上传文件/图片说明、提取待办、起草邮件/消息/汇报/会议纪要/表格填写要点。",
  "如果用户只是想聊天，你可以轻松自然地聊几句，但要在合适时温和地引导到一个小的下一步。",
  "如果用户上传了文件或图片，优先结合文件名、文件内容、图片说明和用户消息分析；如果看不到图片具体内容，要坦诚说明需要用户补充截图文字或关键信息。",
  "你不能声称自己已经登录外部网站、提交表单、发送邮件或替用户完成真实外部操作。你只能提供可复制草稿、检查清单和操作步骤。",
  "不要做医学诊断、心理疾病诊断或治疗承诺。遇到明显强烈痛苦、自伤风险或持续失眠等情况，要温和建议联系可信任的人或专业人士。",
  "回复尽量具体、自然、可执行。根据用户当下需要选择格式：聊天安慰可短一些；任务协助可分步骤；草稿要可直接复制。",
  "不要使用 Markdown 加粗语法，不要输出 ** 符号；需要强调时直接用自然中文表达。",
].join("\n");

function setApiHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getRequestPath(request) {
  const rawUrl = request.url || "/";
  const pathname = new URL(rawUrl, "http://localhost").pathname.replace(/\/+$/, "") || "/";
  return pathname.startsWith("/api/") ? pathname : `/api${pathname}`;
}

function sendJson(response, statusCode, body) {
  setApiHeaders(response);
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";
    request.setEncoding("utf8");

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 3 * 1024 * 1024) {
        rejectBody(new Error("请求内容过大"));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch {
        rejectBody(new Error("请求 JSON 格式不正确"));
      }
    });

    request.on("error", rejectBody);
  });
}

function stringifyContentParts(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (typeof part?.text === "string") {
          return part.text;
        }

        if (typeof part?.text?.value === "string") {
          return part.text.value;
        }

        if (typeof part?.content === "string") {
          return part.content;
        }

        if (typeof part?.value === "string") {
          return part.value;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (typeof content?.text === "string") {
    return content.text;
  }

  if (typeof content?.text?.value === "string") {
    return content.text.value;
  }

  if (typeof content?.value === "string") {
    return content.value;
  }

  return "";
}

function extractOutputText(data) {
  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  if (Array.isArray(data.output)) {
    return data.output
      .flatMap((item) => item.content || item.message?.content || [])
      .map((part) => stringifyContentParts(part))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

function normalizeAnalysis(value) {
  const fallback = {
    summary: "",
    sources: [],
    risk: "",
    procrastination: "",
    encouragement: "",
    plan: [],
    rest: "",
    reasonText: "",
    strategyTitle: "",
    detailAdvice: [],
    alternatives: [],
  };

  if (!value || typeof value !== "object") {
    return fallback;
  }

  return {
    summary: String(value.summary || fallback.summary),
    sources: Array.isArray(value.sources) ? value.sources.slice(0, 4) : fallback.sources,
    risk: String(value.risk || fallback.risk),
    procrastination: String(value.procrastination || fallback.procrastination),
    encouragement: String(value.encouragement || fallback.encouragement),
    plan: Array.isArray(value.plan) ? value.plan.slice(0, 4) : fallback.plan,
    rest: String(value.rest || fallback.rest),
    reasonText: String(value.reasonText || fallback.reasonText),
    strategyTitle: String(value.strategyTitle || fallback.strategyTitle),
    detailAdvice: Array.isArray(value.detailAdvice) ? value.detailAdvice.slice(0, 5).map((item) => String(item)) : fallback.detailAdvice,
    alternatives: Array.isArray(value.alternatives) ? value.alternatives.slice(0, 4).map((item) => String(item)) : fallback.alternatives,
  };
}

function normalizeAdultAnalysis(value, fallback = {}) {
  const pressureScore = Math.min(
    Math.max(Math.round(Number(value?.pressureScore ?? fallback.pressureScore ?? 0)), 0),
    100,
  );
  const fallbackSources = Array.isArray(fallback.pressureSources) ? fallback.pressureSources : [];
  const fallbackPlan = Array.isArray(fallback.plan) ? fallback.plan : [];
  const fallbackDrafts = Array.isArray(fallback.taskDrafts) ? fallback.taskDrafts : [];
  const fallbackHelp = Array.isArray(fallback.onlineTaskHelp) ? fallback.onlineTaskHelp : [];
  const pressureSources = Array.isArray(value?.pressureSources)
    ? value.pressureSources.slice(0, 5).map((source, index) => {
        if (typeof source === "string") {
          return {
            label: `来源${index + 1}`,
            detail: source,
            weight: 0,
          };
        }

        return {
          label: String(source?.label || source?.title || source?.name || source?.type || `来源${index + 1}`),
          detail: String(source?.detail || source?.description || source?.reason || source?.content || source?.text || ""),
          weight: Number(source?.weight || source?.score || source?.impact || 0),
        };
      })
    : fallbackSources;
  const plan = Array.isArray(value?.plan)
    ? value.plan.slice(0, 6).map((item, index) => {
        if (typeof item === "string") {
          return {
            title: `步骤${index + 1}`,
            detail: item,
            minutes: 20,
            tag: "行动",
          };
        }

        return {
          title: String(item?.title || item?.step || item?.task || item?.action || `步骤${index + 1}`),
          detail: String(item?.detail || item?.description || item?.content || item?.reason || item?.action || ""),
          minutes: Number(item?.minutes || item?.duration || item?.time || 20),
          tag: String(item?.tag || item?.category || item?.type || "行动"),
        };
      })
    : fallbackPlan;
  const taskDrafts = Array.isArray(value?.taskDrafts)
    ? value.taskDrafts.slice(0, 4).map((item, index) => {
        if (typeof item === "string") {
          return {
            title: `草稿${index + 1}`,
            content: item,
          };
        }

        return {
          title: String(item?.title || item?.type || item?.name || `草稿${index + 1}`),
          content: String(item?.content || item?.draft || item?.text || item?.body || ""),
        };
      })
    : fallbackDrafts;

  return {
    pressureScore,
    pressureLevel: getAdultLevelForApi(pressureScore),
    summary: String(value?.summary || fallback.summary || "AI已根据当前工作生活状态生成压力分析。"),
    pressureSources,
    workLifeRisk: String(value?.workLifeRisk || fallback.workLifeRisk || ""),
    plan,
    taskDrafts,
    onlineTaskHelp: Array.isArray(value?.onlineTaskHelp)
      ? value.onlineTaskHelp.slice(0, 5).map((item) => String(item))
      : fallbackHelp,
    boundaries: String(value?.boundaries || fallback.boundaries || "AI 生成内容请在使用前自行核对。"),
    nextStep: String(value?.nextStep || fallback.nextStep || "选择一个最小步骤先开始。"),
  };
}

function getAdultLevelForApi(score) {
  if (score >= 75) {
    return {
      label: "偏高",
      tone: "high",
      summary: "工作和生活压力偏高，需要降低任务密度并保护恢复时间。",
    };
  }

  if (score >= 50) {
    return {
      label: "中等",
      tone: "medium",
      summary: "压力处在可管理区间，适合用清晰计划和边界感推进。",
    };
  }

  return {
    label: "平稳",
    tone: "low",
    summary: "当前压力相对平稳，可以保持节奏并预留缓冲。",
  };
}

async function callOpenAI(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 OPENAI_API_KEY。请在项目根目录创建 .env 并填入密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.OPENAI_MODEL || defaultOpenAiModel;
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL, "https://api.openai.com/v1", "OPENAI");
  const apiStyle = (process.env.OPENAI_API_STYLE || "chat").toLowerCase();
  if (apiStyle !== "responses") {
    return callOpenAIAnalysisViaChat(payload, apiKey, model, baseUrl);
  }

  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT || "low";
  const requestBody = {
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      },
    ],
    reasoning: { effort: reasoningEffort },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "study_pressure_analysis",
        strict: true,
        schema: analysisSchema,
      },
    },
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 OpenAI 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 OPENAI_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "OpenAI API 调用失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  const outputText = extractOutputText(data);
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    const error = new Error("AI 返回内容不是可解析的 JSON。");
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "openai",
    model,
    analysis: normalizeAnalysis(parsed),
  };
}

function extractChatContent(data) {
  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data;
  }

  const choice = data?.choices?.[0] || {};
  const direct =
    stringifyContentParts(choice?.message?.content) ||
    stringifyContentParts(choice?.delta?.content) ||
    stringifyContentParts(choice?.text) ||
    stringifyContentParts(data?.message?.content) ||
    stringifyContentParts(data?.content) ||
    stringifyContentParts(data?.reply) ||
    stringifyContentParts(data?.answer);

  if (direct) {
    return direct;
  }

  return extractOutputText(data);
}

function cleanChatReply(text) {
  return String(text || "")
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function requireAiReply(text, providerName = "AI") {
  const cleanText = cleanChatReply(text);
  if (!cleanText) {
    const error = new Error(`${providerName} 返回内容为空，请检查模型名、中转站返回格式、额度或余额。`);
    error.statusCode = 502;
    throw error;
  }

  return cleanText;
}

function parseJsonObjectFromText(text) {
  const cleanText = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleanText);
}

function normalizeInterview(value) {
  const score = Math.min(Math.max(Math.round(Number(value?.score) || 0), 0), 100);
  return {
    score,
    summary: String(value?.summary || "AI已根据访谈回答补充评估当前压力。"),
    signals: Array.isArray(value?.signals) ? value.signals.slice(0, 4).map((item) => String(item)) : [],
    risk: String(value?.risk || ""),
    suggestion: String(value?.suggestion || ""),
  };
}

function buildInterviewPayload(payload) {
  return {
    form: payload.form || {},
    localAnalysis: payload.localAnalysis || {},
    questions: payload.questions || [],
    answers: payload.answers || {},
    instruction:
      "请根据answers里学生的回答给出访谈压力值。score必须是0-100数字；signals列出2-4个压力信号；risk写当前最需要注意的风险；suggestion写一句温和可执行建议。",
  };
}

async function callOpenAIAnalysisViaChat(payload, apiKey, model, baseUrl) {
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n只返回一个 JSON 对象，不要使用 Markdown 代码块。JSON 结构必须包含 summary、sources、risk、procrastination、encouragement、plan、rest、reasonText、strategyTitle、detailAdvice、alternatives。`,
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 1800,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 OpenAI 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 OPENAI_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "OpenAI API 调用失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  const outputText = extractChatContent(data);
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    const error = new Error("AI 返回内容不是可解析的 JSON。");
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "openai",
    model,
    analysis: normalizeAnalysis(parsed),
  };
}

async function callOpenAIInterview(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 OPENAI_API_KEY。请在项目根目录的 .env 中填写密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.OPENAI_MODEL || defaultOpenAiModel;
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL, "https://api.openai.com/v1", "OPENAI");
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `${interviewPrompt}\n只返回一个JSON对象，不要使用Markdown代码块。JSON结构必须包含 score、summary、signals、risk、suggestion。`,
      },
      {
        role: "user",
        content: JSON.stringify(buildInterviewPayload(payload), null, 2),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.25,
    max_tokens: 1000,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 OpenAI 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 OPENAI_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "OpenAI 访谈评估失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  let parsed;
  try {
    parsed = parseJsonObjectFromText(extractChatContent(data));
  } catch {
    const error = new Error("AI访谈返回内容不是可解析的JSON。");
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "openai",
    model,
    interview: normalizeInterview(parsed),
  };
}

function normalizeChatMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 1200),
    }));
}

async function callDeepSeek(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 DEEPSEEK_API_KEY。请在项目根目录的 .env 中填入 DeepSeek 密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.DEEPSEEK_MODEL || defaultDeepSeekModel;
  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL, "https://api.deepseek.com", "DEEPSEEK");
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n只返回一个 json 对象，不要使用 Markdown 代码块。json 结构必须包含 summary、sources、risk、procrastination、encouragement、plan、rest、reasonText、strategyTitle、detailAdvice、alternatives。`,
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 1800,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 DeepSeek 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 DEEPSEEK_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "DeepSeek API 调用失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  const outputText = extractChatContent(data);
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    const error = new Error("DeepSeek 返回内容不是可解析的 JSON。");
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "deepseek",
    model,
    analysis: normalizeAnalysis(parsed),
  };
}

function chooseProvider(value) {
  return value === "deepseek" ? "deepseek" : "openai";
}

async function callDeepSeekInterview(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 DEEPSEEK_API_KEY。请在项目根目录的 .env 中填写 DeepSeek 密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.DEEPSEEK_MODEL || defaultDeepSeekModel;
  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL, "https://api.deepseek.com", "DEEPSEEK");
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `${interviewPrompt}\n只返回一个JSON对象，不要使用Markdown代码块。JSON结构必须包含 score、summary、signals、risk、suggestion。`,
      },
      {
        role: "user",
        content: JSON.stringify(buildInterviewPayload(payload), null, 2),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.25,
    max_tokens: 1000,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 DeepSeek 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 DEEPSEEK_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "DeepSeek 访谈评估失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  let parsed;
  try {
    parsed = parseJsonObjectFromText(extractChatContent(data));
  } catch {
    const error = new Error("AI访谈返回内容不是可解析的JSON。");
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "deepseek",
    model,
    interview: normalizeInterview(parsed),
  };
}

async function callOpenAIChat(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 OPENAI_API_KEY。请在项目根目录创建 .env 并填入密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.OPENAI_MODEL || defaultOpenAiModel;
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL, "https://api.openai.com/v1", "OPENAI");
  const messages = normalizeChatMessages(payload.messages);
  const context = payload.context ? JSON.stringify(payload.context, null, 2) : "{}";
  const apiStyle = (process.env.OPENAI_API_STYLE || "chat").toLowerCase();
  if (apiStyle !== "responses") {
    return callOpenAICoachViaChat(payload, apiKey, model, baseUrl, messages, context);
  }

  const requestBody = {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${chatSystemPrompt}\n这是用户当前学习状态和本地分析上下文：\n${context}`,
          },
        ],
      },
      ...messages.map((message) => ({
        role: message.role,
        content: [{ type: "input_text", text: message.content }],
      })),
    ],
    reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "low" },
    text: {
      verbosity: "low",
    },
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 OpenAI 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 OPENAI_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "OpenAI API 调用失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  return {
    provider: "openai",
    model,
    reply: requireAiReply(extractOutputText(data), "OpenAI"),
  };
}

async function callOpenAICoachViaChat(payload, apiKey, model, baseUrl, messages, context) {
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `${chatSystemPrompt}\n这是用户当前学习状态和本地分析上下文：\n${context}`,
      },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1200,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 OpenAI 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 OPENAI_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "OpenAI API 调用失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  return {
    provider: "openai",
    model,
    reply: requireAiReply(extractChatContent(data), "OpenAI"),
  };
}

async function callDeepSeekChat(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 DEEPSEEK_API_KEY。请在项目根目录的 .env 中填入 DeepSeek 密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.DEEPSEEK_MODEL || defaultDeepSeekModel;
  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL, "https://api.deepseek.com", "DEEPSEEK");
  const messages = normalizeChatMessages(payload.messages);
  const context = payload.context ? JSON.stringify(payload.context, null, 2) : "{}";
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `${chatSystemPrompt}\n这是用户当前学习状态和本地分析上下文：\n${context}`,
      },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1200,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 DeepSeek 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 DEEPSEEK_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "DeepSeek API 调用失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  return {
    provider: "deepseek",
    model,
    reply: requireAiReply(extractChatContent(data), "DeepSeek"),
  };
}

function buildAdultPayload(payload) {
  const files = Array.isArray(payload.files)
    ? payload.files.slice(0, 8).map((file) => ({
        name: String(file?.name || "未命名文件"),
        type: String(file?.type || "未知类型"),
        sizeLabel: String(file?.sizeLabel || ""),
        kind: String(file?.kind || "file"),
        notice: String(file?.notice || ""),
        content: String(file?.content || "").slice(0, 6000),
      }))
    : [];

  return {
    form: payload.form || {},
    files,
    localAnalysis: payload.localAnalysis || {},
    request: payload.request || "",
    instruction:
      "请输出成人工作生活压力分析。pressureScore为0-100数字；pressureSources列出3-5个来源；plan列出4-6个可执行步骤；taskDrafts给2-4份可复制草稿或提纲；onlineTaskHelp写清AI能协助的线上任务步骤；boundaries写边界提醒；nextStep写用户下一步具体操作。",
  };
}

function buildAdultChatContext(payload) {
  const adultPayload = buildAdultPayload(payload);

  return JSON.stringify(
    {
      form: adultPayload.form,
      files: adultPayload.files,
      localAnalysis: adultPayload.localAnalysis,
      instruction:
        "这是成人分区聊天上下文。请把用户当作正在承受工作/生活压力的成年人，既可以像朋友一样回应情绪，也可以继续协助完成任务。上传文件和图片信息已放在files中；图片本身不能直接识别时，请结合文件名、图片说明和用户输入推断，并温和要求用户补充关键信息。",
    },
    null,
    2,
  );
}

async function callOpenAIAdultChat(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 OPENAI_API_KEY。请在项目根目录创建 .env 并填入密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.OPENAI_MODEL || defaultOpenAiModel;
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL, "https://api.openai.com/v1", "OPENAI");
  const messages = normalizeChatMessages(payload.messages);
  const context = buildAdultChatContext(payload);
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `${adultChatSystemPrompt}\n\n当前成人分区上下文：\n${context}`,
      },
      ...messages,
    ],
    temperature: 0.75,
    max_tokens: 1600,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 OpenAI 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 OPENAI_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "OpenAI 成人聊天失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  return {
    provider: "openai",
    model,
    reply: requireAiReply(extractChatContent(data), "OpenAI"),
  };
}

async function callDeepSeekAdultChat(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 DEEPSEEK_API_KEY。请在项目根目录的 .env 中填入 DeepSeek 密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.DEEPSEEK_MODEL || defaultDeepSeekModel;
  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL, "https://api.deepseek.com", "DEEPSEEK");
  const messages = normalizeChatMessages(payload.messages);
  const context = buildAdultChatContext(payload);
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `${adultChatSystemPrompt}\n\n当前成人分区上下文：\n${context}`,
      },
      ...messages,
    ],
    temperature: 0.75,
    max_tokens: 1600,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 DeepSeek 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 DEEPSEEK_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "DeepSeek 成人聊天失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  return {
    provider: "deepseek",
    model,
    reply: requireAiReply(extractChatContent(data), "DeepSeek"),
  };
}

async function callOpenAIAdultAnalysis(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 OPENAI_API_KEY。请在项目根目录创建 .env 并填入密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.OPENAI_MODEL || defaultOpenAiModel;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: adultSystemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(buildAdultPayload(payload), null, 2),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.55,
    max_tokens: 2200,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 OpenAI 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 OPENAI_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "OpenAI 成人压力分析失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  let parsed;
  try {
    parsed = parseJsonObjectFromText(extractChatContent(data));
  } catch {
    const error = new Error("成人区 AI 返回内容不是可解析的 JSON。");
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "openai",
    model,
    analysis: normalizeAdultAnalysis(parsed, payload.localAnalysis),
  };
}

async function callDeepSeekAdultAnalysis(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const error = new Error("还没有配置 DEEPSEEK_API_KEY。请在项目根目录的 .env 中填入 DeepSeek 密钥。");
    error.statusCode = 503;
    throw error;
  }

  const model = process.env.DEEPSEEK_MODEL || defaultDeepSeekModel;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: adultSystemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(buildAdultPayload(payload), null, 2),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.55,
    max_tokens: 2200,
  };

  let apiResponse;
  try {
    apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const detail = error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ? "连接 DeepSeek 超时" : error.message;
    const wrapped = new Error(`${detail}。请检查网络，或在 .env 中配置 DEEPSEEK_BASE_URL。`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const rawText = await apiResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!apiResponse.ok) {
    const error = new Error(data?.error?.message || "DeepSeek 成人压力分析失败");
    error.statusCode = apiResponse.status;
    throw error;
  }

  let parsed;
  try {
    parsed = parseJsonObjectFromText(extractChatContent(data));
  } catch {
    const error = new Error("成人区 AI 返回内容不是可解析的 JSON。");
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "deepseek",
    model,
    analysis: normalizeAdultAnalysis(parsed, payload.localAnalysis),
  };
}

export async function handleApi(request, response) {
  setApiHeaders(response);
  const requestPath = getRequestPath(request);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (requestPath === "/api/health" && request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      providers: {
        openai: {
          configured: Boolean(process.env.OPENAI_API_KEY),
          model: process.env.OPENAI_MODEL || defaultOpenAiModel,
        },
        deepseek: {
          configured: Boolean(process.env.DEEPSEEK_API_KEY),
          model: process.env.DEEPSEEK_MODEL || defaultDeepSeekModel,
        },
      },
    });
    return;
  }

  if (requestPath === "/api/analyze" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const provider = chooseProvider(body.provider);
      const result = provider === "deepseek" ? await callDeepSeek(body) : await callOpenAI(body);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        ok: false,
        error: error.message || "AI 分析失败",
      });
    }
    return;
  }

  if (requestPath === "/api/interview-score" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const provider = chooseProvider(body.provider);
      const result = provider === "deepseek" ? await callDeepSeekInterview(body) : await callOpenAIInterview(body);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        ok: false,
        error: error.message || "AI访谈评估失败",
      });
    }
    return;
  }

  if (requestPath === "/api/adult-analyze" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const provider = chooseProvider(body.provider);
      const result =
        provider === "deepseek" ? await callDeepSeekAdultAnalysis(body) : await callOpenAIAdultAnalysis(body);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        ok: false,
        error: error.message || "成人工作生活压力分析失败",
      });
    }
    return;
  }

  if (requestPath === "/api/adult-chat" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const provider = chooseProvider(body.provider);
      const result = provider === "deepseek" ? await callDeepSeekAdultChat(body) : await callOpenAIAdultChat(body);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        ok: false,
        error: error.message || "成人区 AI 聊天失败",
      });
    }
    return;
  }

  if (requestPath === "/api/chat" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const provider = chooseProvider(body.provider);
      const result = provider === "deepseek" ? await callDeepSeekChat(body) : await callOpenAIChat(body);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        ok: false,
        error: error.message || "AI 对话失败",
      });
    }
    return;
  }

  sendJson(response, 404, { ok: false, error: "接口不存在" });
}

function serveStatic(request, response) {
  const urlPath = decodeURIComponent((request.url || "/").split("?")[0]);
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = resolve(join(distDir, safePath));
  const targetPath = filePath.startsWith(distDir) && existsSync(filePath) ? filePath : join(distDir, "index.html");

  if (!existsSync(targetPath) || !statSync(targetPath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("请先运行 npm run build 生成 dist 目录。");
    return;
  }

  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(targetPath)] || "application/octet-stream",
  });
  createReadStream(targetPath).pipe(response);
}

const server = createServer((request, response) => {
  const requestPath = new URL(request.url || "/", "http://localhost").pathname;
  if (requestPath.startsWith("/api/")) {
    handleApi(request, response);
    return;
  }

  serveStatic(request, response);
});

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  server.listen(apiPort, apiHost, () => {
    console.log(`AI API server listening on http://${apiHost}:${apiPort}`);
  });
}
