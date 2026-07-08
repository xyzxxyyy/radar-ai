import React, { useMemo, useState } from "react";
import {
  Activity,
  BatteryMedium,
  BookOpenCheck,
  Brain,
  Briefcase,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Coffee,
  FileText,
  Globe,
  HeartHandshake,
  Home,
  ListChecks,
  MessageCircle,
  Moon,
  Radar,
  RotateCcw,
  SendHorizontal,
  ShieldAlert,
  Sparkles,
  Smartphone,
  Target,
  TrendingUp,
  Upload,
  Users,
  Workflow,
  X,
} from "lucide-react";

const historyData = [
  { day: "周一", pressure: 42, sleep: 7.5, completion: 86, note: "状态平稳" },
  { day: "周二", pressure: 58, sleep: 6.8, completion: 72, note: "复习增加" },
  { day: "周三", pressure: 64, sleep: 6.2, completion: 65, note: "睡眠偏少" },
  { day: "周四", pressure: 76, sleep: 5.7, completion: 54, note: "考试临近" },
  { day: "周五", pressure: 61, sleep: 7.1, completion: 78, note: "任务回落" },
  { day: "今天", pressure: 0, sleep: 0, completion: 0, note: "即时分析" },
];

const initialForm = {
  homeworkCount: 5,
  examStatus: "最近有考试",
  sleepHours: 7,
  mood: "有点烦躁",
  availableHours: 3,
  supportGoal: "先帮我排优先级",
  adviceStyle: "具体行动清单",
  extraNeed: "",
  taskDifficulty: "中等，有几题卡住",
  expectationPressure: "有一点期待",
  phoneDistraction: "偶尔会分心",
  bodyFatigue: "有点累",
  taskClarity: "大概知道怎么开始",
  delayedTask: "数学错题整理",
};

const initialAdultForm = {
  roleType: "职场人/上班族",
  workHours: 9,
  sleepHours: 6.5,
  taskLoad: "事情很多，经常被打断",
  deadlinePressure: "本周有重要截止",
  lifeLoad: "家务或家庭事务有一些",
  mood: "有点焦虑",
  supportNeed: "整理任务并制定计划",
  onlineTaskType: "写邮件/消息草稿",
  mainTask: "整理项目进度，回复客户邮件，安排本周重点任务",
  pastedContent: "",
  fileNotes: "",
};

const supportGoalProfiles = {
  "先帮我排优先级": {
    title: "优先级整理方案",
    summary: "先把任务从一团乱麻变成清晰顺序，再开始做第一件。",
    firstTag: "排序",
  },
  "缓解焦虑再开始": {
    title: "降压启动方案",
    summary: "先降低紧绷感，再用低门槛动作进入学习。",
    firstTag: "降压",
  },
  "解决拖延问题": {
    title: "拖延拆解方案",
    summary: "把最难开始的任务拆到足够小，让启动变得不吓人。",
    firstTag: "破冰",
  },
  "考前快速复习": {
    title: "考前冲刺方案",
    summary: "把时间集中到错题、高频题型和最容易提分的内容。",
    firstTag: "冲刺",
  },
  "安排今晚时间": {
    title: "今晚时间表",
    summary: "按可用时间切成学习段、缓冲段和收尾段。",
    firstTag: "时间表",
  },
};

const interviewQuestions = [
  {
    id: "currentFeeling",
    question: "如果用一句话描述你现在的状态，你会怎么说？",
    placeholder: "例如：有点慌，感觉事情很多但不知道从哪开始。",
  },
  {
    id: "mainWorry",
    question: "现在最让你担心的一件学习任务是什么？为什么？",
    placeholder: "例如：数学错题太多，怕明天考试还会错。",
  },
  {
    id: "controlSense",
    question: "你觉得自己能掌控今天的学习节奏吗？哪里最失控？",
    placeholder: "例如：能掌控一部分，但手机和拖延会打断我。",
  },
  {
    id: "bodySignal",
    question: "身体有没有发出疲劳信号？比如困、头痛、胃口差、坐不住。",
    placeholder: "例如：有点困，注意力只能维持二十分钟。",
  },
  {
    id: "supportNeed",
    question: "你希望 AI 或身边的人现在帮你做什么？",
    placeholder: "例如：帮我排优先级，或者提醒我休息。",
  },
];

const initialInterviewAnswers = interviewQuestions.reduce(
  (answers, item) => ({ ...answers, [item.id]: "" }),
  {},
);

const initialChatMessages = [
  {
    role: "assistant",
    content:
      "我在。你可以直接告诉我：现在最压着你的任务是什么？我会先帮你把它拆成一个能开始的计划。",
  },
];

const initialAdultChatMessages = [
  {
    role: "assistant",
    content:
      "我在。你可以把我当成一个能聊两句、也能一起干活的 AI 朋友。工作卡住、心里烦、资料太乱，都可以直接发给我；我会先接住情绪，再帮你拆任务、写草稿、排计划。",
  },
];

const textFileExtensions = [".txt", ".md", ".csv", ".json", ".log", ".html", ".xml"];

function isTextLikeFile(file) {
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith("text/") ||
    file.type.includes("json") ||
    file.type.includes("csv") ||
    textFileExtensions.some((extension) => name.endsWith(extension))
  );
}

function readFileAsText(file) {
  return new Promise((resolveRead, rejectRead) => {
    const reader = new FileReader();
    reader.onload = () => resolveRead(String(reader.result || ""));
    reader.onerror = () => rejectRead(new Error("文件读取失败"));
    reader.readAsText(file, "utf-8");
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolveRead, rejectRead) => {
    const reader = new FileReader();
    reader.onload = () => resolveRead(String(reader.result || ""));
    reader.onerror = () => rejectRead(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(size) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getOptionWeight(value, rules, fallback = 0) {
  return rules[value] ?? fallback;
}

function buildFlexiblePlan(form, context) {
  const goal = form.supportGoal || "先帮我排优先级";
  const profile = supportGoalProfiles[goal] || supportGoalProfiles["先帮我排优先级"];
  const firstTask = context.firstTask;
  const focusMinutes = context.focusMinutes;
  const hasExam = form.examStatus !== "暂无考试";
  const extraNeed = form.extraNeed?.trim();
  const shortStart = context.finalScore >= 75 || form.bodyFatigue === "困到学不进去" ? 6 : 10;

  const templates = {
    "先帮我排优先级": [
      {
        title: "列出全部任务并分三类",
        detail: "把任务分成必须今天完成、能推迟、只需启动三类，先从影响最大的任务开始。",
        minutes: 8,
        tag: "排序",
      },
      {
        title: `先处理：${firstTask}`,
        detail: "只做最小可交付版本，不追求一次做到完美。",
        minutes: focusMinutes,
        tag: "优先",
      },
      {
        title: hasExam ? "复习高频考点" : "完成第二优先级任务",
        detail: hasExam ? "只看错题、公式和老师强调内容，不做大范围泛读。" : "选择截止时间最近或最影响心情的一项推进。",
        minutes: Math.max(focusMinutes - 5, 20),
        tag: "重点",
      },
      {
        title: "收尾并记录明天第一步",
        detail: "把未完成任务写成明天的第一步，减少睡前反复惦记。",
        minutes: 12,
        tag: "收尾",
      },
    ],
    "缓解焦虑再开始": [
      {
        title: "先做身体降压",
        detail: "离开屏幕，喝水，做 5 次慢呼吸，把肩颈放松下来。",
        minutes: 5,
        tag: "降压",
      },
      {
        title: `只启动：${firstTask}`,
        detail: `只做 ${shortStart} 分钟，目标是开始，不是立刻完成。`,
        minutes: shortStart,
        tag: "启动",
      },
      {
        title: "进入一个短学习段",
        detail: "选择最清楚的一小块内容，计时结束就停下来复盘。",
        minutes: Math.min(focusMinutes, 30),
        tag: "稳住",
      },
      {
        title: "给大脑一个确定结尾",
        detail: "写下今天已经推进了什么，再决定是否继续下一段。",
        minutes: 8,
        tag: "确认",
      },
    ],
    "解决拖延问题": [
      {
        title: "把拖延任务拆成动作",
        detail: `把“${firstTask}”改写成打开资料、圈出题号、写第一行这类动作。`,
        minutes: 6,
        tag: "破冰",
      },
      {
        title: "完成最低版本",
        detail: "先完成一个粗糙版本或一小组题，暂时不修改细节。",
        minutes: Math.min(focusMinutes, 25),
        tag: "低门槛",
      },
      {
        title: "清除一个干扰源",
        detail: "把手机放远，桌面只留当前任务需要的材料。",
        minutes: 3,
        tag: "环境",
      },
      {
        title: "奖励一次继续",
        detail: "完成一段后允许短休息，再决定是否加做一段。",
        minutes: 8,
        tag: "奖励",
      },
    ],
    "考前快速复习": [
      {
        title: "圈出最容易提分的内容",
        detail: "优先错题、公式、老师强调题型，放弃低概率内容。",
        minutes: 8,
        tag: "筛选",
      },
      {
        title: "错题快速回看",
        detail: "每题只看错因和正确方法，不重新完整抄题。",
        minutes: Math.min(focusMinutes, 35),
        tag: "错题",
      },
      {
        title: "做一组短练习",
        detail: "选 3-5 道代表题检验手感，卡住就标记，不长时间纠缠。",
        minutes: 20,
        tag: "检验",
      },
      {
        title: "考前收心",
        detail: "整理考试用品和明天要看的最后一页，睡前不再开新内容。",
        minutes: 12,
        tag: "收心",
      },
    ],
    "安排今晚时间": [
      {
        title: "确定今晚总时长",
        detail: `你填写的可用学习时间约 ${form.availableHours} 小时，先预留 15 分钟缓冲。`,
        minutes: 5,
        tag: "时间",
      },
      {
        title: `第一段：${firstTask}`,
        detail: "第一段只安排最重要任务，避免一开始就切换太多内容。",
        minutes: focusMinutes,
        tag: "第一段",
      },
      {
        title: "第二段：复习或剩余作业",
        detail: hasExam ? "做考试相关内容，优先高频题型。" : "处理剩余作业里最容易完成的一项。",
        minutes: focusMinutes,
        tag: "第二段",
      },
      {
        title: "缓冲与收尾",
        detail: "留出缓冲，不把计划排满；最后整理明天第一步。",
        minutes: 15,
        tag: "缓冲",
      },
    ],
  };

  const plan = templates[goal] || templates["先帮我排优先级"];

  if (extraNeed) {
    return plan.map((item, index) =>
      index === 0
        ? {
            ...item,
            detail: `${item.detail} 你的补充需求是：${extraNeed}`,
          }
        : item,
    );
  }

  return plan.map((item, index) => (index === 0 ? { ...item, tag: profile.firstTag } : item));
}

function combineInterviewAnalysis(baseAnalysis, interviewResult) {
  if (!interviewResult?.score) {
    return {
      ...baseAnalysis,
      componentScores: {
        metric: baseAnalysis.score,
        interview: null,
        metricWeight: 100,
        interviewWeight: 0,
      },
    };
  }

  const interviewScore = clamp(Math.round(Number(interviewResult.score) || baseAnalysis.score), 0, 100);
  const finalScore = clamp(Math.round(baseAnalysis.score * 0.6 + interviewScore * 0.4), 0, 100);
  const level = getPressureLevel(finalScore);
  const interviewSignals = Array.isArray(interviewResult.signals) ? interviewResult.signals.slice(0, 3) : [];
  const interviewSource = {
    label: "AI访谈",
    weight: Math.round((interviewScore - baseAnalysis.score) * 0.4),
    detail: interviewResult.summary || "AI根据问答补充识别主观压力、掌控感和身体疲劳信号。",
  };
  const adjustedCompletion = clamp(
    Math.round(baseAnalysis.completionEstimate - Math.max(finalScore - baseAnalysis.score, 0) * 0.28),
    30,
    96,
  );
  const rest =
    finalScore >= 75
      ? "综合分偏高，建议学习 25-30 分钟就休息 8 分钟，并先减少今晚任务密度。"
      : finalScore >= 50
        ? "综合分处在中等区间，建议学习 35-40 分钟休息 7 分钟，先完成最小可执行步骤。"
        : "综合分较平稳，可以保持 45 分钟左右的学习段落，中间安排短休息。";

  return {
    ...baseAnalysis,
    score: finalScore,
    level: {
      ...level,
      summary: `综合压力值由指标评分 ${baseAnalysis.score} 和 AI 访谈评分 ${interviewScore} 合成。${level.summary}`,
    },
    sources: [interviewSource, ...baseAnalysis.sources].slice(0, 4),
    risk: interviewResult.risk || baseAnalysis.risk,
    encouragement: interviewResult.suggestion || baseAnalysis.encouragement,
    rest,
    completionEstimate: adjustedCompletion,
    reasonText: `指标 ${baseAnalysis.score} ×60% + AI访谈 ${interviewScore} ×40% = 综合 ${finalScore}`,
    interviewSummary: interviewResult.summary || "",
    interviewSignals,
    componentScores: {
      metric: baseAnalysis.score,
      interview: interviewScore,
      metricWeight: 60,
      interviewWeight: 40,
    },
  };
}

function mergeAiAnalysis(baseAnalysis, aiAnalysis) {
  if (!aiAnalysis) {
    return baseAnalysis;
  }

  const aiSources = Array.isArray(aiAnalysis.sources) ? aiAnalysis.sources : [];

  return {
    ...baseAnalysis,
    level: {
      ...baseAnalysis.level,
      summary: aiAnalysis.summary || baseAnalysis.level.summary,
    },
    sources: aiSources.length > 0 ? [...baseAnalysis.sources, ...aiSources].slice(0, 4) : baseAnalysis.sources,
    risk: aiAnalysis.risk || baseAnalysis.risk,
    procrastination: aiAnalysis.procrastination || baseAnalysis.procrastination,
    encouragement: aiAnalysis.encouragement || baseAnalysis.encouragement,
    plan: Array.isArray(aiAnalysis.plan) && aiAnalysis.plan.length > 0 ? aiAnalysis.plan : baseAnalysis.plan,
    strategyTitle: aiAnalysis.strategyTitle || baseAnalysis.strategyTitle,
    detailAdvice:
      Array.isArray(aiAnalysis.detailAdvice) && aiAnalysis.detailAdvice.length > 0
        ? aiAnalysis.detailAdvice.slice(0, 5)
        : baseAnalysis.detailAdvice,
    alternatives:
      Array.isArray(aiAnalysis.alternatives) && aiAnalysis.alternatives.length > 0
        ? aiAnalysis.alternatives.slice(0, 4)
        : baseAnalysis.alternatives,
    rest: aiAnalysis.rest || baseAnalysis.rest,
    reasonText: aiAnalysis.reasonText || baseAnalysis.reasonText,
  };
}

function getPressureLevel(score) {
  if (score >= 75) {
    return {
      label: "偏高",
      tone: "high",
      summary: "今天要先降任务密度，把最重要的一件事做出开头。",
    };
  }

  if (score >= 50) {
    return {
      label: "中等",
      tone: "medium",
      summary: "压力在可观察范围内，适合用清晰计划把任务拆小。",
    };
  }

  return {
    label: "平稳",
    tone: "low",
    summary: "学习状态比较稳定，可以稳步推进并预留复盘时间。",
  };
}

function analyzePressure(form) {
  const homework = Number(form.homeworkCount) || 0;
  const sleep = Number(form.sleepHours) || 0;
  const time = Number(form.availableHours) || 0;
  const delayedTask = form.delayedTask.trim() || "最想拖延的任务";

  const factors = [];
  let score = 20;

  if (sleep < 6) {
    score += 20;
    factors.push({
      label: "睡眠不足",
      weight: 20,
      detail: "昨晚睡眠少于 6 小时，专注力和耐心都更容易被消耗。",
    });
  } else if (sleep < 7) {
    score += 10;
    factors.push({
      label: "睡眠略少",
      weight: 10,
      detail: "睡眠接近临界值，今天适合减少熬夜式收尾。",
    });
  } else {
    factors.push({
      label: "睡眠支撑",
      weight: 0,
      detail: "睡眠时间基本够用，是今天保持稳定的基础。",
    });
  }

  if (homework > 5) {
    score += 20;
    factors.push({
      label: "作业较多",
      weight: 20,
      detail: "作业超过 5 项，大脑容易把今天判断成一整块难题。",
    });
  } else if (homework >= 4) {
    score += 10;
    factors.push({
      label: "作业适中偏多",
      weight: 10,
      detail: "作业数量不算失控，但需要先排优先级。",
    });
  } else {
    factors.push({
      label: "作业量可控",
      weight: 0,
      detail: "作业数量较轻，适合把质量和订正放在前面。",
    });
  }

  if (form.examStatus === "明天有考试") {
    score += 20;
    factors.push({
      label: "考试临近",
      weight: 20,
      detail: "明天有考试，复习目标需要更具体，避免泛泛翻书。",
    });
  } else if (form.examStatus === "最近有考试") {
    score += 15;
    factors.push({
      label: "近期考试",
      weight: 15,
      detail: "考试带来额外不确定感，需要把复习内容拆成小清单。",
    });
  } else if (form.examStatus === "刚考完") {
    score += 6;
    factors.push({
      label: "考后恢复",
      weight: 6,
      detail: "刚考完容易疲惫，今天可以做轻量复盘。",
    });
  } else {
    factors.push({
      label: "考试压力低",
      weight: 0,
      detail: "暂时没有考试，可以把节奏放回日常任务。",
    });
  }

  const moodWeights = {
    压力很大: 20,
    有点低落: 18,
    有点烦躁: 12,
    平静: 4,
    状态不错: 0,
  };
  const moodWeight = moodWeights[form.mood] ?? 8;
  score += moodWeight;
  factors.push({
    label: "情绪状态",
    weight: moodWeight,
    detail:
      moodWeight >= 18
        ? "今天的情绪能量偏低，计划需要更温和、更具体。"
        : moodWeight >= 10
          ? "轻微烦躁会放大拖延感，适合先做低门槛启动。"
          : "情绪状态较稳，可以用固定时间块推进任务。",
  });

  if (time < 2) {
    score += 15;
    factors.push({
      label: "时间偏紧",
      weight: 15,
      detail: "可用学习时间少于 2 小时，任务需要主动取舍。",
    });
  } else if (time < 3) {
    score += 8;
    factors.push({
      label: "时间略紧",
      weight: 8,
      detail: "可用时间不多，计划里要留出缓冲。",
    });
  } else {
    factors.push({
      label: "时间可安排",
      weight: 0,
      detail: "可用时间相对充足，适合分段完成任务。",
    });
  }

  if (delayedTask) {
    score += 5;
  }

  const difficultyWeight = getOptionWeight(
    form.taskDifficulty,
    {
      "比较轻松": 0,
      "中等，有几题卡住": 4,
      "很难，经常卡住": 9,
      "完全不知道怎么做": 13,
    },
    4,
  );
  score += difficultyWeight;
  factors.push({
    label: "任务难度",
    weight: difficultyWeight,
    detail:
      difficultyWeight >= 15
        ? "任务难度较高，容易让压力从“事情多”变成“无从下手”。"
        : difficultyWeight >= 8
          ? "任务有一定卡点，需要先拆出最容易开始的一小步。"
          : "任务难度可控，可以保持当前节奏推进。",
  });

  const expectationWeight = getOptionWeight(
    form.expectationPressure,
    {
      "几乎没有期待压力": 0,
      "有一点期待": 3,
      "老师或家长期待较高": 7,
      "很怕让别人失望": 11,
    },
    3,
  );
  score += expectationWeight;
  factors.push({
    label: "外部期待",
    weight: expectationWeight,
    detail:
      expectationWeight >= 12
        ? "来自老师、家长或成绩目标的期待较强，会放大出错和拖延带来的紧张感。"
        : expectationWeight > 0
          ? "有一定外部期待，但仍适合用清晰计划把压力落到行动上。"
          : "外部期待压力较低，可以更多按自己的节奏完成任务。",
  });

  const distractionWeight = getOptionWeight(
    form.phoneDistraction,
    {
      "基本不分心": 0,
      "偶尔会分心": 3,
      "经常被手机打断": 7,
      "很难离开手机": 10,
    },
    3,
  );
  score += distractionWeight;
  factors.push({
    label: "手机干扰",
    weight: distractionWeight,
    detail:
      distractionWeight >= 12
        ? "手机打断会让学习启动反复失败，建议先把手机放到看不见的位置。"
        : distractionWeight > 0
          ? "偶尔分心会消耗进入状态的时间，可以用计时器保护一个短学习段。"
          : "干扰较少，是保持专注的有利条件。",
  });

  const fatigueWeight = getOptionWeight(
    form.bodyFatigue,
    {
      "精力还可以": 0,
      "有点累": 4,
      "很疲惫": 9,
      "困到学不进去": 13,
    },
    4,
  );
  score += fatigueWeight;
  factors.push({
    label: "身体疲劳",
    weight: fatigueWeight,
    detail:
      fatigueWeight >= 14
        ? "身体疲劳明显，继续硬撑会降低效率，计划里需要更短的学习段和更多休息。"
        : fatigueWeight > 0
          ? "有轻度疲劳，适合先做低门槛任务，再进入重点内容。"
          : "精力状态尚可，可以安排较完整的学习段。",
  });

  const clarityWeight = getOptionWeight(
    form.taskClarity,
    {
      "非常清楚第一步": 0,
      "大概知道怎么开始": 2,
      "有点乱，不确定顺序": 7,
      "完全不知道先做什么": 11,
    },
    2,
  );
  score += clarityWeight;
  factors.push({
    label: "任务清晰度",
    weight: clarityWeight,
    detail:
      clarityWeight >= 12
        ? "任务顺序不清会直接增加焦虑，建议先只确定接下来 10 分钟做什么。"
        : clarityWeight > 0
          ? "第一步大致清楚，但还需要把任务边界写得更具体。"
          : "第一步很清晰，启动阻力会更小。",
  });

  const finalScore = clamp(Math.round(score), 0, 100);
  const level = getPressureLevel(finalScore);
  const mainSources = [...factors]
    .filter((factor) => factor.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const sources =
    mainSources.length > 0
      ? mainSources
      : factors.filter((factor) => factor.weight === 0).slice(0, 3);

  const risk =
    time < 2 && homework > 5
      ? "任务数量和可用时间不匹配，最容易出现越急越拖。"
      : sleep < 6
        ? "精力不足可能让简单任务也变得费劲，今晚要提前收尾。"
        : form.examStatus === "明天有考试"
          ? "复习范围过大时容易失去方向，建议只抓高频题型和错题。"
          : form.mood === "压力很大" || form.mood === "有点低落"
            ? "情绪能量偏低时不适合硬扛，计划要从小动作开始。"
            : "最大风险是任务边界不清，先明确第一步就会轻很多。";

  const procrastination =
    homework > 5 || form.examStatus !== "暂无考试"
      ? `${delayedTask} 容易被拖延，通常是因为它同时代表“重要”和“不好开始”。把它改成 10 分钟的小启动，比等到状态完美更有效。`
      : `${delayedTask} 的阻力可能来自第一步不够清楚。可以先写下要打开的资料、要订正的题号或要完成的第一句话。`;

  const encouragement =
    finalScore >= 75
      ? "今天不用赢过所有任务，先赢过最开始的 10 分钟。"
      : finalScore >= 50
        ? "你已经把压力说清楚了，接下来只需要按顺序完成一小段。"
        : "状态不错，保持稳定节奏就是很好的自我管理。";

  const firstTask = delayedTask;
  const focusMinutes = time >= 4 ? 45 : time >= 2 ? 35 : 25;
  const goalProfile = supportGoalProfiles[form.supportGoal] || supportGoalProfiles["先帮我排优先级"];
  const plan = buildFlexiblePlan(form, { finalScore, firstTask, focusMinutes });

  const rest =
    finalScore >= 75
      ? "学习 30 分钟休息 8 分钟，休息时离开书桌、喝水或伸展。"
      : finalScore >= 50
        ? "学习 40 分钟休息 7 分钟，用计时器保护重新开始的时间。"
        : "学习 45-50 分钟休息 5-8 分钟，保持轻稳节奏。";

  const completionEstimate = clamp(
    Math.round(92 - finalScore * 0.42 + Math.min(time, 5) * 4 - Math.max(homework - 4, 0) * 3),
    35,
    96,
  );
  const reasonText = sources
    .map((source) => `${source.label}${source.weight > 0 ? ` +${source.weight}` : ""}`)
    .join("、");

  return {
    score: finalScore,
    level,
    sources,
    risk,
    procrastination,
    encouragement,
    firstTask,
    plan,
    strategyTitle: goalProfile.title,
    detailAdvice: [
      goalProfile.summary,
      `建议风格：${form.adviceStyle || "具体行动清单"}。`,
      form.extraNeed?.trim() ? `已结合你的补充需求：${form.extraNeed.trim()}` : "如果需要更贴合，可以在补充需求里写明学科、截止时间或最卡住的地方。",
    ],
    alternatives: [
      finalScore >= 75 ? "如果开始后仍然很紧张，先把计划缩短到一个 15 分钟学习段。" : "如果状态比预期好，可以追加一个同类短学习段。",
      form.phoneDistraction === "基本不分心" ? "保持当前环境，不额外增加工具。" : "如果被手机打断，把手机放到房间另一侧，并只留计时器。",
    ],
    rest,
    completionEstimate,
    reasonText,
  };
}

function getAdultPressureLevel(score) {
  if (score >= 75) {
    return {
      label: "偏高",
      tone: "high",
      summary: "工作和生活压力已经明显挤在一起，今天要先减密度、排顺序、保护恢复时间。",
    };
  }

  if (score >= 50) {
    return {
      label: "中等",
      tone: "medium",
      summary: "压力处在可管理区间，但需要把任务边界写清楚，避免被打断和临时事项牵着走。",
    };
  }

  return {
    label: "平稳",
    tone: "low",
    summary: "当前压力相对可控，适合用清晰计划推进重点任务，同时保留生活缓冲。",
  };
}

function analyzeAdultPressure(form, files = []) {
  const workHours = Number(form.workHours) || 0;
  const sleepHours = Number(form.sleepHours) || 0;
  const firstTask = form.mainTask.trim() || "当前最重要的任务";
  const factors = [];
  let score = 22;

  if (workHours > 10) {
    score += 18;
    factors.push({
      label: "工作时长偏高",
      detail: "每天工作超过 10 小时，容易压缩休息、家庭和恢复时间。",
      weight: 18,
    });
  } else if (workHours > 8) {
    score += 9;
    factors.push({
      label: "工作时长略高",
      detail: "工作时间略长，建议把深度工作和碎片沟通分开安排。",
      weight: 9,
    });
  }

  if (sleepHours < 6) {
    score += 18;
    factors.push({
      label: "睡眠不足",
      detail: "睡眠少于 6 小时会明显影响判断力、耐心和抗压能力。",
      weight: 18,
    });
  } else if (sleepHours < 7) {
    score += 9;
    factors.push({
      label: "睡眠略少",
      detail: "睡眠接近临界值，今晚计划需要留出明确收尾时间。",
      weight: 9,
    });
  }

  const taskWeight = getOptionWeight(
    form.taskLoad,
    {
      "基本可控": 0,
      "事情较多但能安排": 8,
      "事情很多，经常被打断": 16,
      "已经堆积到不知道先做什么": 24,
    },
    8,
  );
  score += taskWeight;
  factors.push({
    label: "任务负荷",
    detail:
      taskWeight >= 16
        ? "任务数量和打断频率偏高，需要先做排序和取舍。"
        : taskWeight > 0
          ? "任务不少但仍可安排，适合用时间块推进。"
          : "任务负荷较稳，是保持节奏的有利条件。",
    weight: taskWeight,
  });

  const deadlineWeight = getOptionWeight(
    form.deadlinePressure,
    {
      "没有紧急截止": 0,
      "本周有重要截止": 12,
      "明天/今天就要交": 20,
      "多个截止撞在一起": 24,
    },
    12,
  );
  score += deadlineWeight;
  factors.push({
    label: "截止压力",
    detail:
      deadlineWeight >= 20
        ? "截止时间非常近，计划要先保交付，再补细节。"
        : deadlineWeight > 0
          ? "近期有重要节点，需要提前拆出今天的可交付成果。"
          : "截止压力较低，可以把计划排得更从容。",
    weight: deadlineWeight,
  });

  const lifeWeight = getOptionWeight(
    form.lifeLoad,
    {
      "生活事务比较轻": 0,
      "家务或家庭事务有一些": 7,
      "照顾家人/家庭责任较重": 14,
      "工作和生活都在同时催我": 20,
    },
    7,
  );
  score += lifeWeight;
  factors.push({
    label: "生活负荷",
    detail:
      lifeWeight >= 14
        ? "生活责任正在占用恢复空间，计划里需要主动预留家庭和休息缓冲。"
        : lifeWeight > 0
          ? "生活事务会消耗注意力，适合把工作任务收束得更明确。"
          : "生活负荷较轻，可以把恢复时间安排得更稳定。",
    weight: lifeWeight,
  });

  const moodWeight = getOptionWeight(
    form.mood,
    {
      "压力很大": 20,
      "有点焦虑": 12,
      "有点疲惫": 10,
      "还算平静": 4,
      "状态不错": 0,
    },
    8,
  );
  score += moodWeight;
  factors.push({
    label: "情绪状态",
    detail:
      moodWeight >= 18
        ? "情绪紧绷度较高，今天应先降低任务密度，再进入重点工作。"
        : moodWeight >= 10
          ? "焦虑或疲惫会放大任务阻力，建议先做 15 分钟启动块。"
          : "情绪状态较稳，适合按计划推进。",
    weight: moodWeight,
  });

  if (files.length > 0) {
    score += Math.min(files.length * 3, 9);
    factors.push({
      label: "资料待整理",
      detail: `已选择 ${files.length} 个文件，适合让 AI 先提取任务、风险和下一步。`,
      weight: Math.min(files.length * 3, 9),
    });
  }

  const finalScore = clamp(Math.round(score), 0, 100);
  const level = getAdultPressureLevel(finalScore);
  const pressureSources = factors
    .filter((factor) => factor.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  const focusMinutes = finalScore >= 75 ? 25 : finalScore >= 50 ? 35 : 45;

  return {
    summary: level.summary,
    pressureScore: finalScore,
    pressureLevel: level,
    pressureSources:
      pressureSources.length > 0
        ? pressureSources
        : [{ label: "整体可控", detail: "当前输入显示压力不高，重点是保持稳定节奏。", weight: 0 }],
    workLifeRisk:
      finalScore >= 75
        ? "最大风险是把工作、生活和情绪压力都堆到同一段时间里处理，导致效率下降和恢复不足。"
        : "主要风险是任务边界不清和临时打断，让原本可控的事情变得更分散。",
    plan: [
      {
        title: "收集并排序",
        detail: "把所有任务写成动词开头的动作，只保留今天必须推进的 3 件。",
        minutes: 10,
        tag: "排序",
      },
      {
        title: `先推进：${firstTask}`,
        detail: "先做最小可交付版本，不在第一轮追求完美。",
        minutes: focusMinutes,
        tag: "重点",
      },
      {
        title: "处理沟通与线上事项",
        detail: "集中回复邮件、消息或表单，避免零散打断深度工作。",
        minutes: 25,
        tag: "沟通",
      },
      {
        title: "收尾与生活缓冲",
        detail: "写下明天第一步，并给睡前留出不处理工作的缓冲时间。",
        minutes: 15,
        tag: "恢复",
      },
    ],
    taskDrafts: [
      {
        title: form.onlineTaskType || "线上任务草稿",
        content: "AI 深度分析后会根据你上传的资料和说明，生成可复制的邮件、消息、表格填写要点或任务清单。",
      },
    ],
    onlineTaskHelp: [
      "可以帮你整理资料重点、拆出待办、写邮件/消息草稿、生成会议纪要或表格填写思路。",
      "当前版本不会自动登录外部网站或替你提交内容，但会给出可复制草稿和操作步骤。",
    ],
    boundaries: "如果涉及合同、医疗、法律、财务或公司机密内容，请先自行核对或脱敏后再使用。",
    nextStep: "补充任务背景或上传资料后，点击 AI 深度分析，让模型生成更贴合的计划和草稿。",
  };
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="field">
      <span className="field-label">
        <Icon size={17} aria-hidden="true" />
        {label}
      </span>
      {children}
    </label>
  );
}

function ScoreRing({ score, tone }) {
  return (
    <div className={`score-ring ${tone}`} style={{ "--score": `${score * 3.6}deg` }}>
      <div className="score-core">
        <strong>{score}</strong>
        <span>0-100</span>
      </div>
    </div>
  );
}

function TrendChart({ data, currentScore, currentSleep, currentCompletion }) {
  const chartData = data.map((item) =>
    item.day === "今天"
      ? {
          ...item,
          pressure: currentScore,
          sleep: currentSleep,
          completion: currentCompletion,
        }
      : item,
  );
  const width = 620;
  const height = 230;
  const padding = 32;
  const xStep = (width - padding * 2) / Math.max(chartData.length - 1, 1);

  const toPoint = (value, index, max) => {
    const x = padding + index * xStep;
    const y = height - padding - (value / max) * (height - padding * 2);
    return { x, y };
  };

  const pressurePoints = chartData.map((item, index) => ({
    ...toPoint(item.pressure, index, 100),
    value: item.pressure,
  }));
  const sleepPoints = chartData.map((item, index) => ({
    ...toPoint(item.sleep, index, 10),
    value: item.sleep,
  }));

  const makePath = (points) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="trend-chart" aria-label="最近几天学习压力、睡眠和任务完成情况">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        {[25, 50, 75].map((line) => {
          const y = height - padding - (line / 100) * (height - padding * 2);

          return (
            <line
              className="grid-line"
              key={line}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
            />
          );
        })}
        <path className="pressure-line" d={makePath(pressurePoints)} />
        <path className="sleep-line" d={makePath(sleepPoints)} />
        {chartData.map((item, index) => {
          const pressurePoint = pressurePoints[index];
          const barHeight = (item.completion / 100) * 70;
          const barX = padding + index * xStep - 9;
          const barY = height - padding - barHeight;

          return (
            <g key={item.day}>
              <rect
                className="completion-bar"
                x={barX}
                y={barY}
                width="18"
                height={barHeight}
                rx="5"
              />
              <circle
                className={item.day === "今天" ? "pressure-dot current" : "pressure-dot"}
                cx={pressurePoint.x}
                cy={pressurePoint.y}
                r={item.day === "今天" ? 6 : 5}
              />
              <text className="day-label" x={padding + index * xStep} y={height - 8} textAnchor="middle">
                {item.day}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="chart-legend" aria-hidden="true">
        <span className="pressure-key">压力指数</span>
        <span className="sleep-key">睡眠时间</span>
        <span className="completion-key">任务完成</span>
      </div>

      <div className="history-table">
        {chartData.map((item) => (
          <div className="history-row" key={item.day}>
            <span>{item.day}</span>
            <strong>{item.pressure}</strong>
            <span>{item.sleep} 小时</span>
            <span>{item.completion}%</span>
            <small>{item.note}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [adultForm, setAdultForm] = useState(initialAdultForm);
  const [adultFiles, setAdultFiles] = useState([]);
  const [adultChatMessages, setAdultChatMessages] = useState(initialAdultChatMessages);
  const [adultChatInput, setAdultChatInput] = useState("");
  const [adultChatStatus, setAdultChatStatus] = useState("idle");
  const [adultChatError, setAdultChatError] = useState("");
  const [adultChatModel, setAdultChatModel] = useState("");
  const [provider, setProvider] = useState("openai");
  const [aiResult, setAiResult] = useState(null);
  const [aiStatus, setAiStatus] = useState("idle");
  const [aiError, setAiError] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [interviewAnswers, setInterviewAnswers] = useState(initialInterviewAnswers);
  const [interviewResult, setInterviewResult] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState("idle");
  const [interviewError, setInterviewError] = useState("");
  const [interviewModel, setInterviewModel] = useState("");
  const [chatMessages, setChatMessages] = useState(initialChatMessages);
  const [chatInput, setChatInput] = useState("");
  const [chatStatus, setChatStatus] = useState("idle");
  const [chatError, setChatError] = useState("");
  const [chatModel, setChatModel] = useState("");
  const localAnalysis = useMemo(() => analyzePressure(form), [form]);
  const interviewAnalysis = useMemo(
    () => combineInterviewAnalysis(localAnalysis, interviewResult),
    [localAnalysis, interviewResult],
  );
  const analysis = useMemo(() => mergeAiAnalysis(interviewAnalysis, aiResult), [interviewAnalysis, aiResult]);
  const localAdultAnalysis = useMemo(() => analyzeAdultPressure(adultForm, adultFiles), [adultForm, adultFiles]);
  const adultAnalysis = localAdultAnalysis;
  const adultPressureLevel = adultAnalysis.pressureLevel || getAdultPressureLevel(adultAnalysis.pressureScore || 0);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setAiResult(null);
    setAiError("");
    setAiModel("");
    setAiStatus("idle");
    setInterviewResult(null);
    setInterviewError("");
    setInterviewModel("");
    setInterviewStatus("idle");
  };

  const resetExample = () => {
    setForm(initialForm);
    setAiResult(null);
    setAiError("");
    setAiModel("");
    setAiStatus("idle");
    setInterviewAnswers(initialInterviewAnswers);
    setInterviewResult(null);
    setInterviewError("");
    setInterviewModel("");
    setInterviewStatus("idle");
  };

  const updateProvider = (value) => {
    setProvider(value);
    setAiResult(null);
    setAiError("");
    setAiModel("");
    setAiStatus("idle");
    setChatError("");
    setChatModel("");
    setInterviewError("");
    setInterviewModel("");
    setInterviewStatus((current) => (current === "loading" ? "idle" : current));
    setAdultChatError("");
    setAdultChatModel("");
    setAdultChatStatus((current) => (current === "loading" ? "idle" : current));
  };

  const updateAdultField = (field, value) => {
    setAdultForm((current) => ({ ...current, [field]: value }));
  };

  const resetAdultExample = () => {
    setAdultForm(initialAdultForm);
    setAdultFiles([]);
    setAdultChatMessages(initialAdultChatMessages);
    setAdultChatInput("");
    setAdultChatError("");
    setAdultChatModel("");
    setAdultChatStatus("idle");
  };

  const handleAdultFiles = async (event) => {
    const selectedFiles = Array.from(event.target.files || []).slice(0, 6);
    if (selectedFiles.length === 0) {
      return;
    }

    const parsedFiles = await Promise.all(
      selectedFiles.map(async (file) => {
        const baseFile = {
          id: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          type: file.type || "未知类型",
          size: file.size,
          sizeLabel: formatFileSize(file.size),
          kind: file.type.startsWith("image/") ? "image" : isTextLikeFile(file) ? "text" : "file",
          content: "",
          preview: "",
          notice: "",
        };

        if (isTextLikeFile(file) && file.size <= 800 * 1024) {
          try {
            return {
              ...baseFile,
              content: (await readFileAsText(file)).slice(0, 6000),
              notice: "已读取文本内容，AI 会结合文件内容分析。",
            };
          } catch {
            return { ...baseFile, notice: "文件读取失败，请在补充说明里写出关键内容。" };
          }
        }

        if (file.type.startsWith("image/") && file.size <= 2 * 1024 * 1024) {
          try {
            return {
              ...baseFile,
              preview: await readFileAsDataUrl(file),
              notice: "已生成图片预览。请在图片说明里写出截图中的关键任务或文字，AI 会结合说明分析。",
            };
          } catch {
            return { ...baseFile, notice: "图片预览失败，请在补充说明里写出关键内容。" };
          }
        }

        return {
          ...baseFile,
          notice: isTextLikeFile(file)
            ? "文件较大，暂只发送文件信息。建议把关键内容粘贴到文本框。"
            : "暂只发送文件信息。图片、PDF、Word 等资料建议在补充说明里概括关键内容。",
        };
      }),
    );

    setAdultFiles((current) => [...current, ...parsedFiles].slice(0, 8));
    event.target.value = "";
  };

  const removeAdultFile = (id) => {
    setAdultFiles((current) => current.filter((file) => file.id !== id));
    setAdultChatError("");
    setAdultChatModel("");
    setAdultChatStatus("idle");
  };

  const updateInterviewAnswer = (id, value) => {
    setInterviewAnswers((current) => ({ ...current, [id]: value }));
    setInterviewResult(null);
    setInterviewError("");
    setInterviewModel("");
    setInterviewStatus("idle");
    setAiResult(null);
    setAiError("");
    setAiModel("");
    setAiStatus("idle");
  };

  const runInterviewScore = async () => {
    const answeredCount = interviewQuestions.filter((item) => interviewAnswers[item.id]?.trim()).length;
    if (answeredCount < 2 || interviewStatus === "loading") {
      setInterviewStatus("error");
      setInterviewError("请至少回答 2 个 AI 访谈问题，再生成访谈压力值。");
      return;
    }

    setInterviewStatus("loading");
    setInterviewError("");

    try {
      const response = await fetch("/api/interview-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          form,
          localAnalysis,
          questions: interviewQuestions,
          answers: interviewAnswers,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "AI访谈评估失败");
      }

      setInterviewResult(data.interview);
      setInterviewModel(data.model || "");
      setInterviewStatus("done");
      setAiResult(null);
      setAiStatus("idle");
    } catch (error) {
      setInterviewError(error.message || "AI访谈评估失败");
      setInterviewStatus("error");
    }
  };

  const runAiAnalysis = async () => {
    setAiStatus("loading");
    setAiError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          form,
          localAnalysis: analysis,
          interviewResult,
          request: "请基于指标评分、AI访谈结果和综合压力值，生成更自然、更个性化的学习压力分析和今日计划。",
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "真实 AI 分析失败");
      }

      setAiResult(data.analysis);
      setAiModel(data.model || "");
      setAiStatus("done");
    } catch (error) {
      setAiError(error.message || "真实 AI 分析失败");
      setAiStatus("error");
    }
  };

  const sendAdultChatMessage = async () => {
    const text = adultChatInput.trim();
    if ((!text && adultFiles.length === 0) || adultChatStatus === "loading") {
      return;
    }

    const attachmentText =
      adultFiles.length > 0
        ? `\n\n附件：${adultFiles.map((file) => `${file.name}（${file.kind}，${file.sizeLabel}）`).join("、")}`
        : "";
    const displayContent = `${text || "请帮我分析这些附件，并告诉我下一步该怎么做。"}${attachmentText}`;
    const nextMessages = [...adultChatMessages, { role: "user", content: displayContent }];
    setAdultChatMessages(nextMessages);
    setAdultChatInput("");
    setAdultChatStatus("loading");
    setAdultChatError("");

    try {
      const response = await fetch("/api/adult-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          messages: nextMessages,
          form: adultForm,
          files: adultFiles.map(({ preview, ...file }) => file),
          localAnalysis: localAdultAnalysis,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "成人区 AI 聊天失败");
      }

      setAdultChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply || "我在。我们先把事情拆小一点，找一个现在能开始的动作。",
        },
      ]);
      setAdultChatModel(data.model || "");
      setAdultChatStatus("done");
    } catch (error) {
      setAdultChatError(error.message || "成人区 AI 聊天失败");
      setAdultChatStatus("error");
    }
  };

  const resetAdultChat = () => {
    setAdultChatMessages(initialAdultChatMessages);
    setAdultChatInput("");
    setAdultChatStatus("idle");
    setAdultChatError("");
    setAdultChatModel("");
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatStatus === "loading") {
      return;
    }

    const nextMessages = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatStatus("loading");
    setChatError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          messages: nextMessages,
          context: {
            form,
            pressureScore: analysis.score,
            pressureLevel: analysis.level.label,
            pressureSources: analysis.sources,
            firstTask: analysis.firstTask,
            currentPlan: analysis.plan,
            restSuggestion: analysis.rest,
          },
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "AI 对话失败");
      }

      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply || "我收到了。我们先把最重要的一步写下来，再决定下一步。",
        },
      ]);
      setChatModel(data.model || "");
      setChatStatus("done");
    } catch (error) {
      setChatError(error.message || "AI 对话失败");
      setChatStatus("error");
    }
  };

  const resetChat = () => {
    setChatMessages(initialChatMessages);
    setChatInput("");
    setChatStatus("idle");
    setChatError("");
    setChatModel("");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#adult" aria-label="压力雷达首页">
          <span className="brand-mark">
            <Radar size={21} aria-hidden="true" />
          </span>
          <span>
            压力雷达
            <small>AI 压力缓解与任务规划助手</small>
          </span>
        </a>

        <nav className="module-nav" aria-label="页面模块">
          <a href="#adult">成人工作生活区</a>
          <a href="#input">青少年学习区</a>
          <a href="#analysis">学习分析</a>
          <a href="#plan">学习计划</a>
          <a href="#coach">陪伴对话</a>
          <a href="#history">历史图表</a>
        </nav>
      </header>

      <section className="intro-strip" aria-label="作品定位">
        <div>
          <h1>压力雷达：面向更多人群的 AI 压力缓解与任务规划助手</h1>
          <p>
            无论是成年人面对工作、家庭和线上任务，还是青少年面对作业、考试和学习焦虑，都可以在这里获得压力观察、任务拆解和可执行计划。
          </p>
        </div>
        <div className="position-tags" aria-label="定位标签">
          <span>成人工作生活</span>
          <span>青少年学习压力</span>
          <span>AI 任务协助</span>
        </div>
      </section>

      <section id="adult" className="adult-section" aria-label="成人工作生活 AI 分区">
        <aside className="panel adult-context-panel" aria-label="成人压力状态与任务背景">
          <div className="section-heading">
            <span>
              <Briefcase size={18} aria-hidden="true" />
              成人工作生活区
            </span>
            <button className="ghost-button" type="button" onClick={resetAdultExample}>
              <RotateCcw size={16} aria-hidden="true" />
              示例
            </button>
          </div>

          <div className="adult-mini-score">
            <ScoreRing score={adultAnalysis.pressureScore || 0} tone={adultPressureLevel.tone} />
            <div>
              <strong>{adultPressureLevel.label}</strong>
              <p>{adultAnalysis.summary}</p>
            </div>
          </div>

          <form className="adult-context-form" aria-label="成人任务背景表单" onSubmit={(event) => event.preventDefault()}>
            <div className="adult-context-grid">
              <Field label="当前身份/场景" icon={Briefcase}>
                <select value={adultForm.roleType} onChange={(event) => updateAdultField("roleType", event.target.value)}>
                  <option>职场人/上班族</option>
                  <option>自由职业者/创业者</option>
                  <option>家庭照顾者</option>
                  <option>求职/转型期</option>
                  <option>其他成年人</option>
                </select>
              </Field>

              <Field label="当前情绪" icon={Brain}>
                <select value={adultForm.mood} onChange={(event) => updateAdultField("mood", event.target.value)}>
                  <option>压力很大</option>
                  <option>有点焦虑</option>
                  <option>有点疲惫</option>
                  <option>还算平静</option>
                  <option>状态不错</option>
                </select>
              </Field>

              <Field label="今天工作约几小时" icon={Clock3}>
                <input
                  type="number"
                  min="0"
                  max="16"
                  step="0.5"
                  value={adultForm.workHours}
                  onChange={(event) => updateAdultField("workHours", event.target.value)}
                />
              </Field>

              <Field label="昨晚睡了几小时" icon={Moon}>
                <input
                  type="number"
                  min="3"
                  max="11"
                  step="0.5"
                  value={adultForm.sleepHours}
                  onChange={(event) => updateAdultField("sleepHours", event.target.value)}
                />
              </Field>

              <Field label="任务负荷" icon={ClipboardList}>
                <select value={adultForm.taskLoad} onChange={(event) => updateAdultField("taskLoad", event.target.value)}>
                  <option>基本可控</option>
                  <option>事情较多但能安排</option>
                  <option>事情很多，经常被打断</option>
                  <option>已经堆积到不知道先做什么</option>
                </select>
              </Field>

              <Field label="截止日期压力" icon={CalendarCheck2}>
                <select
                  value={adultForm.deadlinePressure}
                  onChange={(event) => updateAdultField("deadlinePressure", event.target.value)}
                >
                  <option>没有紧急截止</option>
                  <option>本周有重要截止</option>
                  <option>明天/今天就要交</option>
                  <option>多个截止撞在一起</option>
                </select>
              </Field>

              <Field label="生活事务负荷" icon={Home}>
                <select value={adultForm.lifeLoad} onChange={(event) => updateAdultField("lifeLoad", event.target.value)}>
                  <option>生活事务比较轻</option>
                  <option>家务或家庭事务有一些</option>
                  <option>照顾家人/家庭责任较重</option>
                  <option>工作和生活都在同时催我</option>
                </select>
              </Field>

              <Field label="希望 AI 帮什么" icon={Workflow}>
                <select value={adultForm.supportNeed} onChange={(event) => updateAdultField("supportNeed", event.target.value)}>
                  <option>整理任务并制定计划</option>
                  <option>缓解压力后再开始</option>
                  <option>帮我处理线上任务</option>
                  <option>分析文件并提取待办</option>
                  <option>工作生活平衡建议</option>
                </select>
              </Field>
            </div>

            <Field label="线上任务类型" icon={Globe}>
              <select
                value={adultForm.onlineTaskType}
                onChange={(event) => updateAdultField("onlineTaskType", event.target.value)}
              >
                <option>写邮件/消息草稿</option>
                <option>整理会议纪要</option>
                <option>拆解项目任务</option>
                <option>填写表格/申请材料思路</option>
                <option>生成汇报/总结提纲</option>
              </select>
            </Field>

            <label className="field">
              <span className="field-label">
                <Target size={17} aria-hidden="true" />
                当前最压着你的任务
              </span>
              <textarea
                rows="4"
                value={adultForm.mainTask}
                onChange={(event) => updateAdultField("mainTask", event.target.value)}
                placeholder="例如：要交周报、客户催邮件、还要处理家里的事情。"
              />
            </label>
          </form>

          <div className="adult-context-list" aria-label="压力来源概览">
            {(adultAnalysis.pressureSources || []).slice(0, 3).map((source) => (
              <div key={source.label}>
                <strong>{source.label}</strong>
                <span>{source.detail}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="panel adult-chat-panel" aria-label="成人 AI 聊天窗口">
          <div className="section-heading adult-chat-heading">
            <span>
              <MessageCircle size={18} aria-hidden="true" />
              成人 AI 朋友与任务助手
            </span>
            <div className="analysis-actions">
              <label className="provider-select">
                <span>AI 服务</span>
                <select
                  value={provider}
                  onChange={(event) => updateProvider(event.target.value)}
                  disabled={adultChatStatus === "loading"}
                >
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </label>
              <button className="ghost-button" type="button" onClick={resetAdultChat}>
                <RotateCcw size={16} aria-hidden="true" />
                重置对话
              </button>
            </div>
          </div>

          <div className={`ai-status ${adultChatStatus}`} role="status">
            {adultChatStatus === "idle" && "可以直接发任务、发情绪、发资料；AI 会结合左侧状态和附件一起回应。"}
            {adultChatStatus === "loading" && `正在连接 ${provider === "deepseek" ? "DeepSeek" : "OpenAI"} 成人区聊天助手。`}
            {adultChatStatus === "done" &&
              `已由 ${provider === "deepseek" ? "DeepSeek" : "OpenAI"} 回复${adultChatModel ? `：${adultChatModel}` : ""}`}
            {adultChatStatus === "error" && `成人区 AI 暂不可用：${adultChatError}`}
          </div>

          <div className="chat-box adult-chat-box" aria-label="成人 AI 对话">
            <div className="chat-messages adult-chat-messages">
              {adultChatMessages.map((message, index) => (
                <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                  <span>{message.role === "assistant" ? "AI 朋友" : "我"}</span>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>

            <div className="quick-prompts" aria-label="成人区快捷提问">
              {[
                "我现在有点撑不住，先陪我缓一下",
                "帮我把今天任务排优先级",
                "根据附件提取待办并排计划",
                "帮我写一版邮件/消息草稿",
              ].map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => setAdultChatInput(prompt)}
                  disabled={adultChatStatus === "loading"}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="adult-attachments">
              <div className="adult-attachment-tools">
                <label className="attachment-button">
                  <Upload size={16} aria-hidden="true" />
                  <span>上传文件/图片</span>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md,.csv,.json,.log,.html,.xml,image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleAdultFiles}
                  />
                </label>
                <span>{adultFiles.length > 0 ? `${adultFiles.length} 个附件` : "暂无附件"}</span>
              </div>

              {adultFiles.length > 0 && (
                <div className="uploaded-files adult-uploaded-files" aria-label="已选择文件">
                  {adultFiles.map((file) => (
                    <article className="uploaded-file" key={file.id}>
                      {file.preview ? <img src={file.preview} alt={file.name} /> : <FileText size={20} aria-hidden="true" />}
                      <div>
                        <strong>{file.name}</strong>
                        <span>
                          {file.type} · {file.sizeLabel}
                        </span>
                        <small>{file.notice}</small>
                      </div>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => removeAdultFile(file.id)}
                        aria-label={`移除 ${file.name}`}
                        title="移除附件"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
              )}

              <div className="adult-material-grid">
                <label className="field">
                  <span className="field-label">
                    <FileText size={17} aria-hidden="true" />
                    粘贴资料文字
                  </span>
                  <textarea
                    rows="3"
                    value={adultForm.pastedContent}
                    onChange={(event) => updateAdultField("pastedContent", event.target.value)}
                    placeholder="邮件、会议记录、待办清单、截图里的文字等。"
                  />
                </label>

                <label className="field">
                  <span className="field-label">
                    <Upload size={17} aria-hidden="true" />
                    附件补充说明
                  </span>
                  <textarea
                    rows="3"
                    value={adultForm.fileNotes}
                    onChange={(event) => updateAdultField("fileNotes", event.target.value)}
                    placeholder="截图、PDF 或表格里的截止时间、要求、客户诉求。"
                  />
                </label>
              </div>
            </div>

            <form
              className="chat-input-row adult-chat-input"
              onSubmit={(event) => {
                event.preventDefault();
                sendAdultChatMessage();
              }}
            >
              <textarea
                value={adultChatInput}
                onChange={(event) => setAdultChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendAdultChatMessage();
                  }
                }}
                placeholder="和 AI 说说你现在的压力、要处理的任务，或者让它根据附件开始整理。"
                rows="3"
              />
              <button
                className="ai-button"
                type="submit"
                disabled={adultChatStatus === "loading" || (!adultChatInput.trim() && adultFiles.length === 0)}
              >
                <SendHorizontal size={16} aria-hidden="true" />
                发送
              </button>
            </form>
          </div>
        </section>
      </section>

      <section className="workspace">
        <form
          id="input"
          className="panel input-panel"
          aria-label="学习状态输入表单"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="section-heading">
            <span>
              <BookOpenCheck size={18} aria-hidden="true" />
              首页/输入页
            </span>
            <button className="ghost-button" type="button" onClick={resetExample}>
              <RotateCcw size={16} aria-hidden="true" />
              示例
            </button>
          </div>

          <div className="field-grid">
            <Field label="今天有几项作业" icon={ListChecks}>
              <input
                type="number"
                min="0"
                max="12"
                value={form.homeworkCount}
                onChange={(event) => updateField("homeworkCount", event.target.value)}
              />
            </Field>

            <Field label="最近有没有考试" icon={CalendarCheck2}>
              <select
                value={form.examStatus}
                onChange={(event) => updateField("examStatus", event.target.value)}
              >
                <option>暂无考试</option>
                <option>最近有考试</option>
                <option>明天有考试</option>
                <option>刚考完</option>
              </select>
            </Field>

            <Field label="昨晚睡了几小时" icon={Moon}>
              <input
                type="number"
                min="3"
                max="11"
                step="0.5"
                value={form.sleepHours}
                onChange={(event) => updateField("sleepHours", event.target.value)}
              />
            </Field>

            <Field label="今天心情如何" icon={Brain}>
              <select value={form.mood} onChange={(event) => updateField("mood", event.target.value)}>
                <option>压力很大</option>
                <option>有点低落</option>
                <option>有点烦躁</option>
                <option>平静</option>
                <option>状态不错</option>
              </select>
            </Field>

            <Field label="可用学习时间" icon={Clock3}>
              <input
                type="number"
                min="0.5"
                max="8"
                step="0.5"
                value={form.availableHours}
                onChange={(event) => updateField("availableHours", event.target.value)}
              />
            </Field>

            <Field label="现在最需要哪类帮助" icon={HeartHandshake}>
              <select value={form.supportGoal} onChange={(event) => updateField("supportGoal", event.target.value)}>
                <option>先帮我排优先级</option>
                <option>缓解焦虑再开始</option>
                <option>解决拖延问题</option>
                <option>考前快速复习</option>
                <option>安排今晚时间</option>
              </select>
            </Field>

            <Field label="建议呈现方式" icon={Sparkles}>
              <select value={form.adviceStyle} onChange={(event) => updateField("adviceStyle", event.target.value)}>
                <option>具体行动清单</option>
                <option>温柔鼓励型</option>
                <option>严格时间表</option>
                <option>考前冲刺型</option>
                <option>拖延急救型</option>
              </select>
            </Field>

            <Field label="任务难度" icon={Target}>
              <select
                value={form.taskDifficulty}
                onChange={(event) => updateField("taskDifficulty", event.target.value)}
              >
                <option>比较轻松</option>
                <option>中等，有几题卡住</option>
                <option>很难，经常卡住</option>
                <option>完全不知道怎么做</option>
              </select>
            </Field>

            <Field label="外部期待压力" icon={Users}>
              <select
                value={form.expectationPressure}
                onChange={(event) => updateField("expectationPressure", event.target.value)}
              >
                <option>几乎没有期待压力</option>
                <option>有一点期待</option>
                <option>老师或家长期待较高</option>
                <option>很怕让别人失望</option>
              </select>
            </Field>

            <Field label="手机干扰程度" icon={Smartphone}>
              <select
                value={form.phoneDistraction}
                onChange={(event) => updateField("phoneDistraction", event.target.value)}
              >
                <option>基本不分心</option>
                <option>偶尔会分心</option>
                <option>经常被手机打断</option>
                <option>很难离开手机</option>
              </select>
            </Field>

            <Field label="身体疲劳程度" icon={Activity}>
              <select value={form.bodyFatigue} onChange={(event) => updateField("bodyFatigue", event.target.value)}>
                <option>精力还可以</option>
                <option>有点累</option>
                <option>很疲惫</option>
                <option>困到学不进去</option>
              </select>
            </Field>

            <Field label="任务清晰度" icon={ListChecks}>
              <select value={form.taskClarity} onChange={(event) => updateField("taskClarity", event.target.value)}>
                <option>非常清楚第一步</option>
                <option>大概知道怎么开始</option>
                <option>有点乱，不确定顺序</option>
                <option>完全不知道先做什么</option>
              </select>
            </Field>

            <Field label="最想拖延的任务" icon={BatteryMedium}>
              <input
                type="text"
                value={form.delayedTask}
                onChange={(event) => updateField("delayedTask", event.target.value)}
                placeholder="例如：英语作文、物理错题"
              />
            </Field>

            <label className="field field-wide">
              <span className="field-label">
                <MessageCircle size={17} aria-hidden="true" />
                补充说明
              </span>
              <textarea
                rows="3"
                value={form.extraNeed}
                onChange={(event) => updateField("extraNeed", event.target.value)}
                placeholder="例如：我只有 90 分钟、数学最卡、希望先让我冷静下来再开始。"
              />
            </label>
          </div>
        </form>

        <section className="panel interview-panel" aria-label="AI压力访谈">
          <div className="section-heading">
            <span>
              <MessageCircle size={18} aria-hidden="true" />
              AI压力访谈
            </span>
            <div className="analysis-actions">
              <button
                className="ai-button"
                type="button"
                onClick={runInterviewScore}
                disabled={interviewStatus === "loading"}
              >
                <Sparkles size={16} aria-hidden="true" />
                {interviewStatus === "loading" ? "评估中" : "生成访谈压力值"}
              </button>
            </div>
          </div>

          <div className={`ai-status ${interviewStatus}`} role="status">
            {interviewStatus === "idle" && "先回答下方问题，AI会根据你的主观感受生成一个访谈压力值，再和指标评分融合。"}
            {interviewStatus === "loading" && `正在连接 ${provider === "deepseek" ? "DeepSeek" : "OpenAI"} 评估访谈回答。`}
            {interviewStatus === "done" &&
              `AI访谈压力值已生成${interviewModel ? `：${interviewModel}` : ""}，综合分已自动更新。`}
            {interviewStatus === "error" && `AI访谈暂不可用：${interviewError}`}
          </div>

          <div className="interview-grid">
            {interviewQuestions.map((item, index) => (
              <label className="interview-question" key={item.id}>
                <span>
                  <strong>{index + 1}</strong>
                  {item.question}
                </span>
                <textarea
                  rows="3"
                  value={interviewAnswers[item.id]}
                  onChange={(event) => updateInterviewAnswer(item.id, event.target.value)}
                  placeholder={item.placeholder}
                />
              </label>
            ))}
          </div>

          {interviewResult && (
            <div className="interview-result">
              <div>
                <span>访谈压力值</span>
                <strong>{analysis.componentScores?.interview ?? interviewResult.score}</strong>
              </div>
              <p>{interviewResult.summary}</p>
              {analysis.interviewSignals?.length > 0 && (
                <ul>
                  {analysis.interviewSignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <article id="analysis" className={`panel analysis-panel ${analysis.level.tone}`}>
          <div className="section-heading">
            <span>
              <Sparkles size={18} aria-hidden="true" />
              AI 分析页
            </span>
            <div className="analysis-actions">
              <label className="provider-select">
                <span>AI 服务</span>
                <select
                  value={provider}
                  onChange={(event) => updateProvider(event.target.value)}
                  disabled={aiStatus === "loading"}
                >
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </label>
              <button
                className="ai-button"
                type="button"
                onClick={runAiAnalysis}
                disabled={aiStatus === "loading"}
              >
                <Sparkles size={16} aria-hidden="true" />
                {aiStatus === "loading" ? "分析中" : `用 ${provider === "deepseek" ? "DeepSeek" : "OpenAI"} 分析`}
              </button>
              <strong className="level-pill">{analysis.level.label}</strong>
            </div>
          </div>

          <div className={`ai-status ${aiStatus}`} role="status">
            {aiStatus === "done" &&
              `已使用 ${provider === "deepseek" ? "DeepSeek" : "OpenAI"} 生成建议${aiModel ? `：${aiModel}` : ""}`}
            {aiStatus === "loading" && `正在连接 ${provider === "deepseek" ? "DeepSeek" : "OpenAI"}，请稍等几秒。`}
            {aiStatus === "error" && `真实 AI 暂不可用：${aiError}`}
            {aiStatus === "idle" &&
              `当前显示本地即时分析；可选择 OpenAI 或 DeepSeek 生成更个性化建议。`}
          </div>

          <div className="score-row">
            <ScoreRing score={analysis.score} tone={analysis.level.tone} />
            <div>
              <h2>学习压力指数</h2>
              <p>{analysis.level.summary}</p>
              <div className="score-breakdown" aria-label="压力值组成">
                <span>
                  指标分
                  <strong>{analysis.componentScores?.metric ?? localAnalysis.score}</strong>
                </span>
                <span>
                  AI访谈分
                  <strong>{analysis.componentScores?.interview ?? "未评估"}</strong>
                </span>
                <span>
                  综合分
                  <strong>{analysis.score}</strong>
                </span>
              </div>
              <p className="reason-line">分析依据：{analysis.reasonText}</p>
            </div>
          </div>

          <div className="analysis-section">
            <h3>主要压力来源</h3>
            <ul>
              {analysis.sources.map((source) => (
                <li key={source.label}>
                  <strong>{source.label}</strong>
                  <span>{source.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="risk-grid">
            <section>
              <h3>
                <ShieldAlert size={16} aria-hidden="true" />
                当前最大风险
              </h3>
              <p>{analysis.risk}</p>
            </section>
            <section>
              <h3>
                <HeartHandshake size={16} aria-hidden="true" />
                一句鼓励建议
              </h3>
              <p>{analysis.encouragement}</p>
            </section>
          </div>

          <div className="analysis-section">
            <h3>拖延原因分析</h3>
            <p>{analysis.procrastination}</p>
          </div>

          <div className="analysis-section advice-section">
            <h3>{analysis.strategyTitle || "个性化策略建议"}</h3>
            <div className="advice-grid">
              {(analysis.detailAdvice || []).map((item) => (
                <article key={item}>
                  <strong>建议</strong>
                  <p>{item}</p>
                </article>
              ))}
            </div>
            {analysis.alternatives?.length > 0 && (
              <div className="fallback-box">
                <strong>如果计划执行不顺</strong>
                <ul>
                  {analysis.alternatives.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </article>
      </section>

      <section id="plan" className="panel plan-panel">
        <div className="section-heading">
          <span>
            <CheckCircle2 size={18} aria-hidden="true" />
            计划生成页
          </span>
          <small>最先做：{analysis.firstTask}</small>
        </div>

        <ol className="plan-list">
          {analysis.plan.map((item, index) => (
            <li key={item.title}>
              <span className="step-index">{index + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <time>{item.minutes} 分钟</time>
              <span className="task-tag">{item.tag}</span>
            </li>
          ))}
        </ol>

        <div className="rest-note">
          <Coffee size={19} aria-hidden="true" />
          <span>{analysis.rest}</span>
        </div>
      </section>

      <section id="coach" className="panel coach-panel">
        <div className="section-heading">
          <span>
            <MessageCircle size={18} aria-hidden="true" />
            AI 陪伴计划区
          </span>
          <div className="analysis-actions">
            <label className="provider-select">
              <span>AI 服务</span>
              <select
                value={provider}
                onChange={(event) => updateProvider(event.target.value)}
                disabled={chatStatus === "loading"}
              >
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </label>
            <button className="ghost-button" type="button" onClick={resetChat}>
              <RotateCcw size={16} aria-hidden="true" />
              重置对话
            </button>
          </div>
        </div>

        <div className={`ai-status ${chatStatus}`} role="status">
          {chatStatus === "idle" && "可以聊压力、任务、拖延，也可以让 AI 帮你把今天拆成一个可执行计划。"}
          {chatStatus === "loading" && `正在连接 ${provider === "deepseek" ? "DeepSeek" : "OpenAI"} 对话助手。`}
          {chatStatus === "done" &&
            `已由 ${provider === "deepseek" ? "DeepSeek" : "OpenAI"} 回复${chatModel ? `：${chatModel}` : ""}`}
          {chatStatus === "error" && `AI 对话暂不可用：${chatError}`}
        </div>

        <div className="coach-grid">
          <div className="coach-context">
            <h3>当前上下文</h3>
            <dl>
              <div>
                <dt>压力指数</dt>
                <dd>
                  {analysis.score} / {analysis.level.label}
                </dd>
              </div>
              <div>
                <dt>最先处理</dt>
                <dd>{analysis.firstTask}</dd>
              </div>
              <div>
                <dt>休息建议</dt>
                <dd>{analysis.rest}</dd>
              </div>
            </dl>
          </div>

          <div className="chat-box" aria-label="AI 陪伴对话">
            <div className="chat-messages">
              {chatMessages.map((message, index) => (
                <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                  <span>{message.role === "assistant" ? "AI 教练" : "我"}</span>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>

            <div className="quick-prompts" aria-label="快捷提问">
              {["我现在很烦，先做什么？", "帮我安排今晚 2 小时", "我一直拖延怎么办？"].map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => setChatInput(prompt)}
                  disabled={chatStatus === "loading"}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              className="chat-input-row"
              onSubmit={(event) => {
                event.preventDefault();
                sendChatMessage();
              }}
            >
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="告诉 AI：你现在最焦虑的任务、可用时间，或者只是想先聊两句。"
                rows="3"
              />
              <button className="ai-button" type="submit" disabled={chatStatus === "loading" || !chatInput.trim()}>
                <SendHorizontal size={16} aria-hidden="true" />
                发送
              </button>
            </form>
          </div>
        </div>
      </section>

      <section id="history" className="panel history-panel">
        <div className="section-heading">
          <span>
            <TrendingUp size={18} aria-hidden="true" />
            历史记录/图表页
          </span>
          <small>示例历史数据会随今日输入更新</small>
        </div>

        <TrendChart
          data={historyData}
          currentScore={analysis.score}
          currentSleep={Number(form.sleepHours) || 0}
          currentCompletion={analysis.completionEstimate}
        />
      </section>
    </main>
  );
}
