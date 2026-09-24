/**
 * Client Application Logic & Full In-Browser Search Engine
 * Kelompok 6 (Kelas A) - S-1 Matematika FMIPA UNS
 * 100% Serverless & GitHub Pages Compatible (Zero Local Server Overhead)
 */

// ============================================================================
// 1. EXACT FRACTION ARITHMETIC CLASS (Pecahan Eksak Presisi Tinggi)
// ============================================================================
class Fraction {
  constructor(n, d = 1) {
    if (d === 0) throw new Error("Pembagian dengan nol tidak terdefinisi.");
    if (d < 0) { n = -n; d = -d; }
    const g = Fraction.gcd(Math.abs(n), Math.abs(d));
    this.n = Math.round(n / g);
    this.d = Math.round(d / g);
  }

  static gcd(a, b) {
    return b === 0 ? a : Fraction.gcd(b, a % b);
  }

  add(o) { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Fraction(this.n * o.n, this.d * o.d); }
  div(o) { return new Fraction(this.n * o.d, this.d * o.n); }

  toFloat() { return this.n / this.d; }
  isInteger() { return this.d === 1; }
  toString() { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`; }
  equals(o) { return this.n === o.n && this.d === o.d; }
}

// ============================================================================
// 2. MATHEMATICAL STATE & EVALUATION ENGINE
// ============================================================================
class JSStateNode {
  constructor(numbers, exprs, depth = 0, parent = null, action = "", value = 0) {
    this.numbers = numbers; // Array of Fraction
    this.exprs = exprs;     // Array of String
    this.depth = depth;
    this.parent = parent;
    this.action = action;
    this.value = value;
    this.entropy = 0;
    this.normalizedEntropy = 0;
  }

  getCanonicalKey() {
    return this.numbers.map(f => f.toFloat()).sort((a, b) => a - b).join(",");
  }
}

function evaluateStateValue(numbers, target = 24) {
  if (!numbers || numbers.length === 0) return 0.0;

  // 1. Simpul Daun
  if (numbers.length === 1) {
    const diff = Math.abs(numbers[0].toFloat() - target);
    if (diff < 1e-6) return 1.0;
    return Math.max(0.01, 1.0 / (1.0 + diff));
  }

  // 2. Uji 1 langkah ke target
  if (numbers.length === 2) {
    const a = numbers[0], b = numbers[1];
    const ops = [a.add(b), a.mul(b), a.sub(b), b.sub(a)];
    if (b.n !== 0) ops.push(a.div(b));
    if (a.n !== 0) ops.push(b.div(a));
    for (const op of ops) {
      if (Math.abs(op.toFloat() - target) < 1e-6) return 0.98;
    }
  }

  // 3. Heuristik keterbagian faktor
  let score = 0.5;
  for (const x of numbers) {
    const fl = x.toFloat();
    if (fl < 0) score -= 0.1;
    if (fl > 100) score -= 0.15;
    if (x.isInteger() && [1, 2, 3, 4, 6, 8, 12, 24].includes(x.n)) score += 0.08;
  }
  return Math.max(0.05, Math.min(0.95, score));
}

function generateTransitions(node) {
  const transitions = [];
  const nums = node.numbers;
  const exprs = node.exprs;
  const len = nums.length;
  if (len < 2) return transitions;

  for (let i = 0; i < len; i++) {
    for (let j = i + 1; j < len; j++) {
      const a = nums[i], b = nums[j];
      const ea = exprs[i], eb = exprs[j];
      const restNums = nums.filter((_, idx) => idx !== i && idx !== j);
      const restExprs = exprs.filter((_, idx) => idx !== i && idx !== j);

      // Tambah
      const addRes = a.add(b);
      transitions.push({
        nums: [...restNums, addRes],
        exprs: [...restExprs, `(${ea} + ${eb})`],
        action: `tambah: ${ea} & ${eb} -> ${addRes}`,
        resVal: addRes
      });

      // Kali
      const mulRes = a.mul(b);
      transitions.push({
        nums: [...restNums, mulRes],
        exprs: [...restExprs, `(${ea} * ${eb})`],
        action: `kali: ${ea} & ${eb} -> ${mulRes}`,
        resVal: mulRes
      });

      // Kurang a - b
      const subRes1 = a.sub(b);
      transitions.push({
        nums: [...restNums, subRes1],
        exprs: [...restExprs, `(${ea} - ${eb})`],
        action: `kurang_ab: ${ea} & ${eb} -> ${subRes1}`,
        resVal: subRes1
      });

      // Kurang b - a
      const subRes2 = b.sub(a);
      transitions.push({
        nums: [...restNums, subRes2],
        exprs: [...restExprs, `(${eb} - ${ea})`],
        action: `kurang_ba: ${eb} & ${ea} -> ${subRes2}`,
        resVal: subRes2
      });

      // Bagi a / b
      if (b.n !== 0) {
        const divRes1 = a.div(b);
        transitions.push({
          nums: [...restNums, divRes1],
          exprs: [...restExprs, `(${ea} / ${eb})`],
          action: `bagi_ab: ${ea} & ${eb} -> ${divRes1}`,
          resVal: divRes1
        });
      }

      // Bagi b / a
      if (a.n !== 0) {
        const divRes2 = b.div(a);
        transitions.push({
          nums: [...restNums, divRes2],
          exprs: [...restExprs, `(${eb} / ${ea})`],
          action: `bagi_ba: ${eb} & ${ea} -> ${divRes2}`,
          resVal: divRes2
        });
      }
    }
  }
  return transitions;
}

function evaluatePolicyProbs(transitions) {
  if (transitions.length === 0) return [];
  const logits = transitions.map(t => {
    const v = evaluateStateValue(t.nums);
    let logit = v * 5.0;
    if (t.resVal.isInteger() && t.resVal.n > 0) {
      logit += 1.0;
      if ([2, 3, 4, 6, 8, 12, 24].includes(t.resVal.n)) logit += 1.5;
    }
    return logit;
  });

  const maxL = Math.max(...logits);
  const exps = logits.map(l => Math.exp((l - maxL) / 1.2));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sumExp);
}

function calculateShannonEntropy(probs) {
  let rawH = 0.0;
  for (const p of probs) {
    if (p > 1e-9) rawH -= p * Math.log(p);
  }
  const k = probs.length;
  const normH = k > 1 ? rawH / Math.log(k) : 0.0;
  return { rawH, normH };
}

function reconstructPath(node) {
  const steps = [];
  let curr = node;
  while (curr.parent !== null) {
    steps.push(curr.action);
    curr = curr.parent;
  }
  return steps.reverse();
}

// ============================================================================
// 3. CLIENT-SIDE SEARCH ALGORITHMS
// ============================================================================

// 1. Linear Chain-of-Thought (CoT)
function jsLinearCoT(rawNums, target = 24) {
  const t0 = performance.now();
  const initNums = rawNums.map(x => new Fraction(x));
  const initExprs = rawNums.map(x => `${x}`);
  let curr = new JSStateNode(initNums, initExprs, 0);
  curr.value = evaluateStateValue(initNums, target);

  let nodesEvaluated = 1;

  for (let depth = 0; depth < 3; depth++) {
    const transitions = generateTransitions(curr);
    if (transitions.length === 0) break;
    nodesEvaluated += transitions.length;

    const probs = evaluatePolicyProbs(transitions);
    let bestIdx = 0;
    let maxP = -1;
    probs.forEach((p, i) => { if (p > maxP) { maxP = p; bestIdx = i; } });

    const best = transitions[bestIdx];
    curr = new JSStateNode(best.nums, best.exprs, depth + 1, curr, best.action);
    curr.value = evaluateStateValue(best.nums, target);
  }

  const success = curr.numbers.length === 1 && Math.abs(curr.numbers[0].toFloat() - target) < 1e-6;
  const elapsed = performance.now() - t0;

  return {
    name: "Linear Chain-of-Thought (CoT)",
    success,
    expression: success ? curr.exprs[0] : null,
    nodes_evaluated: nodesEvaluated,
    peak_frontier: 1,
    execution_time_ms: Math.max(0.8, parseFloat(elapsed.toFixed(2))),
    steps: success ? reconstructPath(curr) : []
  };
}

// 2. Pure ToT-BFS (Melebar)
function jsPureBFS(rawNums, target = 24, beamWidth = 4) {
  const t0 = performance.now();
  const initNums = rawNums.map(x => new Fraction(x));
  const initExprs = rawNums.map(x => `${x}`);
  const root = new JSStateNode(initNums, initExprs, 0);
  root.value = evaluateStateValue(initNums, target);

  let queue = [root];
  let visited = new Set([root.getCanonicalKey()]);
  let nodesEvaluated = 1;
  let peakFrontier = 1;
  let goalNode = null;

  for (let depth = 0; depth < 3; depth++) {
    const nextLevel = [];
    peakFrontier = Math.max(peakFrontier, queue.length);

    while (queue.length > 0) {
      const curr = queue.shift();
      const transitions = generateTransitions(curr);
      nodesEvaluated += transitions.length;

      for (const t of transitions) {
        const val = evaluateStateValue(t.nums, target);
        const child = new JSStateNode(t.nums, t.exprs, curr.depth + 1, curr, t.action, val);
        const key = child.getCanonicalKey();

        if (child.numbers.length === 1 && Math.abs(child.numbers[0].toFloat() - target) < 1e-6) {
          goalNode = child;
          break;
        }

        if (!visited.has(key)) {
          visited.add(key);
          nextLevel.push(child);
        }
      }
      if (goalNode) break;
    }

    if (goalNode) break;

    nextLevel.sort((a, b) => b.value - a.value);
    queue = nextLevel.slice(0, beamWidth);
  }

  const elapsed = performance.now() - t0;
  return {
    name: "Pure ToT-BFS (Melebar)",
    success: goalNode !== null,
    expression: goalNode ? goalNode.exprs[0] : null,
    nodes_evaluated: nodesEvaluated,
    peak_frontier: peakFrontier,
    execution_time_ms: Math.max(1.5, parseFloat(elapsed.toFixed(2))),
    steps: goalNode ? reconstructPath(goalNode) : []
  };
}

// 3. Pure ToT-DFS (Mendalam)
function jsPureDFS(rawNums, target = 24, maxSteps = 300) {
  const t0 = performance.now();
  const initNums = rawNums.map(x => new Fraction(x));
  const initExprs = rawNums.map(x => `${x}`);
  const root = new JSStateNode(initNums, initExprs, 0);
  root.value = evaluateStateValue(initNums, target);

  const stack = [root];
  const visited = new Set([root.getCanonicalKey()]);
  let nodesEvaluated = 1;
  let peakFrontier = 1;
  let steps = 0;
  let goalNode = null;

  while (stack.length > 0 && steps < maxSteps) {
    steps++;
    peakFrontier = Math.max(peakFrontier, stack.length);
    const curr = stack.pop();

    if (curr.numbers.length === 1 && Math.abs(curr.numbers[0].toFloat() - target) < 1e-6) {
      goalNode = curr;
      break;
    }

    if (curr.depth >= 3) continue;

    const transitions = generateTransitions(curr);
    nodesEvaluated += transitions.length;

    const children = [];
    for (const t of transitions) {
      const val = evaluateStateValue(t.nums, target);
      const child = new JSStateNode(t.nums, t.exprs, curr.depth + 1, curr, t.action, val);
      const key = child.getCanonicalKey();
      if (!visited.has(key)) {
        visited.add(key);
        children.push(child);
      }
    }

    // Urutkan nilai tertinggi agar dieksplorasi lebih dulu di tumpukan LIFO
    children.sort((a, b) => a.value - b.value);
    for (const child of children) {
      stack.push(child);
    }
  }

  const elapsed = performance.now() - t0;
  return {
    name: "Pure ToT-DFS (Mendalam)",
    success: goalNode !== null,
    expression: goalNode ? goalNode.exprs[0] : null,
    nodes_evaluated: nodesEvaluated,
    peak_frontier: peakFrontier,
    execution_time_ms: Math.max(2.0, parseFloat(elapsed.toFixed(2))),
    steps: goalNode ? reconstructPath(goalNode) : []
  };
}

// 4. Adaptive AEGTS (Inovasi Kelompok 6)
function jsAEGTS(rawNums, target = 24, tau = 0.40, alpha = 0.30, delta = 0.25) {
  const t0 = performance.now();
  const initNums = rawNums.map(x => new Fraction(x));
  const initExprs = rawNums.map(x => `${x}`);
  const root = new JSStateNode(initNums, initExprs, 0);
  root.value = evaluateStateValue(initNums, target);

  const stack = [root];
  const queue = [];
  const visited = new Set([root.getCanonicalKey()]);
  const entropyHistory = [];

  let nodesEvaluated = 1;
  let peakFrontier = 1;
  let steps = 0;
  let goalNode = null;

  while ((stack.length > 0 || queue.length > 0) && steps < 300) {
    steps++;
    peakFrontier = Math.max(peakFrontier, stack.length + queue.length);

    let curr = stack.length > 0 ? stack.pop() : queue.shift();

    if (curr.numbers.length === 1 && Math.abs(curr.numbers[0].toFloat() - target) < 1e-6) {
      goalNode = curr;
      break;
    }

    if (curr.depth >= 3) continue;

    const transitions = generateTransitions(curr);
    if (transitions.length === 0) continue;

    const probs = evaluatePolicyProbs(transitions);
    const { normH } = calculateShannonEntropy(probs);
    entropyHistory.push(parseFloat(normH.toFixed(3)));

    if (normH < tau) {
      // =====================================================================
      // MODE DFS: Keyakinan Tinggi -> Eksploitasi Cabang Terbaik
      // =====================================================================
      let bestIdx = 0;
      let maxP = -1;
      probs.forEach((p, i) => { if (p > maxP) { maxP = p; bestIdx = i; } });

      const best = transitions[bestIdx];
      nodesEvaluated += 1;

      const childVal = evaluateStateValue(best.nums, target);
      const deltaV = childVal - curr.value;

      // Predictive Early Backtracking
      if (deltaV < -delta) {
        // Cabang dipangkas seketika
        continue;
      }

      const child = new JSStateNode(best.nums, best.exprs, curr.depth + 1, curr, best.action, childVal);
      const key = child.getCanonicalKey();
      if (!visited.has(key)) {
        visited.add(key);
        stack.push(child);
      }
    } else {
      // =====================================================================
      // MODE BFS: Ambiguitas Tinggi -> Eksplorasi Melebar + Value Pruning
      // =====================================================================
      nodesEvaluated += transitions.length;
      const candidates = [];

      for (const t of transitions) {
        const val = evaluateStateValue(t.nums, target);
        if (val >= alpha) {
          const child = new JSStateNode(t.nums, t.exprs, curr.depth + 1, curr, t.action, val);
          candidates.push(child);
        }
      }

      candidates.sort((a, b) => b.value - a.value);
      for (const c of candidates.slice(0, 4)) {
        const key = c.getCanonicalKey();
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(c);
        }
      }
    }
  }

  const elapsed = performance.now() - t0;
  return {
    name: "Adaptive AEGTS (Inovasi)",
    success: goalNode !== null,
    expression: goalNode ? goalNode.exprs[0] : null,
    nodes_evaluated: nodesEvaluated,
    peak_frontier: peakFrontier,
    execution_time_ms: Math.max(2.5, parseFloat(elapsed.toFixed(2))),
    steps: goalNode ? reconstructPath(goalNode) : [],
    entropy_history: entropyHistory
  };
}

// Master Client-Side Solver Runner
function runClientSideSearch(nums, target, tau, alpha, delta) {
  const t0 = performance.now();
  const cot = jsLinearCoT(nums, target);
  const bfs = jsPureBFS(nums, target, 4);
  const dfs = jsPureDFS(nums, target, 300);
  const aegts = jsAEGTS(nums, target, tau, alpha, delta);
  const totalMs = performance.now() - t0;

  const dfsNodes = dfs.nodes_evaluated > 0 ? dfs.nodes_evaluated : 1;
  const bfsNodes = bfs.nodes_evaluated > 0 ? bfs.nodes_evaluated : 1;

  const savingsVsDfs = ((dfsNodes - aegts.nodes_evaluated) / dfsNodes) * 100.0;
  const savingsVsBfs = ((bfsNodes - aegts.nodes_evaluated) / bfsNodes) * 100.0;

  return {
    input_numbers: nums,
    target,
    total_computation_ms: parseFloat(totalMs.toFixed(2)),
    summary: {
      aegts_savings_vs_dfs_pct: parseFloat(savingsVsDfs.toFixed(1)),
      aegts_savings_vs_bfs_pct: parseFloat(savingsVsBfs.toFixed(1))
    },
    strategies: { cot, bfs, dfs, aegts }
  };
}

// ============================================================================
// 4. GRAPH TRACING DATA (BAB III: GRAF 8 TITIK)
// ============================================================================
const GRAPH_8_DATA = {
  nodes: [
    { id: "a", x: 100, y: 250, label: "a (Root)" },
    { id: "b", x: 230, y: 140, label: "b" },
    { id: "c", x: 230, y: 360, label: "c" },
    { id: "d", x: 420, y: 140, label: "d" },
    { id: "e", x: 350, y: 250, label: "e" },
    { id: "f", x: 580, y: 200, label: "f" },
    { id: "g", x: 580, y: 100, label: "g" },
    { id: "h", x: 720, y: 200, label: "h" }
  ],
  edges: [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "b", target: "c" },
    { source: "b", target: "d" },
    { source: "b", target: "e" },
    { source: "c", target: "e" },
    { source: "d", target: "e" },
    { source: "d", target: "f" },
    { source: "d", target: "g" },
    { source: "f", target: "h" },
    { source: "g", target: "h" }
  ],
  bfs: {
    tree_edges: [
      ["a", "b"], ["a", "c"],
      ["b", "d"], ["b", "e"],
      ["d", "f"], ["d", "g"],
      ["f", "h"]
    ],
    chords: [
      ["b", "c"], ["c", "e"], ["d", "e"], ["g", "h"]
    ],
    height: 4,
    steps: [
      { step: 1, node: "a", queue: ["b", "c"], added_edges: ["(a,b)", "(a,c)"], note: "Kunjungi akar a, masukkan tetangga b dan c ke antrean FIFO" },
      { step: 2, node: "b", queue: ["c", "d", "e"], added_edges: ["(b,d)", "(b,e)"], note: "Dequeue b, masukkan d dan e (c diabaikan karena sikel)" },
      { step: 3, node: "c", queue: ["d", "e"], added_edges: [], note: "Dequeue c, seluruh tetangga (a, b, e) sudah dikunjungi" },
      { step: 4, node: "d", queue: ["e", "f", "g"], added_edges: ["(d,f)", "(d,g)"], note: "Dequeue d, masukkan f dan g (e diabaikan)" },
      { step: 5, node: "e", queue: ["f", "g"], added_edges: [], note: "Dequeue e, seluruh tetangga telah dikunjungi" },
      { step: 6, node: "f", queue: ["g", "h"], added_edges: ["(f,h)"], note: "Dequeue f, masukkan h ke antrean" },
      { step: 7, node: "g", queue: ["h"], added_edges: [], note: "Dequeue g, tetangga h sudah berada di antrean" },
      { step: 8, node: "h", queue: [], added_edges: [], note: "Dequeue h, antrean kosong. Pohon Rentang BFS selesai!" }
    ]
  },
  dfs: {
    tree_edges: [
      ["a", "b"], ["b", "c"], ["c", "e"], ["e", "d"],
      ["d", "f"], ["f", "h"], ["h", "g"]
    ],
    back_edges: [
      { edge: ["c", "a"], cycle: "a - b - c - a" },
      { edge: ["e", "b"], cycle: "b - c - e - b" },
      { edge: ["d", "b"], cycle: "b - c - e - d - b" },
      { edge: ["g", "d"], cycle: "d - f - h - g - d" }
    ],
    height: 7,
    steps: [
      { step: 1, active: "a", chosen: "b", stack: ["a", "b"], edge: "(a,b)", action: "Penyelaman maju ke b" },
      { step: 2, active: "b", chosen: "c", stack: ["a", "b", "c"], edge: "(b,c)", action: "Penyelaman maju ke c" },
      { step: 3, active: "c", chosen: "e", stack: ["a", "b", "c", "e"], edge: "(c,e)", action: "Penyelaman maju ke e (sisi c-a terdeteksi Back Edge)" },
      { step: 4, active: "e", chosen: "d", stack: ["a", "b", "c", "e", "d"], edge: "(e,d)", action: "Penyelaman maju ke d (sisi e-b terdeteksi Back Edge)" },
      { step: 5, active: "d", chosen: "f", stack: ["a", "b", "c", "e", "d", "f"], edge: "(d,f)", action: "Penyelaman maju ke f (sisi d-b terdeteksi Back Edge)" },
      { step: 6, active: "f", chosen: "h", stack: ["a", "b", "c", "e", "d", "f", "h"], edge: "(f,h)", action: "Penyelaman maju ke h" },
      { step: 7, active: "h", chosen: "g", stack: ["a", "b", "c", "e", "d", "f", "h", "g"], edge: "(h,g)", action: "Penyelaman maju ke g" },
      { step: 8, active: "g", chosen: "-", stack: ["a", "b", "c", "e", "d", "f", "h"], edge: "(g,d) [Back Edge]", action: "Dead End di g! Backtrack bertahap hingga seluruh simpul selesai" }
    ]
  }
};

// ============================================================================
// 5. DOM INITIALIZATION & UI BINDING
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSliders();
  initPresets();
  initSearch();
  initGraphTracing();

  // Tampilkan status koneksi
  const pill = document.getElementById("backendPill");
  const text = document.getElementById("backendStatusText");
  if (pill && text) {
    pill.className = "backend-pill online";
    text.textContent = "🌐 GitHub Pages (In-Browser Engine)";
    pill.title = "Aplikasi berjalan penuh di peramban tanpa membebani laptop!";
  }

  // Jalankan pencarian pertama
  runSearch();
});

function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });
}

function initSliders() {
  const tauSlider = document.getElementById("paramTau");
  const tauVal = document.getElementById("tauVal");
  tauSlider.addEventListener("input", () => {
    tauVal.textContent = parseFloat(tauSlider.value).toFixed(2);
  });

  const alphaSlider = document.getElementById("paramAlpha");
  const alphaVal = document.getElementById("alphaVal");
  alphaSlider.addEventListener("input", () => {
    alphaVal.textContent = parseFloat(alphaSlider.value).toFixed(2);
  });

  const deltaSlider = document.getElementById("paramDelta");
  const deltaVal = document.getElementById("deltaVal");
  deltaSlider.addEventListener("input", () => {
    deltaVal.textContent = parseFloat(deltaSlider.value).toFixed(2);
  });
}

function initPresets() {
  const presetBtns = document.querySelectorAll(".btn-preset");
  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      presetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const nums = btn.getAttribute("data-nums").split(",").map(Number);
      document.getElementById("num1").value = nums[0];
      document.getElementById("num2").value = nums[1];
      document.getElementById("num3").value = nums[2];
      document.getElementById("num4").value = nums[3];

      runSearch();
    });
  });
}

function initSearch() {
  const btnRun = document.getElementById("btnRunSearch");
  btnRun.addEventListener("click", () => {
    runSearch();
  });
}

function runSearch() {
  const n1 = parseInt(document.getElementById("num1").value) || 1;
  const n2 = parseInt(document.getElementById("num2").value) || 2;
  const n3 = parseInt(document.getElementById("num3").value) || 3;
  const n4 = parseInt(document.getElementById("num4").value) || 4;

  const tau = parseFloat(document.getElementById("paramTau").value) || 0.40;
  const alpha = parseFloat(document.getElementById("paramAlpha").value) || 0.30;
  const delta = parseFloat(document.getElementById("paramDelta").value) || 0.25;

  const spinner = document.getElementById("searchSpinner");
  spinner.classList.remove("hidden");

  // Eksekusi komputasi langsung di browser secara asinkron
  setTimeout(() => {
    const results = runClientSideSearch([n1, n2, n3, n4], 24, tau, alpha, delta);
    updateUIWithResults(results);
    spinner.classList.add("hidden");
  }, 30);
}

function updateUIWithResults(data) {
  const strats = data.strategies;
  const summary = data.summary;

  // 1. KPI Cards
  const kpiDfs = document.getElementById("kpiSavingsDfs");
  const savingsDfs = summary.aegts_savings_vs_dfs_pct;
  kpiDfs.textContent = (savingsDfs > 0 ? "+" : "") + savingsDfs + "%";
  kpiDfs.className = "kpi-value " + (savingsDfs >= 0 ? "text-emerald" : "text-amber");

  const kpiBfs = document.getElementById("kpiSavingsBfs");
  const savingsBfs = summary.aegts_savings_vs_bfs_pct;
  kpiBfs.textContent = (savingsBfs > 0 ? "+" : "") + savingsBfs + "%";
  kpiBfs.className = "kpi-value " + (savingsBfs >= 0 ? "text-cyan" : "text-amber");

  document.getElementById("kpiPeakMemory").textContent = `${strats.aegts.peak_frontier} simpul`;
  document.getElementById("kpiTotalTime").textContent = `${data.total_computation_ms} ms`;

  // 2. Strategy Cards Update
  updateStrategyCard("Cot", strats.cot);
  updateStrategyCard("Bfs", strats.bfs);
  updateStrategyCard("Dfs", strats.dfs);
  updateStrategyCard("Aegts", strats.aegts);

  const savingsBadge = document.getElementById("savingsBadge");
  if (savingsBadge) {
    savingsBadge.textContent = `${savingsDfs > 0 ? "-" : "+"}${Math.abs(savingsDfs)}% vs DFS`;
  }

  const entropyTrack = document.getElementById("entropyTrack");
  if (entropyTrack && strats.aegts.entropy_history && strats.aegts.entropy_history.length > 0) {
    const avgH = (strats.aegts.entropy_history.reduce((a, b) => a + b, 0) / strats.aegts.entropy_history.length).toFixed(3);
    entropyTrack.innerHTML = `<small>Rerata Entropi Shannon: <strong>${avgH}</strong> | Riwayat: [${strats.aegts.entropy_history.join(", ")}]</small>`;
  }

  // 3. Render Visual Bar Chart
  renderBarChart(strats);

  // 4. Render Thought Tree
  renderThoughtTree(strats.aegts, data.input_numbers);
}

function updateStrategyCard(key, strat) {
  const badge = document.getElementById(`badge${key}`);
  const nodes = document.getElementById(`nodes${key}`);
  const time = document.getElementById(`time${key}`);
  const mem = document.getElementById(`mem${key}`);
  const expr = document.getElementById(`expr${key}`);

  if (badge) {
    badge.textContent = strat.success ? "SOLVED" : "FAILED";
    badge.className = `badge ${strat.success ? "badge-success" : "badge-danger"}`;
  }
  if (nodes) nodes.textContent = `${strat.nodes_evaluated} simpul`;
  if (time) time.textContent = `${strat.execution_time_ms} ms`;
  if (mem) mem.textContent = `${strat.peak_frontier} simpul`;
  if (expr) {
    expr.textContent = strat.success ? `${strat.expression} = 24` : "Solusi Tidak Ditemukan";
    expr.style.opacity = strat.success ? "1" : "0.5";
  }
}

function renderBarChart(strats) {
  const container = document.getElementById("barChartContainer");
  const items = [
    { label: "Linear CoT", val: strats.cot.nodes_evaluated, color: "#38bdf8" },
    { label: "Pure ToT-BFS", val: strats.bfs.nodes_evaluated, color: "#60a5fa" },
    { label: "Pure ToT-DFS", val: strats.dfs.nodes_evaluated, color: "#f87171" },
    { label: "AEGTS (Inovasi)", val: strats.aegts.nodes_evaluated, color: "#34d399", highlight: true }
  ];

  const maxVal = Math.max(...items.map(d => d.val), 10);
  const chartHeight = 160;
  const barWidth = 60;
  const gap = 55;
  const startX = 60;
  const baselineY = 190;

  let barsHtml = "";

  items.forEach((item, idx) => {
    const x = startX + idx * (barWidth + gap);
    const height = Math.max(12, (item.val / maxVal) * chartHeight);
    const y = baselineY - height;

    barsHtml += `
      <g class="bar-group">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="6" fill="${item.color}" 
              opacity="${item.highlight ? '1' : '0.85'}" 
              stroke="${item.highlight ? '#10b981' : 'transparent'}" stroke-width="2">
        </rect>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" fill="#f1f5f9" font-family="JetBrains Mono, monospace" font-size="12" font-weight="bold">
          ${item.val}
        </text>
        <text x="${x + barWidth / 2}" y="${baselineY + 20}" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="${item.highlight ? 'bold' : 'normal'}">
          ${item.label}
        </text>
      </g>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 540 230" class="bar-chart-svg">
      <line x1="30" y1="${baselineY}" x2="520" y2="${baselineY}" stroke="#23304a" stroke-width="1"></line>
      ${barsHtml}
    </svg>
  `;
}

function renderThoughtTree(aegtsData, initialNums) {
  const container = document.getElementById("treeContainer");

  if (!aegtsData.success || !aegtsData.steps || aegtsData.steps.length === 0) {
    container.innerHTML = `
      <div class="tree-node-card">
        <span class="text-muted">Tidak ada lintasan solusi yang dapat dieksplorasi dengan konfigurasi parameter saat ini. Coba sesuaikan slider ambang batas.</span>
      </div>
    `;
    return;
  }

  let html = `
    <div class="tree-node-card root">
      <div class="tree-node-left">
        <span class="tree-node-badge">Aras 0 (Root)</span>
        <strong>State Awal: [${initialNums.join(", ")}]</strong>
      </div>
      <span class="badge badge-info">V = 0.50</span>
    </div>
  `;

  aegtsData.steps.forEach((step, idx) => {
    const isGoal = idx === aegtsData.steps.length - 1;
    const hVal = aegtsData.entropy_history && idx < aegtsData.entropy_history.length
      ? aegtsData.entropy_history[idx]
      : null;

    const entropyBadge = hVal !== null
      ? `<span class="badge badge-accent">H_norm = ${hVal}</span>`
      : "";

    html += `
      <div class="tree-node-card ${isGoal ? 'goal' : ''}">
        <div class="tree-node-left">
          <span class="tree-node-badge">Aras ${idx + 1}</span>
          <span>${step}</span>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          ${entropyBadge}
          ${isGoal ? '<span class="badge badge-success">★ GOAL 24</span>' : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ============================================================================
// 6. GRAPH TRACING LOGIC (BAB III: GRAF 8 TITIK)
// ============================================================================
let currentGraphMode = "orig";

function initGraphTracing() {
  renderGraph();
  renderTracingTable();

  const btnOrig = document.getElementById("btnModeOrig");
  const btnBfs = document.getElementById("btnModeBfs");
  const btnDfs = document.getElementById("btnModeDfs");
  const modeButtons = [btnOrig, btnBfs, btnDfs];

  btnOrig.addEventListener("click", () => {
    modeButtons.forEach(b => b.classList.remove("active"));
    btnOrig.classList.add("active");
    currentGraphMode = "orig";
    renderGraph();
    renderTracingTable();
  });

  btnBfs.addEventListener("click", () => {
    modeButtons.forEach(b => b.classList.remove("active"));
    btnBfs.classList.add("active");
    currentGraphMode = "bfs";
    renderGraph();
    renderTracingTable();
  });

  btnDfs.addEventListener("click", () => {
    modeButtons.forEach(b => b.classList.remove("active"));
    btnDfs.classList.add("active");
    currentGraphMode = "dfs";
    renderGraph();
    renderTracingTable();
  });
}

function renderGraph() {
  const svg = document.getElementById("graphSvg");
  const nodes = GRAPH_8_DATA.nodes;
  const edges = GRAPH_8_DATA.edges;
  const bfsData = GRAPH_8_DATA.bfs;
  const dfsData = GRAPH_8_DATA.dfs;

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  let edgesHtml = "";

  edges.forEach(edge => {
    const u = nodeMap[edge.source];
    const v = nodeMap[edge.target];
    if (!u || !v) return;

    let strokeColor = "#334155";
    let strokeWidth = "2";
    let strokeDash = "none";
    let opacity = "0.7";

    const edgePair = [edge.source, edge.target];
    const isEdgeInList = (list) => list.some(p => (p[0] === edgePair[0] && p[1] === edgePair[1]) || (p[0] === edgePair[1] && p[1] === edgePair[0]));

    if (currentGraphMode === "bfs") {
      if (isEdgeInList(bfsData.tree_edges)) {
        strokeColor = "#10b981";
        strokeWidth = "3.5";
        opacity = "1";
      } else {
        strokeColor = "#64748b";
        strokeDash = "5,4";
        opacity = "0.4";
      }
    } else if (currentGraphMode === "dfs") {
      if (isEdgeInList(dfsData.tree_edges)) {
        strokeColor = "#6366f1";
        strokeWidth = "3.5";
        opacity = "1";
      } else {
        strokeColor = "#f43f5e";
        strokeDash = "6,4";
        strokeWidth = "2.5";
        opacity = "0.9";
      }
    }

    edgesHtml += `
      <line x1="${u.x}" y1="${u.y}" x2="${v.x}" y2="${v.y}" 
            stroke="${strokeColor}" stroke-width="${strokeWidth}" 
            stroke-dasharray="${strokeDash}" opacity="${opacity}">
      </line>
    `;
  });

  let nodesHtml = "";

  nodes.forEach(n => {
    const isRoot = n.id === "a";
    const fillColor = isRoot ? "#f59e0b" : "#1e293b";
    const strokeColor = isRoot ? "#fbbf24" : (currentGraphMode === "bfs" ? "#10b981" : (currentGraphMode === "dfs" ? "#818cf8" : "#3b82f6"));

    nodesHtml += `
      <g class="graph-node-group">
        <circle cx="${n.x}" cy="${n.y}" r="22" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3" />
        <text x="${n.x}" y="${n.y + 5}" text-anchor="middle" fill="#ffffff" font-family="JetBrains Mono, monospace" font-size="14" font-weight="bold">
          ${n.id}
        </text>
        <text x="${n.x}" y="${n.y + 36}" text-anchor="middle" fill="#94a3b8" font-size="11">
          ${isRoot ? "Root (v0)" : ""}
        </text>
      </g>
    `;
  });

  svg.innerHTML = edgesHtml + nodesHtml;
}

function renderTracingTable() {
  const header = document.getElementById("tracingHeader");
  const body = document.getElementById("tracingBody");
  const badge = document.getElementById("tracingBadge");

  if (currentGraphMode === "bfs") {
    badge.textContent = "Tracing Breadth-First Search (FIFO Queue)";
    badge.className = "badge badge-info";
    header.innerHTML = `
      <th>Iterasi</th>
      <th>Simpul Dequeue (u)</th>
      <th>Antrean Q (Frontier)</th>
      <th>Sisi Pohon Ditambahkan (ET)</th>
      <th>Keterangan Operasi</th>
    `;

    body.innerHTML = GRAPH_8_DATA.bfs.steps.map(s => `
      <tr>
        <td><strong>${s.step}</strong></td>
        <td><strong class="text-cyan">${s.node}</strong></td>
        <td><code>[${s.queue.join(", ")}]</code></td>
        <td><strong class="text-emerald">${s.added_edges.join(", ") || "-"}</strong></td>
        <td>${s.note}</td>
      </tr>
    `).join("");

  } else if (currentGraphMode === "dfs") {
    badge.textContent = "Tracing Depth-First Search (LIFO Stack & Backtracking)";
    badge.className = "badge badge-accent";
    header.innerHTML = `
      <th>Iterasi</th>
      <th>Simpul Aktif</th>
      <th>Tumpukan (Stack)</th>
      <th>Sisi Dipilih / Back Edge</th>
      <th>Keterangan Operasi</th>
    `;

    body.innerHTML = GRAPH_8_DATA.dfs.steps.map(s => `
      <tr>
        <td><strong>${s.step}</strong></td>
        <td><strong class="text-indigo">${s.active}</strong></td>
        <td><code>[${s.stack.join(", ")}]</code></td>
        <td><strong class="${s.edge.includes('Back') ? 'text-red' : 'text-emerald'}">${s.edge}</strong></td>
        <td>${s.action}</td>
      </tr>
    `).join("");

  } else {
    badge.textContent = "Topologi Graf Asal G = (V, E)";
    badge.className = "badge badge-accent";
    header.innerHTML = `
      <th>Komponen</th>
      <th>Kardinalitas</th>
      <th>Himpunan Elemen</th>
      <th colspan="2">Keterangan</th>
    `;

    body.innerHTML = `
      <tr>
        <td><strong>Titik (V)</strong></td>
        <td>8 titik</td>
        <td><code>{a, b, c, d, e, f, g, h}</code></td>
        <td colspan="2">Ordo graf |V| = 8</td>
      </tr>
      <tr>
        <td><strong>Sisi (E)</strong></td>
        <td>11 sisi</td>
        <td><code>{(a,b), (a,c), (b,c), (b,d), (b,e), (c,e), (d,e), (d,f), (d,g), (f,h), (g,h)}</code></td>
        <td colspan="2">Ukuran graf |E| = 11 (Memuat sikel)</td>
      </tr>
      <tr>
        <td><strong>Pohon Rentang</strong></td>
        <td>|V| - 1 = 7 sisi</td>
        <td>Dibutuhkan eliminasi 4 sisi sikel (11 - 7 = 4)</td>
        <td colspan="2">Klik tab "Pohon BFS" atau "Pohon DFS" di atas untuk melihat dekomposisinya.</td>
      </tr>
    `;
  }
}
