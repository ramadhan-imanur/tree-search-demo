/**
 * Client Application Logic & Full In-Browser Search Engine
 * Independent Project by Ramadhan Imanur
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

  // 1. Verteks Daun
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
  const chainNodes = [{
    depth: 0,
    numbers: initNums.map(f => f.toString()),
    exprs: [...initExprs],
    value: curr.value,
    action: "Akar (Root)",
    stepText: `[${initNums.map(f => f.toString()).join(", ")}]`
  }];

  for (let depth = 0; depth < 3; depth++) {
    const transitions = generateTransitions(curr);
    if (transitions.length === 0) break;
    nodesEvaluated += transitions.length;

    const probs = evaluatePolicyProbs(transitions);
    let bestIdx = 0;
    let maxP = -1;
    probs.forEach((p, i) => { if (p > maxP) { maxP = p; bestIdx = i; } });

    const best = transitions[bestIdx];
    const nextVal = evaluateStateValue(best.nums, target);
    curr = new JSStateNode(best.nums, best.exprs, depth + 1, curr, best.action, nextVal);

    chainNodes.push({
      depth: depth + 1,
      numbers: best.nums.map(f => f.toString()),
      exprs: [...best.exprs],
      value: nextVal,
      action: best.action,
      resVal: best.resVal.toString(),
      prob: maxP
    });
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
    steps: success ? reconstructPath(curr) : [],
    chainNodes
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

  const levelBranches = [];
  const queueHistory = [{
    level: 0,
    expanded: 1,
    generated: 0,
    queueSize: 1,
    sample: `[${initNums.map(f => f.toString()).join(", ")}]`
  }];

  for (let depth = 0; depth < 3; depth++) {
    const nextLevel = [];
    peakFrontier = Math.max(peakFrontier, queue.length);
    let levelGenCount = 0;
    const currentLevelNodes = [];

    while (queue.length > 0) {
      const curr = queue.shift();
      const transitions = generateTransitions(curr);
      nodesEvaluated += transitions.length;
      levelGenCount += transitions.length;

      for (const t of transitions) {
        const val = evaluateStateValue(t.nums, target);
        const child = new JSStateNode(t.nums, t.exprs, curr.depth + 1, curr, t.action, val);
        const key = child.getCanonicalKey();

        const childRecord = {
          depth: child.depth,
          numbers: child.numbers.map(f => f.toString()),
          exprs: [...child.exprs],
          action: child.action,
          value: val
        };
        currentLevelNodes.push(childRecord);

        if (child.numbers.length === 1 && Math.abs(child.numbers[0].toFloat() - target) < 1e-6) {
          goalNode = child;
          childRecord.isGoal = true;
          break;
        }

        if (!visited.has(key)) {
          visited.add(key);
          nextLevel.push(child);
        }
      }
      if (goalNode) break;
    }

    levelBranches.push(currentLevelNodes.slice(0, 4));
    queueHistory.push({
      level: depth + 1,
      expanded: queue.length || nextLevel.length,
      generated: levelGenCount,
      queueSize: nextLevel.length,
      sample: nextLevel.slice(0, 3).map(n => `[${n.numbers.map(f => f.toString()).join(",")}]`).join(", ") || "-"
    });

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
    steps: goalNode ? reconstructPath(goalNode) : [],
    levelBranches,
    queueHistory
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

  const firstDeepDive = [];
  let deadEndLeaf = null;
  const stackHistory = [];

  while (stack.length > 0 && steps < maxSteps) {
    steps++;
    peakFrontier = Math.max(peakFrontier, stack.length);
    const curr = stack.pop();

    if (firstDeepDive.length < 4) {
      firstDeepDive.push({
        depth: curr.depth,
        numbers: curr.numbers.map(f => f.toString()),
        exprs: [...curr.exprs],
        action: curr.action || "Akar (Root)",
        value: curr.value
      });
    }

    if (curr.numbers.length === 1 && Math.abs(curr.numbers[0].toFloat() - target) < 1e-6) {
      goalNode = curr;
      break;
    }

    if (curr.depth >= 3) {
      if (!deadEndLeaf) {
        deadEndLeaf = {
          depth: curr.depth,
          numbers: curr.numbers.map(f => f.toString()),
          exprs: [...curr.exprs],
          action: curr.action,
          value: curr.value
        };
      }
      continue;
    }

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

    children.sort((a, b) => a.value - b.value);
    for (const child of children) {
      stack.push(child);
    }

    if (stackHistory.length < 5) {
      stackHistory.push({
        step: steps,
        active: curr.action || `Root [${rawNums.join(",")}]`,
        stackSize: stack.length,
        actionDesc: children.length > 0 ? `Push ${children.length} anak ke tumpukan LIFO` : "Daun terminal tercapai (Backtrack mundur)"
      });
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
    steps: goalNode ? reconstructPath(goalNode) : [],
    firstDeepDive,
    deadEndLeaf,
    stackHistory
  };
}

// 4. Adaptive AEGTS (Adaptive Entropy-Guided Tree Search)
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

  const prunedBranches = [];
  const survivingBranches = [];
  const entropySchedule = [];

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
    const roundedH = parseFloat(normH.toFixed(3));
    entropyHistory.push(roundedH);

    const isBfsMode = roundedH >= tau;

    if (entropySchedule.length < 5) {
      entropySchedule.push({
        depth: curr.depth,
        entropy: roundedH,
        tau,
        mode: isBfsMode ? "BFS (Melebar)" : "DFS (Mendalam)",
        actionDesc: isBfsMode
          ? `Ambiguitas tinggi (${roundedH} ≥ ${tau}): eksplorasi melebar + pemangkasan α`
          : `Keyakinan tinggi (${roundedH} < ${tau}): eksploitasi cepat ke cabang terbaik`
      });
    }

    if (!isBfsMode) {
      // MODE DFS: Keyakinan Tinggi -> Eksploitasi Cabang Terbaik
      let bestIdx = 0;
      let maxP = -1;
      probs.forEach((p, i) => { if (p > maxP) { maxP = p; bestIdx = i; } });

      const best = transitions[bestIdx];
      nodesEvaluated += 1;

      const childVal = evaluateStateValue(best.nums, target);
      const deltaV = childVal - curr.value;

      // Predictive Early Backtracking
      if (deltaV < -delta) {
        continue;
      }

      const child = new JSStateNode(best.nums, best.exprs, curr.depth + 1, curr, best.action, childVal);
      const key = child.getCanonicalKey();
      if (!visited.has(key)) {
        visited.add(key);
        stack.push(child);
      }
    } else {
      // MODE BFS: Ambiguitas Tinggi -> Eksplorasi Melebar + Value Pruning
      nodesEvaluated += transitions.length;
      const candidates = [];

      for (const t of transitions) {
        const val = evaluateStateValue(t.nums, target);
        const child = new JSStateNode(t.nums, t.exprs, curr.depth + 1, curr, t.action, val);
        if (val >= alpha) {
          candidates.push(child);
          if (curr.depth === 0 && survivingBranches.length < 3) {
            survivingBranches.push({
              numbers: child.numbers.map(f => f.toString()),
              action: child.action,
              value: val
            });
          }
        } else {
          if (curr.depth === 0 && prunedBranches.length < 4) {
            prunedBranches.push({
              numbers: child.numbers.map(f => f.toString()),
              action: child.action,
              value: val
            });
          }
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
    name: "Adaptive AEGTS",
    success: goalNode !== null,
    expression: goalNode ? goalNode.exprs[0] : null,
    nodes_evaluated: nodesEvaluated,
    peak_frontier: peakFrontier,
    execution_time_ms: Math.max(2.5, parseFloat(elapsed.toFixed(2))),
    steps: goalNode ? reconstructPath(goalNode) : [],
    entropy_history: entropyHistory,
    prunedBranches,
    survivingBranches,
    entropySchedule
  };
}

// High-Speed In-Memory LRU/Map Memoization Cache (0.01ms instant responses)
const searchCache = new Map();
let lastFullResult = null;
let sliderDebounceTimer = null;
let isSearching = false;

// Master Client-Side Solver Runner (with memoization cache)
function runClientSideSearch(nums, target, tau, alpha, delta) {
  const cacheKey = `${nums.join(",")}_${target}_${tau.toFixed(2)}_${alpha.toFixed(2)}_${delta.toFixed(2)}`;
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    lastFullResult = cached;
    return cached;
  }

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

  const result = {
    input_numbers: nums,
    target,
    total_computation_ms: parseFloat(totalMs.toFixed(2)),
    summary: {
      aegts_savings_vs_dfs_pct: parseFloat(savingsVsDfs.toFixed(1)),
      aegts_savings_vs_bfs_pct: parseFloat(savingsVsBfs.toFixed(1))
    },
    strategies: { cot, bfs, dfs, aegts }
  };

  // Keep cache bounded to prevent memory bloat
  if (searchCache.size > 150) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(cacheKey, result);
  lastFullResult = result;
  return result;
}

// Live Adaptive Hyperparameter Tuning (Instant Reactive Slider with Debounce)
function handleSliderChange() {
  const tau = parseFloat(document.getElementById("paramTau").value) || 0.40;
  const alpha = parseFloat(document.getElementById("paramAlpha").value) || 0.30;
  const delta = parseFloat(document.getElementById("paramDelta").value) || 0.25;

  clearTimeout(sliderDebounceTimer);
  sliderDebounceTimer = setTimeout(() => {
    if (!lastFullResult) {
      runSearch();
      return;
    }

    const nums = lastFullResult.input_numbers;
    const target = lastFullResult.target || 24;
    const cacheKey = `${nums.join(",")}_${target}_${tau.toFixed(2)}_${alpha.toFixed(2)}_${delta.toFixed(2)}`;

    let updatedResult;
    if (searchCache.has(cacheKey)) {
      updatedResult = searchCache.get(cacheKey);
    } else {
      const t0 = performance.now();
      const aegts = jsAEGTS(nums, target, tau, alpha, delta);
      const totalMs = performance.now() - t0;

      const dfsNodes = lastFullResult.strategies.dfs.nodes_evaluated > 0 ? lastFullResult.strategies.dfs.nodes_evaluated : 1;
      const bfsNodes = lastFullResult.strategies.bfs.nodes_evaluated > 0 ? lastFullResult.strategies.bfs.nodes_evaluated : 1;

      const savingsVsDfs = ((dfsNodes - aegts.nodes_evaluated) / dfsNodes) * 100.0;
      const savingsVsBfs = ((bfsNodes - aegts.nodes_evaluated) / bfsNodes) * 100.0;

      updatedResult = {
        input_numbers: nums,
        target,
        total_computation_ms: parseFloat((lastFullResult.total_computation_ms + totalMs).toFixed(2)),
        summary: {
          aegts_savings_vs_dfs_pct: parseFloat(savingsVsDfs.toFixed(1)),
          aegts_savings_vs_bfs_pct: parseFloat(savingsVsBfs.toFixed(1))
        },
        strategies: {
          cot: lastFullResult.strategies.cot,
          bfs: lastFullResult.strategies.bfs,
          dfs: lastFullResult.strategies.dfs,
          aegts
        }
      };

      searchCache.set(cacheKey, updatedResult);
    }

    lastFullResult = updatedResult;
    requestAnimationFrame(() => {
      updateUIWithResults(updatedResult);
    });
  }, 90);
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
      { step: 8, node: "h", queue: [], added_edges: [], note: "Dequeue h, antrean kosong. <em>Spanning tree</em> BFS selesai!" }
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
      { step: 1, active: "a", chosen: "b", stack: ["a", "b"], edge: "(a,b)", action: "Maju ke verteks b" },
      { step: 2, active: "b", chosen: "c", stack: ["a", "b", "c"], edge: "(b,c)", action: "Maju ke verteks c" },
      { step: 3, active: "c", chosen: "e", stack: ["a", "b", "c", "e"], edge: "(c,e)", action: "Maju ke verteks e (<em>edge</em> c-a merupakan <em>edge</em> balik)" },
      { step: 4, active: "e", chosen: "d", stack: ["a", "b", "c", "e", "d"], edge: "(e,d)", action: "Maju ke verteks d (<em>edge</em> e-b merupakan <em>edge</em> balik)" },
      { step: 5, active: "d", chosen: "f", stack: ["a", "b", "c", "e", "d", "f"], edge: "(d,f)", action: "Maju ke verteks f (<em>edge</em> d-b merupakan <em>edge</em> balik)" },
      { step: 6, active: "f", chosen: "h", stack: ["a", "b", "c", "e", "d", "f", "h"], edge: "(f,h)", action: "Maju ke verteks h" },
      { step: 7, active: "h", chosen: "g", stack: ["a", "b", "c", "e", "d", "f", "h", "g"], edge: "(h,g)", action: "Maju ke verteks g" },
      { step: 8, active: "g", chosen: "-", stack: ["a", "b", "c", "e", "d", "f", "h"], edge: "(g,d) [Edge Balik]", action: "Jalan buntu di verteks g. Melacak balik hingga seluruh verteks selesai dikunjungi." }
    ]
  }
};

// ============================================================================
// 5. DOM INITIALIZATION & UI BINDING
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTabs();
  initMorphologySubtabs();
  initSliders();
  initPresets();
  initSearch();
  initGraphTracing();
  initMath();

  // Tampilkan status koneksi
  const pill = document.getElementById("backendPill");
  const text = document.getElementById("backendStatusText");
  if (pill && text) {
    pill.className = "backend-pill online";
    text.textContent = "Engine Peramban Aktif";
    pill.title = "Komputasi algoritma dijalankan secara lokal di peramban.";
  }

  // Jalankan pencarian pertama
  runSearch();
});

// Fallback jika skrip KaTeX selesai dimuat sesudah DOMContentLoaded
if (typeof katex === "undefined") {
  window.addEventListener("load", () => {
    if (typeof katex !== "undefined") {
      initMath();
    }
  });
}

// Penanganan Tipografi Matematis (KaTeX LaTeX Rendering)
function renderTeX(tex, display = false) {
  if (!tex) return "";
  if (typeof katex !== "undefined" && typeof katex.renderToString === "function") {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false
      });
    } catch (err) {
      console.warn("KaTeX renderToString error:", err);
      return tex;
    }
  }
  return tex;
}

function formatArithmeticToTeX(rawExpr, stripOuter = false) {
  if (!rawExpr) return "";
  let clean = rawExpr.trim();
  if (stripOuter && clean.startsWith("(") && clean.endsWith(")")) {
    let depth = 0;
    let canStrip = true;
    for (let i = 0; i < clean.length - 1; i++) {
      if (clean[i] === "(") depth++;
      else if (clean[i] === ")") depth--;
      if (depth === 0) {
        canStrip = false;
        break;
      }
    }
    if (canStrip) {
      clean = clean.substring(1, clean.length - 1).trim();
    }
  }
  return clean.replace(/\*/g, " \\times ").replace(/\//g, " \\div ");
}

function formatStepAction(step) {
  if (!step) return "";
  const m = step.match(/^([a-z_]+):\s*(.+?)\s*&\s*(.+?)\s*->\s*(.+)$/);
  if (m) {
    const op = m[1];
    let ea = m[2].trim();
    let eb = m[3].trim();
    let res = m[4].trim();

    let opSymbol = "+";
    let opName = "Penjumlahan";
    if (op === "kali") {
      opSymbol = "\\times";
      opName = "Perkalian";
    } else if (op.startsWith("kurang")) {
      opSymbol = "-";
      opName = "Pengurangan";
    } else if (op.startsWith("bagi")) {
      opSymbol = "\\div";
      opName = "Pembagian";
    }

    ea = formatArithmeticToTeX(ea, false);
    eb = formatArithmeticToTeX(eb, false);
    res = formatArithmeticToTeX(res, false);

    const mathHtml = renderTeX(`${ea} ${opSymbol} ${eb} = ${res}`);
    return `<span>${opName}:</span> ${mathHtml}`;
  }
  return escapeHtml(step);
}

function initMath(root) {
  const container = root || document.body;

  // 1. Render all elements with class .math-eq
  const mathElements = container.querySelectorAll ? container.querySelectorAll(".math-eq") : [];
  mathElements.forEach(el => {
    const tex = el.getAttribute("data-tex") || el.textContent.trim().replace(/^\$\$|\$\$$/g, "");
    if (typeof katex !== "undefined") {
      try {
        katex.render(tex, el, {
          displayMode: true,
          throwOnError: false
        });
      } catch (err) {
        console.warn("KaTeX render error:", err);
      }
    }
  });

  // If container itself has .math-eq
  if (container.classList && container.classList.contains("math-eq")) {
    const tex = container.getAttribute("data-tex") || container.textContent.trim().replace(/^\$\$|\$\$$/g, "");
    if (typeof katex !== "undefined") {
      try {
        katex.render(tex, container, {
          displayMode: true,
          throwOnError: false
        });
      } catch (err) {
        console.warn("KaTeX render error:", err);
      }
    }
  }

  // 2. Render all inline and display math delimiters using renderMathInElement
  if (typeof renderMathInElement === "function") {
    try {
      renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false,
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "annotation", "annotation-xml"]
      });
    } catch (err) {
      console.warn("KaTeX auto-render error:", err);
    }
  }
}

// Penanganan Tema Gelap & Terang (Persisten & Reaktif)
function initTheme() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");

  const updateThemeUI = (theme) => {
    if (themeIcon && themeText) {
      if (theme === "dark") {
        themeIcon.textContent = "☀️";
        themeText.textContent = "Mode Terang";
      } else {
        themeIcon.textContent = "🌙";
        themeText.textContent = "Mode Gelap";
      }
    }
  };

  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  updateThemeUI(currentTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const activeTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", activeTheme);
      localStorage.setItem("theme", activeTheme);
      updateThemeUI(activeTheme);

      // Render ulang chart & graf SVG dengan skema warna tema baru
      if (lastFullResult && lastFullResult.strategies) {
        renderBarChart(lastFullResult.strategies);
        renderDynamicMorphology(lastFullResult);
      }
      renderGraph();
    });
  }
}

function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      requestAnimationFrame(() => {
        tabBtns.forEach(b => b.classList.remove("active"));
        tabPanes.forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        const targetPane = document.getElementById(targetId);
        if (targetPane) {
          targetPane.classList.add("active");
          initMath(targetPane);
        }
      });
    });
  });
}

function initSliders() {
  const tauSlider = document.getElementById("paramTau");
  const tauVal = document.getElementById("tauVal");
  if (tauSlider && tauVal) {
    tauSlider.addEventListener("input", () => {
      tauVal.textContent = parseFloat(tauSlider.value).toFixed(2);
      handleSliderChange();
    });
  }

  const alphaSlider = document.getElementById("paramAlpha");
  const alphaVal = document.getElementById("alphaVal");
  if (alphaSlider && alphaVal) {
    alphaSlider.addEventListener("input", () => {
      alphaVal.textContent = parseFloat(alphaSlider.value).toFixed(2);
      handleSliderChange();
    });
  }

  const deltaSlider = document.getElementById("paramDelta");
  const deltaVal = document.getElementById("deltaVal");
  if (deltaSlider && deltaVal) {
    deltaSlider.addEventListener("input", () => {
      deltaVal.textContent = parseFloat(deltaSlider.value).toFixed(2);
      handleSliderChange();
    });
  }
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
  if (btnRun) {
    btnRun.addEventListener("click", () => {
      runSearch();
    });
  }

  // Dukungan tombol Enter langsung di setiap kotak angka
  ["num1", "num2", "num3", "num4"].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          runSearch();
        }
      });
    }
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function runSearch() {
  if (isSearching) return;
  isSearching = true;

  let n1 = parseInt(document.getElementById("num1").value) || 1;
  let n2 = parseInt(document.getElementById("num2").value) || 2;
  let n3 = parseInt(document.getElementById("num3").value) || 3;
  let n4 = parseInt(document.getElementById("num4").value) || 4;

  // Sanitasi & pembatasan rentang [1, 99] untuk proteksi Algorithmic Complexity DoS
  n1 = Math.min(99, Math.max(1, n1));
  n2 = Math.min(99, Math.max(1, n2));
  n3 = Math.min(99, Math.max(1, n3));
  n4 = Math.min(99, Math.max(1, n4));
  document.getElementById("num1").value = n1;
  document.getElementById("num2").value = n2;
  document.getElementById("num3").value = n3;
  document.getElementById("num4").value = n4;

  const tau = parseFloat(document.getElementById("paramTau").value) || 0.40;
  const alpha = parseFloat(document.getElementById("paramAlpha").value) || 0.30;
  const delta = parseFloat(document.getElementById("paramDelta").value) || 0.25;

  const spinner = document.getElementById("searchSpinner");
  if (spinner) spinner.classList.remove("hidden");

  // Penjadwalan asynchronous dengan requestAnimationFrame agar rendering UI tidak membeku
  requestAnimationFrame(() => {
    setTimeout(() => {
      const results = runClientSideSearch([n1, n2, n3, n4], 24, tau, alpha, delta);
      requestAnimationFrame(() => {
        updateUIWithResults(results);
        if (spinner) spinner.classList.add("hidden");
        isSearching = false;
      });
    }, 0);
  });
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

  document.getElementById("kpiPeakMemory").textContent = `${strats.aegts.peak_frontier} verteks`;
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
    const histStr = strats.aegts.entropy_history.join(", ");
    const hSymbol = renderTeX("\\bar{\\mathcal{H}}");
    entropyTrack.innerHTML = `<small>Rerata Entropi Shannon (${hSymbol}): <strong>${avgH}</strong> &nbsp;|&nbsp; Riwayat: [${histStr}]</small>`;
  }

  // 3. Render Visual Bar Chart
  renderBarChart(strats);

  // 4. Render Thought Tree
  renderThoughtTree(strats.aegts, data.input_numbers);

  // 5. Render Dynamic Morphology & Method Decompositions (Page 2)
  renderDynamicMorphology(data);
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
  if (nodes) nodes.textContent = `${strat.nodes_evaluated} verteks`;
  if (time) time.textContent = `${strat.execution_time_ms} ms`;
  if (mem) mem.textContent = `${strat.peak_frontier} verteks`;
  if (expr) {
    if (strat.success && strat.expression) {
      const tex = `${formatArithmeticToTeX(strat.expression, true)} = 24`;
      expr.style.opacity = "1";
      expr.innerHTML = renderTeX(tex);
    } else {
      expr.textContent = "Solusi Tidak Ditemukan";
      expr.style.opacity = "0.5";
    }
  }
}

function renderBarChart(strats) {
  const container = document.getElementById("barChartContainer");
  if (!container) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  const items = [
    { label: "Linear CoT", val: strats.cot.nodes_evaluated, color: isDark ? "#6B9AC4" : "#8CB3D9", stroke: isDark ? "#8AB3D8" : "#749EC6" },
    { label: "Pure ToT-BFS", val: strats.bfs.nodes_evaluated, color: isDark ? "#5288BE" : "#6EA2D4", stroke: isDark ? "#76A6D6" : "#5587B8" },
    { label: "Pure ToT-DFS", val: strats.dfs.nodes_evaluated, color: isDark ? "#D25F4E" : "#DE7464", stroke: isDark ? "#E57766" : "#C75D4E" },
    { label: "AEGTS", val: strats.aegts.nodes_evaluated, color: isDark ? "#F09A7A" : "#E59678", stroke: isDark ? "#F8B196" : "#D4805F", highlight: true }
  ];

  const maxVal = Math.max(...items.map(d => d.val), 10);
  const chartHeight = 150;
  const barWidth = 62;
  const gap = 52;
  const startX = 60;
  const baselineY = 185;

  const valTextColor = isDark ? "#F8FAFC" : "#2D323E";
  const labelTextColor = isDark ? "#CBD5E1" : "#525968";
  const baselineColor = isDark ? "#334155" : "#E2D6CD";
  const shadowColor = isDark ? "#000000" : "#8C6E63";
  const shadowOpacity = isDark ? "0.45" : "0.14";

  let barsHtml = "";

  items.forEach((item, idx) => {
    const x = startX + idx * (barWidth + gap);
    const height = Math.max(16, (item.val / maxVal) * chartHeight);
    const y = baselineY - height;

    barsHtml += `
      <g class="bar-group">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="10" fill="${item.color}" 
              opacity="${item.highlight ? '1' : '0.88'}" 
              stroke="${item.stroke}" stroke-width="${item.highlight ? '2.5' : '1.5'}"
              filter="url(#barShadow)">
        </rect>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" fill="${valTextColor}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700">
          ${item.val}
        </text>
        <text x="${x + barWidth / 2}" y="${baselineY + 22}" text-anchor="middle" fill="${labelTextColor}" font-family="'Plus Jakarta Sans', sans-serif" font-size="11.5" font-weight="${item.highlight ? '700' : '600'}">
          ${item.label}
        </text>
      </g>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 540 230" class="bar-chart-svg">
      <defs>
        <filter id="barShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="${shadowColor}" flood-opacity="${shadowOpacity}" />
        </filter>
      </defs>
      <line x1="30" y1="${baselineY}" x2="520" y2="${baselineY}" stroke="${baselineColor}" stroke-width="1.5" stroke-linecap="round"></line>
      ${barsHtml}
    </svg>
  `;
}

function renderThoughtTree(aegtsData, initialNums) {
  const container = document.getElementById("treeContainer");
  if (!container) return;

  if (!aegtsData.success || !aegtsData.steps || aegtsData.steps.length === 0) {
    container.innerHTML = `
      <div class="tree-node-card">
        <span class="text-muted">Solusi tidak ditemukan dengan kombinasi parameter saat ini. Coba sesuaikan nilai ambang batas.</span>
      </div>
    `;
    return;
  }

  const s0Tex = renderTeX(`s_0 = [${initialNums.join(", ")}]`);
  const v0Tex = renderTeX("V(s_0) = 0.50");

  let html = `
    <div class="tree-node-card root">
      <div class="tree-node-left">
        <span class="tree-node-badge">Tingkat 0 (Akar)</span>
        <strong>Keadaan Awal: ${s0Tex}</strong>
      </div>
      <span class="badge badge-info">${v0Tex}</span>
    </div>
  `;

  aegtsData.steps.forEach((step, idx) => {
    const isGoal = idx === aegtsData.steps.length - 1;
    const hVal = aegtsData.entropy_history && idx < aegtsData.entropy_history.length
      ? aegtsData.entropy_history[idx]
      : null;

    const entropyBadge = hVal !== null
      ? `<span class="badge badge-accent">${renderTeX(`\\bar{\\mathcal{H}} = ${hVal}`)}</span>`
      : "";

    html += `
      <div class="tree-node-card ${isGoal ? 'goal' : ''}">
        <div class="tree-node-left">
          <span class="tree-node-badge">Tingkat ${idx + 1}</span>
          <span class="tree-node-step">${formatStepAction(step)}</span>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          ${entropyBadge}
          ${isGoal ? '<span class="badge badge-success">Target 24 Tercapai</span>' : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ============================================================================
// 6. DYNAMIC MORPHOLOGY & METHOD DECOMPOSITIONS (PAGE 2)
// ============================================================================

function initMorphologySubtabs() {
  const subtabBtns = document.querySelectorAll(".morphology-subtab-btn");
  const subpanes = document.querySelectorAll(".morphology-subpane");

  subtabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetSubtab = btn.getAttribute("data-subtab");
      requestAnimationFrame(() => {
        subtabBtns.forEach(b => b.classList.remove("active"));
        subpanes.forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        const targetPane = document.getElementById(`subpane-${targetSubtab}`);
        if (targetPane) {
          targetPane.classList.add("active");
          initMath(targetPane);
        }
      });
    });
  });

  // Quick Preset Buttons in Page 2 Header
  const quickPresetBtns = document.querySelectorAll("#morphQuickPresetButtons .btn-quick-preset");
  quickPresetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const rawNums = btn.getAttribute("data-nums");
      if (!rawNums) return;
      const parts = rawNums.split(",").map(Number);
      if (parts.length === 4) {
        document.getElementById("num1").value = parts[0];
        document.getElementById("num2").value = parts[1];
        document.getElementById("num3").value = parts[2];
        document.getElementById("num4").value = parts[3];

        // Sync preset buttons in Page 1
        const p1Btns = document.querySelectorAll(".btn-preset");
        p1Btns.forEach(b => {
          if (b.getAttribute("data-nums") === rawNums) b.classList.add("active");
          else b.classList.remove("active");
        });

        quickPresetBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        runSearch();
      }
    });
  });
}

function formatActionShort(action) {
  if (!action) return "";
  const m = action.match(/^([a-z_]+):\s*(.+?)\s*&\s*(.+?)\s*->\s*(.+)$/);
  if (m) {
    const op = m[1];
    let ea = m[2].trim();
    let eb = m[3].trim();
    let res = m[4].trim();
    let opSym = "+";
    if (op === "kali") opSym = "×";
    else if (op.startsWith("kurang")) opSym = "-";
    else if (op.startsWith("bagi")) opSym = "÷";
    return `${ea}${opSym}${eb}=${res}`;
  }
  return action;
}

function renderMorphSvgCot(cot, nums, isDetail = false) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const chain = cot.chainNodes && cot.chainNodes.length > 0 ? cot.chainNodes : [
    { depth: 0, numbers: nums.map(String), action: "Akar (Root)" },
    { depth: 1, numbers: [nums[0] + nums[1], nums[2], nums[3]], action: `${nums[0]}+${nums[1]}` },
    { depth: 2, numbers: [24], action: "Solusi" }
  ];

  const w = isDetail ? 760 : 520;
  const h = isDetail ? 140 : 135;
  const arrowColor = isDark ? "#94A3B8" : "#64748B";
  const dangerArrow = isDark ? "#F87171" : "#EF4444";

  const numNodes = chain.length;
  const boxW = isDetail ? 115 : 95;
  const boxH = 48;
  const gap = numNodes > 1 ? (w - 40 - (numNodes * boxW)) / (numNodes - 1) : 40;

  let nodesSvg = "";
  let edgesSvg = "";

  chain.forEach((node, idx) => {
    const x = 20 + idx * (boxW + gap);
    const y = 30;
    const isRoot = idx === 0;
    const isTerminal = idx === chain.length - 1;
    const isSuccess = cot.success && isTerminal;
    const isFailed = !cot.success && isTerminal;

    let boxClass = "svg-node-box";
    let titleClass = "svg-node-title";
    let valClass = "svg-node-val";

    if (isRoot) boxClass += " root-box";
    else if (isSuccess) boxClass += " goal-box";
    else if (isFailed) boxClass += " danger-box";

    const titleText = isRoot ? "Aras 0 (Root)" : isTerminal ? `Aras ${idx} (Terminal)` : `Aras ${idx}`;
    const valText = isTerminal 
      ? (isSuccess ? `[${node.numbers.join(", ")}] ✅` : `[${node.numbers.join(", ")}] ❌`)
      : `[${node.numbers.join(", ")}]`;

    nodesSvg += `
      <g class="m-node" transform="translate(${x}, ${y})">
        <rect width="${boxW}" height="${boxH}" rx="12" class="${boxClass}" />
        <text x="${boxW / 2}" y="20" class="${titleClass}" text-anchor="middle">${titleText}</text>
        <text x="${boxW / 2}" y="36" class="${valClass}" text-anchor="middle">${escapeHtml(valText)}</text>
      </g>
    `;

    if (idx < chain.length - 1) {
      const nextX = 20 + (idx + 1) * (boxW + gap);
      const edgeStart = x + boxW;
      const edgeEnd = nextX;
      const nextIsLast = (idx + 1) === chain.length - 1;
      const isBadEdge = nextIsLast && !cot.success;
      const markerId = isBadEdge ? "arrowFailCot" : "arrowCoT";
      const strokeColor = isBadEdge ? dangerArrow : arrowColor;
      const dash = isBadEdge ? 'stroke-dasharray="4,3"' : "";

      const shortOp = formatActionShort(chain[idx + 1].action);

      edgesSvg += `
        <line x1="${edgeStart}" y1="${y + boxH / 2}" x2="${edgeEnd}" y2="${y + boxH / 2}" stroke="${strokeColor}" stroke-width="2.5" ${dash} marker-end="url(#${markerId})" />
        <text x="${(edgeStart + edgeEnd) / 2}" y="${y + boxH / 2 - 8}" class="svg-edge-label" text-anchor="middle">${escapeHtml(shortOp)}</text>
      `;
    }
  });

  const captionText = `Urutan Edge: Rantai tunggal tanpa percabangan (${chain.length - 1} edge). Panjang rantai k = ${chain.length - 1}, greedy murni.`;

  return `
    <svg viewBox="0 0 ${w} ${h}" class="morphology-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowCoT" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="${arrowColor}" />
        </marker>
        <marker id="arrowFailCot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="${dangerArrow}" />
        </marker>
      </defs>
      ${edgesSvg}
      ${nodesSvg}
      <text x="${w / 2}" y="${h - 10}" class="svg-caption" text-anchor="middle">${captionText}</text>
    </svg>
  `;
}

function renderMorphSvgBfs(bfs, nums, isDetail = false) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const w = isDetail ? 760 : 520;
  const h = isDetail ? 210 : 185;
  const arrowColor = isDark ? "#38BDF8" : "#6EA2D4";
  const dashColor = isDark ? "#475569" : "#94A3B8";

  const rootW = isDetail ? 140 : 120;
  const rootH = 36;
  const rootX = (w - rootW) / 2;
  const rootY = 12;

  const l1Count = 4;
  const l1BoxW = isDetail ? 115 : 95;
  const l1BoxH = 34;
  const l1Gap = (w - 30 - (l1Count * l1BoxW)) / (l1Count - 1);
  const l1Y = isDetail ? 88 : 82;

  const n1 = nums[0], n2 = nums[1];
  const l1Defaults = [
    { label: `${n1}+${n2}`, nums: [n1 + n2, nums[2], nums[3]] },
    { label: `${n1}-${n2}`, nums: [Math.abs(n1 - n2), nums[2], nums[3]] },
    { label: `${n1}×${n2}`, nums: [n1 * n2, nums[2], nums[3]] },
    { label: `${n1}÷${n2}`, nums: [n2 !== 0 ? Math.round(n1 / n2) : 1, nums[2], nums[3]] }
  ];

  let l1Svg = "";
  let l1Lines = "";
  let l2Lines = "";

  for (let i = 0; i < l1Count; i++) {
    const bx = 15 + i * (l1BoxW + l1Gap);
    const item = l1Defaults[i];

    l1Lines += `
      <line x1="${w / 2 + (i - 1.5) * 20}" y1="${rootY + rootH}" x2="${bx + l1BoxW / 2}" y2="${l1Y}" stroke="${arrowColor}" stroke-width="2" marker-end="url(#arrowBfs)" />
    `;

    l1Svg += `
      <g class="m-node" transform="translate(${bx}, ${l1Y})">
        <rect width="${l1BoxW}" height="${l1BoxH}" rx="8" class="svg-node-box bfs-box" />
        <text x="${l1BoxW / 2}" y="21" class="svg-node-val" text-anchor="middle">[${item.nums.join(",")}] (${item.label})</text>
      </g>
    `;

    l2Lines += `
      <line x1="${bx + l1BoxW / 2}" y1="${l1Y + l1BoxH}" x2="${bx + l1BoxW / 2 - 18}" y2="${l1Y + l1BoxH + 24}" stroke="${dashColor}" stroke-width="1.5" stroke-dasharray="3,3" />
      <line x1="${bx + l1BoxW / 2}" y1="${l1Y + l1BoxH}" x2="${bx + l1BoxW / 2 + 18}" y2="${l1Y + l1BoxH + 24}" stroke="${dashColor}" stroke-width="1.5" stroke-dasharray="3,3" />
    `;
  }

  const caption = bfs.success
    ? `Urutan Edge: Ekstraksi Lapis 1 menyeluruh (FIFO) ➔ ekspansi Lapis 2 ➔ Rute Geodesik Target 24 Tercapai (${bfs.nodes_evaluated} verteks dievaluasi).`
    : `Urutan Edge: Ekstraksi Lapis 1 menyeluruh (FIFO) ➔ baru ekspansi cabang Lapis 2 secara rimbun.`;

  return `
    <svg viewBox="0 0 ${w} ${h}" class="morphology-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowBfs" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="${arrowColor}" />
        </marker>
      </defs>
      <g class="m-node" transform="translate(${rootX}, ${rootY})">
        <rect width="${rootW}" height="${rootH}" rx="10" class="svg-node-box root-box" />
        <text x="${rootW / 2}" y="22" class="svg-node-val" text-anchor="middle">[${nums.join(", ")}] (Root)</text>
      </g>
      ${l1Lines}
      ${l1Svg}
      ${l2Lines}
      <text x="${w / 2}" y="${h - 8}" class="svg-caption" text-anchor="middle">${caption}</text>
    </svg>
  `;
}

function renderMorphSvgDfs(dfs, nums, isDetail = false) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const w = isDetail ? 760 : 520;
  const h = isDetail ? 210 : 185;
  const diveArrow = isDark ? "#E57766" : "#DE7464";
  const backArrow = isDark ? "#F87171" : "#EF4444";
  const succArrow = isDark ? "#34D399" : "#529F79";

  const rootW = isDetail ? 140 : 120;
  const rootH = 34;
  const rootX = (w - rootW) / 2;
  const rootY = 10;

  const leftX = isDetail ? 70 : 45;
  const boxW = isDetail ? 120 : 105;
  const boxH = 30;
  const rightX = w - leftX - boxW;

  const n1 = nums[0], n2 = nums[1];
  const deepNum1 = n1 * n2;
  const deepNum2 = deepNum1 * (nums[2] || 6);

  const caption = dfs.success
    ? `Urutan Edge: Penyelaman vertikal LIFO hingga mentok ➔ Backtrack berulang-ulang ➔ Solusi ditemukan (${dfs.nodes_evaluated} verteks).`
    : `Urutan Edge: Penyelaman vertikal LIFO hingga mentok ➔ Backtrack mundur berulang-ulang.`;

  return `
    <svg viewBox="0 0 ${w} ${h}" class="morphology-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowDfs" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="${diveArrow}" />
        </marker>
        <marker id="arrowBackDfs" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="${backArrow}" />
        </marker>
        <marker id="arrowSuccDfs" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="${succArrow}" />
        </marker>
      </defs>

      <g class="m-node" transform="translate(${rootX}, ${rootY})">
        <rect width="${rootW}" height="${rootH}" rx="10" class="svg-node-box root-box" />
        <text x="${rootW / 2}" y="21" class="svg-node-val" text-anchor="middle">[${nums.join(", ")}] (Root)</text>
      </g>

      <line x1="${rootX + 15}" y1="${rootY + rootH}" x2="${leftX + boxW / 2}" y2="68" stroke="${diveArrow}" stroke-width="2.5" marker-end="url(#arrowDfs)" />
      <g class="m-node" transform="translate(${leftX}, 68)">
        <rect width="${boxW}" height="${boxH}" rx="8" class="svg-node-box" />
        <text x="${boxW / 2}" y="19" class="svg-node-val" text-anchor="middle">1. [${deepNum1}, ${nums[2]}, ${nums[3]}]</text>
      </g>

      <line x1="${leftX + boxW / 2}" y1="98" x2="${leftX + boxW / 2}" y2="116" stroke="${diveArrow}" stroke-width="2.5" marker-end="url(#arrowDfs)" />
      <g class="m-node" transform="translate(${leftX}, 116)">
        <rect width="${boxW}" height="${boxH}" rx="8" class="svg-node-box danger-box" />
        <text x="${boxW / 2}" y="19" class="svg-node-val text-red" text-anchor="middle">2. [${deepNum2}] ❌ Buntu</text>
      </g>

      <path d="M ${leftX + boxW} 128 C ${w / 2} 125, ${w / 2} 48, ${rootX + 10} 35" fill="none" stroke="${backArrow}" stroke-width="2" stroke-dasharray="5,4" marker-end="url(#arrowBackDfs)" />
      <text x="${w / 2}" y="82" class="svg-edge-label text-red" text-anchor="middle">3. Backtrack ke Root</text>

      <line x1="${rootX + rootW - 15}" y1="${rootY + rootH}" x2="${rightX + boxW / 2}" y2="68" stroke="${succArrow}" stroke-width="2" stroke-dasharray="3,3" marker-end="url(#arrowSuccDfs)" />
      <g class="m-node" transform="translate(${rightX}, 68)">
        <rect width="${boxW + 15}" height="${boxH}" rx="8" class="svg-node-box success-box" />
        <text x="${(boxW + 15) / 2}" y="19" class="svg-node-val text-emerald" text-anchor="middle">4. Cabang Alternatif</text>
      </g>

      <line x1="${rightX + (boxW + 15) / 2}" y1="98" x2="${rightX + (boxW + 15) / 2}" y2="116" stroke="${succArrow}" stroke-width="2.5" marker-end="url(#arrowSuccDfs)" />
      <g class="m-node" transform="translate(${rightX - 10}, 116)">
        <rect width="${boxW + 35}" height="${boxH}" rx="8" class="svg-node-box goal-box" />
        <text x="${(boxW + 35) / 2}" y="19" class="svg-node-val text-emerald font-bold" text-anchor="middle">5. 🎉 Target 24 Solusi</text>
      </g>

      <text x="${w / 2}" y="${h - 8}" class="svg-caption" text-anchor="middle">${caption}</text>
    </svg>
  `;
}

function renderMorphSvgAegts(aegts, nums, tau = 0.40, alpha = 0.30, delta = 0.25, isDetail = false) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const w = isDetail ? 760 : 520;
  const h = isDetail ? 210 : 185;
  const arrowColor = isDark ? "#34D399" : "#529F79";

  const rootW = isDetail ? 230 : 200;
  const rootH = 36;
  const rootX = (w - rootW) / 2;
  const rootY = 8;

  const h0 = aegts.entropy_history && aegts.entropy_history.length > 0 ? aegts.entropy_history[0] : 0.65;
  const condText = h0 >= tau ? `H̄ = ${h0} ≥ τ` : `H̄ = ${h0} < τ`;

  const leftBoxW = isDetail ? 210 : 180;
  const rightBoxW = isDetail ? 240 : 220;
  const boxH = 42;

  const leftX = isDetail ? 40 : 20;
  const rightX = w - leftX - rightBoxW;

  const n1 = nums[0], n2 = nums[1];
  const badExample = `${n1}×${n2}=${n1 * n2}`;
  const goodExample = `${n1}+${n2}=${n1 + n2}`;

  const exprText = aegts.success && aegts.expression
    ? `${aegts.expression.replace(/\*/g, '×')} = 24 🎉`
    : `(Target 24 Tercapai! 🎉)`;

  const caption = `Urutan Edge: BFS terpandu di akar ➔ pangkas cabang buruk (α-Pruning) ➔ DFS cepat langsung ke target.`;

  return `
    <svg viewBox="0 0 ${w} ${h}" class="morphology-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowAegts" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="${arrowColor}" />
        </marker>
      </defs>

      <g class="m-node" transform="translate(${rootX}, ${rootY})">
        <rect width="${rootW}" height="${rootH}" rx="10" class="svg-node-box root-box highlight-root" />
        <text x="${rootW / 2}" y="22" class="svg-node-val" text-anchor="middle">[${nums.join(", ")}] (${condText})</text>
      </g>

      <line x1="${rootX + 30}" y1="${rootY + rootH}" x2="${leftX + leftBoxW / 2}" y2="72" stroke="#94A3B8" stroke-width="2" stroke-dasharray="3,3" />
      <g class="m-node" transform="translate(${leftX}, 72)">
        <rect width="${leftBoxW}" height="${boxH}" rx="10" class="svg-node-box pruned-box" />
        <text x="${leftBoxW / 2}" y="18" class="svg-node-val text-muted" text-anchor="middle">Cabang [${badExample}, ...]</text>
        <text x="${leftBoxW / 2}" y="33" class="svg-node-sub text-red" text-anchor="middle">✂️ α-Pruning (Dipangkas!)</text>
      </g>

      <line x1="${rootX + rootW - 30}" y1="${rootY + rootH}" x2="${rightX + rightBoxW / 2}" y2="72" stroke="${arrowColor}" stroke-width="3" marker-end="url(#arrowAegts)" />
      <g class="m-node" transform="translate(${rightX}, 72)">
        <rect width="${rightBoxW}" height="${boxH}" rx="10" class="svg-node-box success-box" />
        <text x="${rightBoxW / 2}" y="18" class="svg-node-val text-emerald font-bold" text-anchor="middle">Cabang [${goodExample}] (V ≥ α ✅)</text>
        <text x="${rightBoxW / 2}" y="33" class="svg-node-sub text-emerald" text-anchor="middle">Ambiguitas Turun: H̄ &lt; τ ➔ Beralih ke DFS</text>
      </g>

      <line x1="${rightX + rightBoxW / 2}" y1="${72 + boxH}" x2="${rightX + rightBoxW / 2}" y2="132" stroke="${arrowColor}" stroke-width="3" marker-end="url(#arrowAegts)" />
      <g class="m-node" transform="translate(${rightX}, 132)">
        <rect width="${rightBoxW}" height="32" rx="8" class="svg-node-box goal-box" />
        <text x="${rightBoxW / 2}" y="20" class="svg-node-val text-emerald font-bold" text-anchor="middle">${escapeHtml(exprText)}</text>
      </g>

      <text x="${leftX + leftBoxW / 2}" y="142" class="svg-caption text-emerald font-bold" text-anchor="middle">Paling Efisien!</text>
      <text x="${w / 2}" y="${h - 8}" class="svg-caption" text-anchor="middle">${caption}</text>
    </svg>
  `;
}

function generateMermaidCot(cot, nums) {
  if (!cot.chainNodes || cot.chainNodes.length < 2) {
    return `graph LR\n  A["[${nums.join(", ")}] (Root)"] --> B["Solusi"]`;
  }
  const lines = ["graph LR"];
  cot.chainNodes.forEach((node, i) => {
    const letter = String.fromCharCode(65 + i);
    const label = i === 0 ? `[${node.numbers.join(", ")}] (Root)` : `[${node.numbers.join(", ")}]`;
    if (i < cot.chainNodes.length - 1) {
      const nextLetter = String.fromCharCode(66 + i);
      const nextNode = cot.chainNodes[i + 1];
      const op = formatActionShort(nextNode.action);
      lines.push(`  ${letter}["${label}"] -->|"${op}"| ${nextLetter}["[${nextNode.numbers.join(", ")}]"]`);
    }
  });
  return lines.join("\n");
}

function generateMermaidBfs(bfs, nums) {
  const n1 = nums[0], n2 = nums[1];
  return `graph TD
  Root["[${nums.join(", ")}] (Root)"]
  Root --> B1["[${n1 + n2}, ...] (${n1}+${n2})"]
  Root --> B2["[${Math.abs(n1 - n2)}, ...] (${n1}-${n2})"]
  Root --> B3["[${n1 * n2}, ...] (${n1}*${n2})"]
  Root --> B4["[${n2 !== 0 ? Math.round(n1 / n2) : 1}, ...] (${n1}/${n2})"]
  B1 --> C1["Aras 2 Lapis FIFO"]
  B3 --> C2["Cabang Melebar (Boros Evaluasi)"]`;
}

function generateMermaidDfs(dfs, nums) {
  const n1 = nums[0], n2 = nums[1];
  return `graph TD
  Root["[${nums.join(", ")}] (Root)"]
  Root -->|1. Selam Utama LIFO| D1["[${n1 * n2}, ...]"]
  D1 -->|2. Selam Dalam| D2["Daun Terminal"]
  D2 -->|3. Dead End| D3["❌ Buntu"]
  D3 -.->|4. Backtrack Buta| Root
  Root -->|5. Coba Ulang| D4["Cabang Alternatif ✅"]`;
}

function generateMermaidAegts(aegts, nums, tau, alpha) {
  const h0 = aegts.entropy_history && aegts.entropy_history.length > 0 ? aegts.entropy_history[0] : 0.65;
  const n1 = nums[0], n2 = nums[1];
  return `graph TD
  Root["[${nums.join(", ")}] (H̄ = ${h0} ${h0 >= tau ? '>=' : '<'} tau)"]
  Root -->|Mode BFS: Cabang Prospek| S1["[${n1 + n2}, ...] (V >= alpha ✅ Lolos)"]
  Root -.->|alpha-Pruning| S2["[${n1 * n2}, ...] ✂️ Dipangkas"]
  Root -.->|alpha-Pruning| S3["Cabang Buruk ✂️ Dipangkas"]
  S1 -->|Mode DFS: H̄ < tau (Cepat)| Goal["${aegts.expression || '24'} 🎉 Target"]`;
}

function renderCotTable(cot) {
  const tbody = document.querySelector("#cotTransitionTable tbody");
  if (!tbody) return;
  if (!cot.chainNodes || cot.chainNodes.length < 2) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Data lintasan rantai belum tersedia.</td></tr>`;
    return;
  }
  let html = "";
  for (let i = 0; i < cot.chainNodes.length - 1; i++) {
    const fromNode = cot.chainNodes[i];
    const toNode = cot.chainNodes[i + 1];
    const op = formatActionShort(toNode.action);
    const valTex = (toNode.value || 0).toFixed(2);
    html += `
      <tr>
        <td><strong>t_${i + 1}</strong></td>
        <td><code>[${fromNode.numbers.join(", ")}]</code></td>
        <td><strong class="text-clay">${escapeHtml(op)}</strong></td>
        <td><code>[${toNode.numbers.join(", ")}]</code></td>
        <td><span class="badge badge-info">V = ${valTex}</span></td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
}

function renderBfsQueueTable(bfs, nums) {
  const tbody = document.querySelector("#bfsQueueTable tbody");
  if (!tbody) return;
  if (!bfs.queueHistory || bfs.queueHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Data antrean FIFO belum tersedia.</td></tr>`;
    return;
  }
  let html = "";
  bfs.queueHistory.forEach(q => {
    html += `
      <tr>
        <td><strong>Aras ${q.level}</strong></td>
        <td><strong>${q.expanded} verteks</strong></td>
        <td>${q.generated} cabang</td>
        <td><code>|Q| = ${q.queueSize}</code></td>
        <td><small>${escapeHtml(q.sample)}</small></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderDfsStackTable(dfs, nums) {
  const tbody = document.querySelector("#dfsStackTable tbody");
  if (!tbody) return;
  if (!dfs.stackHistory || dfs.stackHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Data tumpukan LIFO belum tersedia.</td></tr>`;
    return;
  }
  let html = "";
  dfs.stackHistory.forEach((s, idx) => {
    html += `
      <tr>
        <td><strong>Fase ${idx + 1}</strong></td>
        <td><code>${escapeHtml(formatActionShort(s.active))}</code></td>
        <td><code>|S| = ${s.stackSize}</code></td>
        <td>${escapeHtml(s.actionDesc)}</td>
        <td><span class="badge badge-accent">LIFO</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderAegtsEntropyTable(aegts, tau, alpha) {
  const tbody = document.querySelector("#aegtsEntropyTable tbody");
  if (!tbody) return;
  if (!aegts.entropySchedule || aegts.entropySchedule.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Data riwayat entropi belum tersedia.</td></tr>`;
    return;
  }
  let html = "";
  aegts.entropySchedule.forEach(e => {
    const isBfs = e.entropy >= tau;
    const condBadge = isBfs 
      ? `<span class="badge badge-info">H̄ ≥ τ (${e.entropy} ≥ ${tau})</span>`
      : `<span class="badge badge-success">H̄ &lt; τ (${e.entropy} &lt; ${tau})</span>`;
    const pruneDesc = isBfs ? `α-Pruning aktif (V &lt; ${alpha})` : "Penyelaman terarah DFS (Hemat token)";
    html += `
      <tr>
        <td><strong>Aras ${e.depth}</strong></td>
        <td><strong>${e.entropy}</strong></td>
        <td>${condBadge}</td>
        <td><strong class="${isBfs ? 'text-cyan' : 'text-emerald'}">${e.mode}</strong></td>
        <td>${pruneDesc}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderDynamicMorphology(data) {
  if (!data || !data.strategies) return;
  const nums = data.input_numbers || [4, 1, 3, 2];
  const target = data.target || 24;
  const strats = data.strategies;
  const cot = strats.cot;
  const bfs = strats.bfs;
  const dfs = strats.dfs;
  const aegts = strats.aegts;

  const tau = parseFloat(document.getElementById("paramTau") ? document.getElementById("paramTau").value : 0.40) || 0.40;
  const alpha = parseFloat(document.getElementById("paramAlpha") ? document.getElementById("paramAlpha").value : 0.30) || 0.30;
  const delta = parseFloat(document.getElementById("paramDelta") ? document.getElementById("paramDelta").value : 0.25) || 0.25;

  // 1. Header Information Update
  const caseBadge = document.getElementById("morphologyActiveCaseBadge");
  if (caseBadge) {
    caseBadge.textContent = `[${nums.join(", ")}] → Target ${target}`;
  }
  const activeBadge = document.getElementById("morphologyActiveBadge");
  if (activeBadge) {
    activeBadge.textContent = `Kasus Aktif: [${nums.join(", ")}]`;
  }

  // 2. Subtab Pills Status
  const setPill = (id, success) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = success ? "SOLVED" : "FAILED";
      el.className = `subtab-pill-status ${success ? "solved" : "failed"}`;
    }
  };
  setPill("subtabPillCot", cot.success);
  setPill("subtabPillBfs", bfs.success);
  setPill("subtabPillDfs", dfs.success);
  setPill("subtabPillAegts", aegts.success);

  // 3. Subpane 0: Overview Cards (SVGs & Metadata)
  const svgWrapCot = document.getElementById("morphSvgWrapCot");
  if (svgWrapCot) svgWrapCot.innerHTML = renderMorphSvgCot(cot, nums, false);

  const svgWrapBfs = document.getElementById("morphSvgWrapBfs");
  if (svgWrapBfs) svgWrapBfs.innerHTML = renderMorphSvgBfs(bfs, nums, false);

  const svgWrapDfs = document.getElementById("morphSvgWrapDfs");
  if (svgWrapDfs) svgWrapDfs.innerHTML = renderMorphSvgDfs(dfs, nums, false);

  const svgWrapAegts = document.getElementById("morphSvgWrapAegts");
  if (svgWrapAegts) svgWrapAegts.innerHTML = renderMorphSvgAegts(aegts, nums, tau, alpha, delta, false);

  // Overview Mermaid
  const setMermaid = (id, code) => {
    const el = document.getElementById(id);
    if (el) el.textContent = code;
  };
  setMermaid("morphMermaidCot", generateMermaidCot(cot, nums));
  setMermaid("morphMermaidBfs", generateMermaidBfs(bfs, nums));
  setMermaid("morphMermaidDfs", generateMermaidDfs(dfs, nums));
  setMermaid("morphMermaidAegts", generateMermaidAegts(aegts, nums, tau, alpha));

  // Overview Badges & Metadata
  const setBadge = (id, success) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = success ? "SOLVED" : "FAILED";
      el.className = `badge ${success ? "badge-success" : "badge-danger"}`;
    }
  };
  setBadge("badgeMorphCot", cot.success);
  setBadge("badgeMorphBfs", bfs.success);
  setBadge("badgeMorphDfs", dfs.success);
  setBadge("badgeMorphAegts", aegts.success);

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setText("metaNodesCot", `${cot.nodes_evaluated} verteks`);
  setText("metaMemCot", `${cot.peak_frontier} verteks`);
  setText("metaNodesBfs", `${bfs.nodes_evaluated} verteks`);
  setText("metaMemBfs", `${bfs.peak_frontier} verteks`);
  setText("metaNodesDfs", `${dfs.nodes_evaluated} verteks`);
  setText("metaMemDfs", `${dfs.peak_frontier} verteks`);
  setText("metaNodesAegts", `${aegts.nodes_evaluated} verteks (Optimal)`);
  setText("metaMemAegts", `${aegts.peak_frontier} verteks`);

  const calloutAegts = document.getElementById("calloutAegtsSavings");
  if (calloutAegts) {
    const sDfs = data.summary ? data.summary.aegts_savings_vs_dfs_pct : 0;
    const sBfs = data.summary ? data.summary.aegts_savings_vs_bfs_pct : 0;
    calloutAegts.innerHTML = `<strong>Efisiensi Cerdas:</strong> Menghemat <strong>${sDfs}%</strong> evaluasi verteks vs DFS dan <strong>${sBfs}%</strong> vs BFS untuk kasus [${nums.join(", ")}].`;
  }

  // Overview Table
  setText("tblNodesCot", `${cot.nodes_evaluated} verteks`);
  setText("tblNodesBfs", `${bfs.nodes_evaluated} verteks`);
  setText("tblNodesDfs", `${dfs.nodes_evaluated} verteks`);
  setText("tblNodesAegts", `${aegts.nodes_evaluated} verteks (Paling efisien)`);

  setText("tblMemCot", `${cot.peak_frontier} verteks`);
  setText("tblMemBfs", `${bfs.peak_frontier} verteks`);
  setText("tblMemDfs", `${dfs.peak_frontier} verteks`);
  setText("tblMemAegts", `${aegts.peak_frontier} verteks`);

  setText("tblTimeCot", `${cot.execution_time_ms} ms`);
  setText("tblTimeBfs", `${bfs.execution_time_ms} ms`);
  setText("tblTimeDfs", `${dfs.execution_time_ms} ms`);
  setText("tblTimeAegts", `${aegts.execution_time_ms} ms`);

  setText("tblStatusCot", cot.success ? "SOLVED ✅" : "FAILED ❌");
  setText("tblStatusBfs", bfs.success ? "SOLVED ✅" : "FAILED ❌");
  setText("tblStatusDfs", dfs.success ? "SOLVED ✅" : "FAILED ❌");
  setText("tblStatusAegts", aegts.success ? "SOLVED ✅" : "FAILED ❌");

  // 4. Subpane 1: Linear CoT Decomposition
  const cotSvgDetail = document.getElementById("cotDetailSvgContainer");
  if (cotSvgDetail) cotSvgDetail.innerHTML = renderMorphSvgCot(cot, nums, true);
  renderCotTable(cot);
  setText("cotDetailNodes", `${cot.nodes_evaluated} verteks`);
  setText("cotDetailMem", `${cot.peak_frontier} verteks`);
  setText("cotDetailTime", `${cot.execution_time_ms} ms`);
  setText("cotDetailLength", `${(cot.chainNodes ? cot.chainNodes.length - 1 : 3)} edge`);
  setMermaid("cotDetailMermaidCode", generateMermaidCot(cot, nums));
  setBadge("decompBadgeCot", cot.success);

  // 5. Subpane 2: Pure ToT-BFS Decomposition
  const bfsSvgDetail = document.getElementById("bfsDetailSvgContainer");
  if (bfsSvgDetail) bfsSvgDetail.innerHTML = renderMorphSvgBfs(bfs, nums, true);
  renderBfsQueueTable(bfs, nums);
  setText("bfsDetailNodes", `${bfs.nodes_evaluated} verteks`);
  setText("bfsDetailMem", `${bfs.peak_frontier} verteks`);
  setText("bfsDetailTime", `${bfs.execution_time_ms} ms`);
  setMermaid("bfsDetailMermaidCode", generateMermaidBfs(bfs, nums));
  setBadge("decompBadgeBfs", bfs.success);

  // 6. Subpane 3: Pure ToT-DFS Decomposition
  const dfsSvgDetail = document.getElementById("dfsDetailSvgContainer");
  if (dfsSvgDetail) dfsSvgDetail.innerHTML = renderMorphSvgDfs(dfs, nums, true);
  renderDfsStackTable(dfs, nums);
  setText("dfsDetailNodes", `${dfs.nodes_evaluated} verteks`);
  setText("dfsDetailMem", `${dfs.peak_frontier} verteks`);
  setText("dfsDetailTime", `${dfs.execution_time_ms} ms`);
  setMermaid("dfsDetailMermaidCode", generateMermaidDfs(dfs, nums));
  setBadge("decompBadgeDfs", dfs.success);

  // 7. Subpane 4: Adaptive AEGTS Decomposition
  const aegtsSvgDetail = document.getElementById("aegtsDetailSvgContainer");
  if (aegtsSvgDetail) aegtsSvgDetail.innerHTML = renderMorphSvgAegts(aegts, nums, tau, alpha, delta, true);
  renderAegtsEntropyTable(aegts, tau, alpha);
  setText("aegtsDetailNodes", `${aegts.nodes_evaluated} verteks`);
  setText("aegtsDetailSavingsDfs", `+${data.summary ? data.summary.aegts_savings_vs_dfs_pct : 0}%`);
  setText("aegtsDetailSavingsBfs", `+${data.summary ? data.summary.aegts_savings_vs_bfs_pct : 0}%`);
  setText("aegtsDetailMem", `${aegts.peak_frontier} verteks`);
  setMermaid("aegtsDetailMermaidCode", generateMermaidAegts(aegts, nums, tau, alpha));
  setBadge("decompBadgeAegts", aegts.success);

  // 8. Sync Quick Preset Active State in Page 2
  const numsJoined = nums.join(",");
  const quickBtns = document.querySelectorAll("#morphQuickPresetButtons .btn-quick-preset");
  quickBtns.forEach(btn => {
    if (btn.getAttribute("data-nums") === numsJoined) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

// ============================================================================
// 7. GRAPH TRACING LOGIC (BAB III: GRAF 8 TITIK)
// ============================================================================
let currentGraphMode = "orig";

function initGraphTracing() {
  renderGraph();
  renderTracingTable();

  const btnOrig = document.getElementById("btnModeOrig");
  const btnBfs = document.getElementById("btnModeBfs");
  const btnDfs = document.getElementById("btnModeDfs");
  const modeButtons = [btnOrig, btnBfs, btnDfs];

  const switchMode = (btn, mode) => {
    if (currentGraphMode === mode) return;
    requestAnimationFrame(() => {
      modeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentGraphMode = mode;
      renderGraph();
      renderTracingTable();
    });
  };

  if (btnOrig) btnOrig.addEventListener("click", () => switchMode(btnOrig, "orig"));
  if (btnBfs) btnBfs.addEventListener("click", () => switchMode(btnBfs, "bfs"));
  if (btnDfs) btnDfs.addEventListener("click", () => switchMode(btnDfs, "dfs"));
}

function renderGraph() {
  const svg = document.getElementById("graphSvg");
  if (!svg) return;
  const nodes = GRAPH_8_DATA.nodes;
  const edges = GRAPH_8_DATA.edges;
  const bfsData = GRAPH_8_DATA.bfs;
  const dfsData = GRAPH_8_DATA.dfs;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  let edgesHtml = "";

  edges.forEach(edge => {
    const u = nodeMap[edge.source];
    const v = nodeMap[edge.target];
    if (!u || !v) return;

    let strokeColor = isDark ? "#404E67" : "#C8BEB6";
    let strokeWidth = "2.5";
    let strokeDash = "none";
    let opacity = isDark ? "0.85" : "0.75";

    const edgePair = [edge.source, edge.target];
    const isEdgeInList = (list) => list.some(p => (p[0] === edgePair[0] && p[1] === edgePair[1]) || (p[0] === edgePair[1] && p[1] === edgePair[0]));

    if (currentGraphMode === "bfs") {
      if (isEdgeInList(bfsData.tree_edges)) {
        strokeColor = isDark ? "#4ADE80" : "#529F79";
        strokeWidth = "4";
        opacity = "1";
      } else {
        strokeColor = isDark ? "#28354A" : "#D5CAC0";
        strokeDash = "6,5";
        strokeWidth = "2";
        opacity = isDark ? "0.7" : "0.6";
      }
    } else if (currentGraphMode === "dfs") {
      if (isEdgeInList(dfsData.tree_edges)) {
        strokeColor = isDark ? "#FB923C" : "#E59678";
        strokeWidth = "4";
        opacity = "1";
      } else {
        strokeColor = isDark ? "#F87171" : "#DE6B6B";
        strokeDash = "6,4";
        strokeWidth = "2.5";
        opacity = "0.95";
      }
    }

    edgesHtml += `
      <line x1="${u.x}" y1="${u.y}" x2="${v.x}" y2="${v.y}" 
            stroke="${strokeColor}" stroke-width="${strokeWidth}" 
            stroke-dasharray="${strokeDash}" opacity="${opacity}"
            stroke-linecap="round">
      </line>
    `;
  });

  let nodesHtml = "";

  nodes.forEach(n => {
    const isRoot = n.id === "a";
    let gradId = isDark ? "gradNodeDark" : "gradNodeDefault";
    let strokeColor = isDark ? "#3B4E6B" : "#D5C8BD";
    let textColor = isDark ? "#F8FAFC" : "#2D323E";

    if (isRoot) {
      gradId = "gradRoot";
      strokeColor = isDark ? "#F09A7A" : "#D47A5A";
      textColor = "#FFFFFF";
    } else if (currentGraphMode === "bfs") {
      gradId = isDark ? "gradNodeBfsDark" : "gradNodeBfs";
      strokeColor = isDark ? "#60A5FA" : "#6EA2D4";
      textColor = isDark ? "#EFF6FF" : "#1C4468";
    } else if (currentGraphMode === "dfs") {
      gradId = isDark ? "gradNodeDfsDark" : "gradNodeDfs";
      strokeColor = isDark ? "#FB923C" : "#E59678";
      textColor = isDark ? "#FFF7ED" : "#6B3322";
    }

    const sublabelColor = isRoot ? (isDark ? "#F0A287" : "#E59678") : (isDark ? "#94A3B8" : "#7A8191");

    nodesHtml += `
      <g class="graph-node-group" style="cursor: pointer;">
        <circle cx="${n.x}" cy="${n.y}" r="23" fill="url(#${gradId})" stroke="${strokeColor}" stroke-width="2.5" filter="url(#sphereDropShadow)" />
        <text x="${n.x}" y="${n.y + 5}" text-anchor="middle" fill="${textColor}" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="700">
          ${n.id}
        </text>
        <text x="${n.x}" y="${n.y + 38}" text-anchor="middle" fill="${sublabelColor}" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="600">
          ${isRoot ? "Root (v0)" : ""}
        </text>
      </g>
    `;
  });

  const shadowFloodColor = isDark ? "#000000" : "#8C6A5E";
  const shadowOpacity = isDark ? "0.55" : "0.22";

  const defsHtml = `
    <defs>
      <!-- 3D Clay Spheres Gradients -->
      <radialGradient id="gradRoot" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#FCE5DC" />
        <stop offset="50%" stop-color="#EAA185" />
        <stop offset="100%" stop-color="#D47A5A" />
      </radialGradient>

      <!-- Light Node Default -->
      <radialGradient id="gradNodeDefault" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="60%" stop-color="#F7F1EB" />
        <stop offset="100%" stop-color="#E5D9CE" />
      </radialGradient>

      <!-- Dark Node Default -->
      <radialGradient id="gradNodeDark" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#2B3A52" />
        <stop offset="60%" stop-color="#1B283D" />
        <stop offset="100%" stop-color="#111B2C" />
      </radialGradient>

      <!-- BFS Nodes -->
      <radialGradient id="gradNodeBfs" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#E8F3FD" />
        <stop offset="55%" stop-color="#A5CAED" />
        <stop offset="100%" stop-color="#729EC8" />
      </radialGradient>
      <radialGradient id="gradNodeBfsDark" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#385D8A" />
        <stop offset="60%" stop-color="#244063" />
        <stop offset="100%" stop-color="#162942" />
      </radialGradient>

      <!-- DFS Nodes -->
      <radialGradient id="gradNodeDfs" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#FDF0EB" />
        <stop offset="55%" stop-color="#F5B29B" />
        <stop offset="100%" stop-color="#DC7E62" />
      </radialGradient>
      <radialGradient id="gradNodeDfsDark" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#7A3D2A" />
        <stop offset="60%" stop-color="#5C2B1C" />
        <stop offset="100%" stop-color="#3B190F" />
      </radialGradient>

      <!-- Soft 3D Drop Shadow Filter -->
      <filter id="sphereDropShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="${shadowFloodColor}" flood-opacity="${shadowOpacity}" />
      </filter>
    </defs>
  `;

  svg.innerHTML = defsHtml + edgesHtml + nodesHtml;
}

function renderTracingTable() {
  const header = document.getElementById("tracingHeader");
  const body = document.getElementById("tracingBody");
  const badge = document.getElementById("tracingBadge");

  if (!header || !body) return;

  if (currentGraphMode === "bfs") {
    if (badge) {
      badge.innerHTML = `Penelusuran Breadth-First Search (Antrean FIFO ${renderTeX("Q")})`;
      badge.className = "badge badge-info";
    }
    header.innerHTML = `
      <th>Iterasi (${renderTeX("t")})</th>
      <th>Verteks Dequeue (${renderTeX("u")})</th>
      <th>Antrean ${renderTeX("Q")} (Frontier)</th>
      <th><em>Edge</em> Pohon Ditambahkan (${renderTeX("E_T")})</th>
      <th>Keterangan Operasi</th>
    `;

    body.innerHTML = GRAPH_8_DATA.bfs.steps.map(s => {
      const qStr = s.queue.length > 0 ? renderTeX(`[${s.queue.join(", ")}]`) : renderTeX("\\emptyset");
      const edgesStr = s.added_edges.length > 0 ? renderTeX(s.added_edges.join(", ")) : renderTeX("\\emptyset");
      return `
        <tr>
          <td><strong>${s.step}</strong></td>
          <td><strong class="text-cyan">${renderTeX("u = " + s.node)}</strong></td>
          <td>${qStr}</td>
          <td><strong class="text-emerald">${edgesStr}</strong></td>
          <td>${s.note}</td>
        </tr>
      `;
    }).join("");

  } else if (currentGraphMode === "dfs") {
    if (badge) {
      badge.innerHTML = `Penelusuran Depth-First Search (Tumpukan LIFO ${renderTeX("S")})`;
      badge.className = "badge badge-accent";
    }
    header.innerHTML = `
      <th>Iterasi (${renderTeX("t")})</th>
      <th>Verteks Aktif (${renderTeX("u")})</th>
      <th>Tumpukan ${renderTeX("S")} (Stack)</th>
      <th><em>Edge</em> Pohon / <em>Edge</em> Balik</th>
      <th>Keterangan Operasi</th>
    `;

    body.innerHTML = GRAPH_8_DATA.dfs.steps.map(s => {
      const sStr = s.stack.length > 0 ? renderTeX(`[${s.stack.join(", ")}]`) : renderTeX("\\emptyset");
      const isBackEdge = s.edge.includes("Balik") || s.edge.includes("Back");
      const cleanEdge = s.edge.replace(/\s*\[.*\]/, "");
      const edgeLabel = isBackEdge
        ? `<strong class="text-red">${renderTeX(cleanEdge)} <span class="badge badge-accent" style="font-size:0.7rem;"><em>Edge</em> Balik</span></strong>`
        : `<strong class="text-emerald">${renderTeX(s.edge)}</strong>`;

      return `
        <tr>
          <td><strong>${s.step}</strong></td>
          <td><strong class="text-indigo">${renderTeX("u = " + s.active)}</strong></td>
          <td>${sStr}</td>
          <td>${edgeLabel}</td>
          <td>${s.action}</td>
        </tr>
      `;
    }).join("");

  } else {
    if (badge) {
      badge.innerHTML = `Struktur Graf Asal ${renderTeX("G = (V, E)")}`;
      badge.className = "badge badge-accent";
    }
    header.innerHTML = `
      <th>Komponen</th>
      <th>Kardinalitas</th>
      <th>Himpunan Elemen</th>
      <th colspan="2">Keterangan</th>
    `;

    body.innerHTML = `
      <tr>
        <td><strong>Verteks (${renderTeX("V")})</strong></td>
        <td>${renderTeX("|V| = 8")}</td>
        <td>${renderTeX("\\{a, b, c, d, e, f, g, h\\}")}</td>
        <td colspan="2">Ordo graf ${renderTeX("|V| = 8")}</td>
      </tr>
      <tr>
        <td><strong><em>Edge</em> (${renderTeX("E")})</strong></td>
        <td>${renderTeX("|E| = 11")}</td>
        <td>${renderTeX("\\{(a,b), (a,c), (b,c), (b,d), (b,e), (c,e), (d,e), (d,f), (d,g), (f,h), (g,h)\\}")}</td>
        <td colspan="2">Ukuran graf ${renderTeX("|E| = 11")} (memuat sikel)</td>
      </tr>
      <tr>
        <td><strong><em>Spanning Tree</em> (${renderTeX("T")})</strong></td>
        <td>${renderTeX("|E_T| = |V| - 1 = 7")}</td>
        <td>Dibutuhkan eliminasi 4 <em>edge</em> sikel (${renderTeX("|E| - |E_T| = 11 - 7 = 4")})</td>
        <td colspan="2">Klik tombol "<em>Spanning Tree</em> BFS" atau "<em>Spanning Tree</em> DFS" di atas untuk melihat dekomposisinya.</td>
      </tr>
    `;
  }
}
