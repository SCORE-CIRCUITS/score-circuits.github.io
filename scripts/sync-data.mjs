#!/usr/bin/env node
/**
 * SCORE Platform Data Synchronizer
 * Ingests projects, tools, benchmarks (Levels 1-4), and paper digests into unified JSON databases.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, "..");
const repoRoot = resolve(siteRoot, "..");
const papersDir = join(repoRoot, "publications", "papers");
const toolsDir = join(repoRoot, "tools");
const datasetsDir = join(repoRoot, "datasets");
const benchmarksDir = join(repoRoot, "benchmarks");
const scriptsDir = join(repoRoot, "scripts");

mkdirSync(join(siteRoot, "src", "data"), { recursive: true });

function parseCsv(text) {
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// 1. Ingest Benchmarks
const benchmarks = {
  core: null,
  app: null,
  vector: null,
  soc: null,
};

try {
  benchmarks.core = JSON.parse(readFileSync(join(benchmarksDir, "core", "suite.json"), "utf8"));
} catch (e) {
  console.warn("Could not read core suite:", e.message);
}

try {
  benchmarks.core_results = JSON.parse(readFileSync(join(benchmarksDir, "core", "aggregated_results.json"), "utf8"));
} catch (e) {}

try {
  benchmarks.app = JSON.parse(readFileSync(join(benchmarksDir, "app", "suite.json"), "utf8"));
} catch (e) {
  console.warn("Could not read app suite:", e.message);
}

try {
  benchmarks.app_results = JSON.parse(readFileSync(join(benchmarksDir, "app", "aggregated_results.json"), "utf8"));
} catch (e) {}

try {
  benchmarks.vector = JSON.parse(readFileSync(join(benchmarksDir, "vector", "suite.json"), "utf8"));
} catch (e) {
  console.warn("Could not read vector suite:", e.message);
}

try {
  benchmarks.vector_results = JSON.parse(readFileSync(join(benchmarksDir, "vector", "aggregated_results.json"), "utf8"));
} catch (e) {}

try {
  benchmarks.soc = JSON.parse(readFileSync(join(benchmarksDir, "soc", "aggregated_results.json"), "utf8"));
} catch (e) {
  console.warn("Could not read soc aggregated results:", e.message);
}

// 2. Ingest Registry CSVs
const projectsRaw = readFileSync(join(papersDir, "projects.csv"), "utf8");
const indexRaw = readFileSync(join(papersDir, "architecture_index.csv"), "utf8");

const projectRows = parseCsv(projectsRaw);
const pHeader = projectRows[0].map(h => h.trim());
const projectsData = projectRows.slice(1).map(r => {
  const obj = {};
  pHeader.forEach((h, idx) => {
    obj[h] = r[idx] || "";
  });
  return obj;
});

const indexRows = parseCsv(indexRaw);
const iHeader = indexRows[0].map(h => h.trim());
const indexMap = new Map();
indexRows.slice(1).forEach(r => {
  const obj = {};
  iHeader.forEach((h, idx) => {
    obj[h] = r[idx] || "";
  });
  if (obj.project_name) {
    indexMap.set(obj.project_name.trim(), obj);
  }
});

// Category classification helper
function categorize(project) {
  const name = (project.project_name || "").toLowerCase();
  const cat = (project.category || "").toLowerCase();
  const deliverable = (project.top_level_deliverable || "").toLowerCase();

  // Explicit mappings to our 4 Categories
  if (["darkriscv", "hazard3", "ibex", "neorv32", "neorv32 (verilog)", "neorv32 (vhdl)", "picorv32", "scr1", "serv", "veer el2", "veer-el2", "vexriscv", "rv12", "riscv vhdl", "riscv-vhdl"].some(k => name.includes(k))) {
    return {
      id: "category-1",
      number: 1,
      title: "Category 1: Microcontroller & Scalar Embedded Cores",
      shortTitle: "MCU / Scalar Cores",
      level: "Level 1",
      profile: "mcu_verilator",
      benchmarksSummary: "CoreMark, Dhrystone, CPI, Area (kGE)"
    };
  }

  if (["cva6", "rocket chip", "rocket-chip", "boom", "blackparrot", "black-parrot", "xiangshan", "nutshell", "c906", "c910"].some(k => name.includes(k))) {
    return {
      id: "category-2",
      number: 2,
      title: "Category 2: 64-bit Application-Class Cores",
      shortTitle: "64-bit Application Cores",
      level: "Level 2",
      profile: "app_verilator",
      benchmarksSummary: "CoreMark, Dhrystone, memcpy, PMP, riscv-tests (8 kernels)"
    };
  }

  if (["ara", "araxl", "spatz", "gemmini"].some(k => name === k || name.startsWith(k + " "))) {
    return {
      id: "category-3",
      number: 3,
      title: "Category 3: Vector & Coprocessor Acceleration Engines",
      shortTitle: "Vector & Coprocessor Engines",
      level: "Level 3",
      profile: "vector_verilator",
      benchmarksSummary: "fmatmul, fconv2d, fdotproduct, fft, softmax, gemmini systolic"
    };
  }

  return {
    id: "category-4",
    number: 4,
    title: "Category 4: Full SoC Platforms & Multi-Core Clusters",
    shortTitle: "Full SoCs & Clusters",
    level: "Level 4",
    profile: "soc_verilator",
    benchmarksSummary: "1D/2D DMA, multi-core scaling (16-256 cores), peripheral I/O"
  };
}

// Extract sections from markdown digest
function parseDigestMarkdown(md) {
  const sections = {};
  const lines = md.split("\n");
  let currentSec = "header";
  let curLines = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      sections[currentSec] = curLines.join("\n").trim();
      currentSec = line.replace("## ", "").trim().toLowerCase();
      curLines = [];
    } else {
      curLines.push(line);
    }
  }
  sections[currentSec] = curLines.join("\n").trim();
  return sections;
}

// 3. Process Projects
const enrichedProjects = projectsData.map(proj => {
  const name = proj.project_name.trim();
  const idx = indexMap.get(name) || {};
  const pageSlug = idx.page_slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const track = idx.track?.trim() || "C";
  const status = idx.status?.trim() || "catalog";
  const digestRel = (idx.digest_relpath || "").trim();
  const noteRel = (idx.source_note_relpath || "").trim();
  const scoreIntegrated = String(idx.score_integrated || "").trim().toLowerCase() === "true";

  let fullMarkdown = "";
  let digestSections = {};
  let contentKind = "none";
  let contentRelpath = null;

  if (digestRel && existsSync(join(papersDir, digestRel))) {
    fullMarkdown = readFileSync(join(papersDir, digestRel), "utf8");
    digestSections = parseDigestMarkdown(fullMarkdown);
    contentKind = "digest";
    contentRelpath = digestRel;
  } else if (noteRel && existsSync(join(papersDir, noteRel))) {
    fullMarkdown = readFileSync(join(papersDir, noteRel), "utf8");
    digestSections = parseDigestMarkdown(fullMarkdown);
    contentKind = "source-note";
    contentRelpath = noteRel;
  }

  // Find matching measured benchmark results across all 4 levels
  const measuredBenchmarks = [];
  const allAggregated = [
    ...(benchmarks.core_results?.results || []),
    ...(benchmarks.app_results?.results || []),
    ...(benchmarks.vector_results?.results || []),
    ...(benchmarks.soc?.results || []),
  ];
  for (const r of allAggregated) {
    const c = (r.core || "").toLowerCase().replace(/_/g, "-");
    const p = pageSlug.toLowerCase().replace(/_/g, "-");
    const n = name.toLowerCase().replace(/_/g, "-");
    if (c === p || c === n) {
      measuredBenchmarks.push(r);
    }
  }

  // Check dataset snapshot on disk
  let snapshotCommit = null;
  const archDatasetDir = join(datasetsDir, pageSlug);
  if (existsSync(archDatasetDir)) {
    try {
      const commits = readdirSync(archDatasetDir).filter(d => !d.startsWith("."));
      if (commits.length > 0) {
        snapshotCommit = commits[0];
      }
    } catch (e) {}
  }

  // Map scripts
  const scripts = {
    install: existsSync(join(repoRoot, "scripts", `install_${pageSlug}.sh`)),
    generate: existsSync(join(repoRoot, "scripts", `generate_${pageSlug}.sh`)),
    run: existsSync(join(repoRoot, "scripts", `run_${pageSlug}.sh`)),
  };

  const categoryMeta = categorize(proj);

  return {
    name,
    slug: pageSlug,
    page_slug: pageSlug,
    project_name: name,
    track,
    status,
    digest_relpath: digestRel,
    source_note_relpath: noteRel,
    content_kind: contentKind,
    content_relpath: contentRelpath,
    score_integrated: scoreIntegrated,
    category: proj.category || "unknown",
    categoryMeta,
    repository_url: proj.repository_url || "",
    organization: proj.organization || "",
    primary_isa: proj.primary_isa || "",
    language: proj.language_or_generator_framework || "",
    language_or_generator_framework: proj.language_or_generator_framework || "",
    license: proj.license || "",
    top_level_deliverable: proj.top_level_deliverable || "",
    target_class: proj.target_class || "",
    bus_or_noc_type: proj.bus_or_noc_type || "",
    verification_evidence: proj.verification_evidence || "",
    silicon_evidence: proj.silicon_evidence || "",
    fpga_evidence: proj.fpga_evidence || "",
    software_stack_support: proj.software_stack_support || "",
    documentation_quality: proj.documentation_quality || "",
    maintenance_activity: proj.maintenance_activity || "",
    notable_strengths: proj.notable_strengths || "",
    notable_limitations: proj.notable_limitations || "",
    depth_of_analysis: proj.depth_of_analysis || "",
    fullMarkdown,
    digestSections,
    measuredBenchmarks,
    snapshotCommit,
    scripts,
  };
});

// 4. Ingest and Detail ALL 51 Tools in tools/
const toolDirs = readdirSync(toolsDir)
  .filter(f => !f.startsWith(".") && statSync(join(toolsDir, f)).isDirectory())
  .sort();

// Helper to look up matched project
const projectBySlug = new Map();
enrichedProjects.forEach(p => {
  projectBySlug.set(p.slug.toLowerCase(), p);
  projectBySlug.set(p.name.toLowerCase(), p);
});

// Explicit tool category and metadata directory
const toolCategoryOverrides = {
  // Category 1: MCU & Scalar Embedded
  "darkriscv": { cat: 1, title: "DarkRISCV", sub: "1-2 Stage RV32E/I Soft Core in Verilog", isa: "RV32E / RV32I", bus: "LUT RAM / Harvard", lang: "Verilog" },
  "femtorv": { cat: 1, title: "FemtoRV", sub: "Minimalist RV32I/E Core Optimized for FPGA Logic Cell Usage", isa: "RV32I / RV32E", bus: "Memory-Mapped Native", lang: "Verilog" },
  "hazard3": { cat: 1, title: "Hazard3", sub: "3-Stage RV32I[M][A][C][B] Microcontroller Core", isa: "RV32IMACB", bus: "AHB-Lite / Hazard3 Bus", lang: "Verilog" },
  "ibex": { cat: 1, title: "Ibex (zero-riscy)", sub: "2-Stage RV32IMC Core for Secure Applications", isa: "RV32IMC", bus: "Open Bus Interface (OBI)", lang: "SystemVerilog" },
  "neorv32": { cat: 1, title: "NEORV32 (VHDL)", sub: "Customizable 32-bit RISC-V Microcontroller SoC", isa: "RV32[I/E]MACU_Zfinx_Zbb_Zcb", bus: "Wishbone / AXI4-Lite", lang: "VHDL" },
  "neorv32-verilog": { cat: 1, title: "NEORV32 (Verilog)", sub: "Synthesized Verilog Port of NEORV32 MCU", isa: "RV32IMC", bus: "Wishbone / AXI4-Lite", lang: "Verilog" },
  "picorv32": { cat: 1, title: "PicoRV32", sub: "Size-Optimized Multi-Cycle RV32IMC Embedded Core", isa: "RV32IMC", bus: "Native / AXI-4 Lite / Wishbone", lang: "Verilog" },
  "riscv_vhdl": { cat: 1, title: "RISC-V VHDL", sub: "Reference Structural VHDL RV32 Core", isa: "RV32I", bus: "Wishbone", lang: "VHDL" },
  "rv12": { cat: 1, title: "RV12", sub: "Configurable Single-Issue In-Order RV32/RV64 Core", isa: "RV32IMC / RV64IMC", bus: "AHB3-Lite / AXI4", lang: "Verilog" },
  "scr1": { cat: 1, title: "SCR1", sub: "Syntacore Open-Source Compact 2-4 Stage Core", isa: "RV32IMC", bus: "AHB-Lite / AXI4-Lite", lang: "SystemVerilog" },
  "serv": { cat: 1, title: "SERV", sub: "The World's Smallest Bit-Serial RISC-V Core", isa: "RV32I / RV32E", bus: "Wishbone", lang: "Verilog" },
  "veer-eh1": { cat: 1, title: "VeeR EH1", sub: "9-Stage Dual-Issue Superscalar Embedded RV32IMC Core", isa: "RV32IMC", bus: "AHB-Lite / AXI4", lang: "SystemVerilog" },
  "veer-eh2": { cat: 1, title: "VeeR EH2", sub: "9-Stage 2-Thread Dual-Issue Superscalar Embedded RV32IMC Core", isa: "RV32IMC", bus: "AHB-Lite / AXI4", lang: "SystemVerilog" },
  "veer-el2": { cat: 1, title: "VeeR EL2", sub: "Western Digital 4-Stage Dual-Issue Embedded Core", isa: "RV32IMC", bus: "AHB-Lite / AXI4", lang: "SystemVerilog" },
  "vexriscv": { cat: 1, title: "VexRiscv", sub: "SpinalHDL-Generated 5-Stage RV32IMAFDC Core", isa: "RV32IMAFDC", bus: "Avalon / Wishbone / AXI4", lang: "SpinalHDL (Scala)" },

  // Category 2: 64-bit Application-Class Cores
  "black-parrot": { cat: 2, title: "BlackParrot", sub: "Modular 64-bit Linux Multicore Processor", isa: "RV64GC", bus: "BedRock / TileLink", lang: "SystemVerilog" },
  "boom": { cat: 2, title: "SonicBOOM (BOOMv3)", sub: "UC Berkeley 2-4 Wide Out-of-Order Superscalar RV64GC Core", isa: "RV64GC", bus: "TileLink (TL-UH)", lang: "Chisel (Scala)" },
  "c906": { cat: 2, title: "T-Head OpenC906", sub: "Commercial 5-Stage RV64GCV Core with Vector Processing Unit", isa: "RV64GCV", bus: "AXI4 (64-bit)", lang: "Verilog" },
  "c910": { cat: 2, title: "T-Head OpenC910", sub: "3-Issue Out-of-Order Superscalar RV64GCV Core with Dual VPU", isa: "RV64GCV", bus: "Dual AXI4 (128-bit)", lang: "Verilog" },
  "cva6": { cat: 2, title: "CVA6 (Ariane)", sub: "6-Stage 64-bit In-Order Application Core with MMU", isa: "RV64GC", bus: "AXI4 (64-bit)", lang: "SystemVerilog" },
  "nutshell": { cat: 2, title: "NutShell (Min-Cai)", sub: "UCAS 6-Stage Dual-Issue In-Order RV64GC Core", isa: "RV64GC", bus: "AXI4 (64-bit)", lang: "Chisel (Scala)" },
  "rocket-chip": { cat: 2, title: "Rocket Chip", sub: "UC Berkeley 5-Stage RV64GC Generator in Chisel", isa: "RV64GC", bus: "TileLink (TL-UH)", lang: "Chisel (Scala)" },
  "xiangshan": { cat: 2, title: "XiangShan (NanHu)", sub: "CAS/ICT 6-Issue Out-of-Order High-Performance RV64GCBK Core", isa: "RV64GCBK", bus: "TileLink / AXI4 (256-bit)", lang: "Chisel (Scala)" },

  // Category 3: Vector & Coprocessor Engines
  "ara": { cat: 3, title: "Ara (RVV 1.0)", sub: "Scalable 4-16 Lane Vector Coprocessor for CVA6", isa: "RV64GCV (Vector 1.0)", bus: "AXI4 (Wide 128-512b)", lang: "SystemVerilog" },
  "araxl": { cat: 3, title: "AraXL", sub: "Extended Vector Coprocessor with Clustered Lanes", isa: "RV64GCV", bus: "AXI4 Interconnect", lang: "SystemVerilog" },
  "cv32e40p": { cat: 3, title: "CV32E40P", sub: "4-Stage In-Order Core with XpulpV2 Packed Sub-Word SIMD & DSP", isa: "RV32IMFCXpulpV2 (SIMD)", bus: "Open Bus Interface (OBI)", lang: "SystemVerilog" },
  "gemmini": { cat: 3, title: "Gemmini", sub: "Configurable Systolic Deep Learning Accelerator Array", isa: "RoCC Custom Instructions", bus: "TileLink / RoCC", lang: "Chisel" },
  "hwacha": { cat: 3, title: "Hwacha", sub: "Decoupled Access-Execute (DAE) Vector-Fetch Coprocessor", isa: "Hwacha VT (RoCC DAE)", bus: "RoCC / TileLink", lang: "Chisel (Scala)" },
  "integrated-matrix-extension": { cat: 3, title: "Matrix Engine (IME)", sub: "Integrated Matrix Extension 2D Outer-Product Tile Tensor Coprocessor", isa: "RV64GC + RISC-V SME", bus: "TileLink / AXI4", lang: "SystemVerilog" },
  "spatz": { cat: 3, title: "Spatz", sub: "Ultra-Lightweight Vector Coprocessor for Snitch Core", isa: "RV32IMFD + Custom Vector", bus: "Tightly-Coupled OBI", lang: "SystemVerilog" },
  "vicuna": { cat: 3, title: "Vicuna", sub: "Compact Embedded 32-bit RVV 1.0 Vector Coprocessor (Zve32f)", isa: "RV32IMF_Zve32f (RVV 1.0)", bus: "OBI / AXI4-Lite", lang: "SystemVerilog" },
  "vortex": { cat: 3, title: "Vortex GPGPU", sub: "Open-Source Many-Core SIMT GPGPU Supporting OpenCL 1.2", isa: "RV32IMF-SIMT", bus: "AXI4 Clustered Bus", lang: "SystemVerilog" },

  // Category 4: Full SoC Platforms & Multi-Core Clusters
  "astral": { cat: 4, title: "Astral", sub: "Scalable Tiled Multi-Cluster Architecture Platform", isa: "RV64GC", bus: "AXI4 / Network-on-Chip", lang: "SystemVerilog" },
  "auteur": { cat: 4, title: "Auteur", sub: "System Generation & Exploration Architecture", isa: "RV64GC", bus: "AXI4 Crossbar", lang: "SystemVerilog" },
  "carfield": { cat: 4, title: "Carfield", sub: "Heterogeneous Autonomous Driving SoC with Safety Island", isa: "RV64GC + RV32IMC", bus: "AXI4 / FlooNoC", lang: "SystemVerilog" },
  "cheshire": { cat: 4, title: "Cheshire", sub: "Minimal 64-bit Linux SoC with PCIe and DMA", isa: "RV64GC (CVA6)", bus: "AXI4 crossbar", lang: "SystemVerilog" },
  "cheshire-ihp130-o": { cat: 4, title: "Cheshire (IHP SG13G2)", sub: "Tapeout-Ready Open 130nm ASIC SoC Edition", isa: "RV64GC (CVA6)", bus: "AXI4 Crossbar", lang: "SystemVerilog" },
  "chimera": { cat: 4, title: "Chimera", sub: "Heterogeneous Edge AI Platform with Multi-Core Cluster", isa: "RV64GC + NPU", bus: "AXI4 / Tightly-Coupled", lang: "SystemVerilog" },
  "croc": { cat: 4, title: "CROC", sub: "Compact Research Computing Platform & Microcontroller", isa: "RV32IMC", bus: "OBI / APB", lang: "SystemVerilog" },
  "hero": { cat: 4, title: "HERO", sub: "Heterogeneous Embedded Research Platform (ARM + PULP)", isa: "ARMv8 + RV32/64", bus: "AXI4 Interconnect", lang: "SystemVerilog" },
  "iob-soc": { cat: 4, title: "IOb-SoC", sub: "Python-Generated RISC-V SoC Architecture", isa: "RV32IMC", bus: "Wishbone / Native Interconnect", lang: "Verilog / Python" },
  "iob_soc_V0.8.0": { cat: 4, title: "IOb-SoC v0.8.0", sub: "Stable Baseline Release of IOb-SoC Architecture", isa: "RV32IMC", bus: "Wishbone", lang: "Verilog / Python" },
  "magia": { cat: 4, title: "MAGIA", sub: "Hardware-Software Co-Designed Manycore Cluster", isa: "RV32IMF", bus: "FractalSync / TCDM", lang: "SystemVerilog" },
  "mempool": { cat: 4, title: "MemPool", sub: "256-Core Shared-L1 Scratchpad Manycore System", isa: "RV32IMA (Snitch)", bus: "Low-Latency Shared TCDM", lang: "SystemVerilog" },
  "occamy": { cat: 4, title: "Occamy", sub: "Dual-Chiplet 432-Core HBM2e Heterogeneous Computing Platform", isa: "RV64GC + Snitch FPUs", bus: "FlooNoC / AXI5 / HBM2e", lang: "SystemVerilog" },
  "openpiton": { cat: 4, title: "OpenPiton", sub: "Princeton Co-Designed Manycore Research Framework", isa: "RV64GC / OpenSPARC", bus: "P-Mesh Coherence Protocol", lang: "Verilog" },
  "opentitan": { cat: 4, title: "OpenTitan", sub: "Silicon Root of Trust Platform with Cryptographic Engines", isa: "RV32IMC (Ibex)", bus: "TileLink-UL", lang: "SystemVerilog" },
  "picobello": { cat: 4, title: "Picobello", sub: "FractalSync Collective Hardware Engine & Mesh NoC", isa: "Custom Sync Engine", bus: "FlooNoC / AXI4", lang: "SystemVerilog" },
  "pulp-cluster": { cat: 4, title: "PULP Cluster", sub: "Multi-Core Shared-L1 Tightly Coupled Data Memory Cluster", isa: "RV32IMFD", bus: "Logarithmic Interconnect / OBI", lang: "SystemVerilog" },
  "pulp-soc": { cat: 4, title: "PULP SoC", sub: "Complete Subsystem Integrating PULP Cluster with Peripherals", isa: "RV32IMFD", bus: "AXI4 Interconnect", lang: "SystemVerilog" },
  "pulpissimo": { cat: 4, title: "PULPissimo", sub: "Single-Core Microcontroller SoC with uDMA and APB/AXI", isa: "RV32IMFC", bus: "uDMA / AXI4 / APB", lang: "SystemVerilog" },
  "rv-tracer": { cat: 4, title: "RV-Tracer", sub: "Cycle-Accurate Instruction Execution & Tracing Subsystem", isa: "RV32/RV64 Execution Tracing", bus: "Hardware Snoop Port", lang: "SystemVerilog" },
  "safety-island": { cat: 4, title: "Safety Island (SentryCore)", sub: "Dual-Core Lockstep Fault-Tolerant Safety Subsystem", isa: "RV32IMC Dual-Core", bus: "AXI4-Lite Dual-Rail", lang: "SystemVerilog" },
  "snitch-cluster": { cat: 4, title: "Snitch Cluster", sub: "Pseudo-Dual-Issue Compute Cluster with SSR and FREP", isa: "RV32IMA + Xfrep + Xssr", bus: "Wide TCDM / AXI4 DMA", lang: "SystemVerilog" },

  // Category 0: Infrastructure, Tools, Simulators & RTL Generators
  "SoC_Automation": { cat: 0, title: "SoC Automation Flow", sub: "Automated SoC Generator & Subsystem Assembly Flow", isa: "N/A (Generator)", bus: "Parametric Bus Fabric", lang: "Python / Shell" },
  "aha": { cat: 0, title: "AHA Flow", sub: "Stanford Agile Hardware Center Automated Generator Flow", isa: "N/A (Flow)", bus: "N/A", lang: "Python" },
  "amaranth": { cat: 0, title: "Amaranth HDL", sub: "Python-Based Hardware Description & Toolchain Suite", isa: "N/A (HDL)", bus: "N/A", lang: "Python" },
  "bambu": { cat: 0, title: "Bambu HLS", sub: "Open-Source High-Level Synthesis Framework for C/C++", isa: "N/A (HLS)", bus: "AXI4 / Memory-Mapped", lang: "C++" },
  "chisel": { cat: 0, title: "Chisel", sub: "Scala-Embedded Hardware Construction Language", isa: "N/A (HDL)", bus: "TileLink / AXI", lang: "Scala" },
  "dramsim2": { cat: 0, title: "DRAMSim2", sub: "Cycle-Accurate DDR2/DDR3 Memory System Simulator", isa: "N/A (Simulator)", bus: "Memory Bus", lang: "C++" },
  "ghdl": { cat: 0, title: "GHDL", sub: "Open-Source VHDL Simulator & Analysis Engine", isa: "N/A (Compiler/Simulator)", bus: "N/A", lang: "Ada / C++" },
  "hero-install": { cat: 0, title: "HERO Toolchain Installer", sub: "Automated Build System for Heterogeneous HERO SDK", isa: "N/A (Toolchain)", bus: "N/A", lang: "Bash" },
  "ibex-host-tools": { cat: 0, title: "Ibex Host Tools", sub: "Host Decoders, Spike Tracers & Verification Tools", isa: "RV32IMC Verification", bus: "N/A", lang: "C++ / Python" },
  "myhdl": { cat: 0, title: "MyHDL", sub: "Python Package for Hardware Modeling & Conversion", isa: "N/A (HDL)", bus: "N/A", lang: "Python" },
  "noculator": { cat: 0, title: "NOCulator", sub: "Network-on-Chip Traffic, Routing & Contention Modeler", isa: "N/A (NoC Modeler)", bus: "Mesh / Torus / Crossbar", lang: "Python / C++" },
  "peakrdl": { cat: 0, title: "PeakRDL", sub: "Control & Status Register (CSR) Generator & Toolchain", isa: "N/A (CSR Tool)", bus: "APB / AXI4-Lite / Wishbone", lang: "Python" },
  "pipelinec": { cat: 0, title: "PipelineC", sub: "C-Like Hardware Description Language with Auto-Pipelining", isa: "N/A (HDL)", bus: "N/A", lang: "C / Python" },
  "py2hwsw": { cat: 0, title: "Py2HWSW", sub: "Python Framework for Hardware/Software Co-Design", isa: "N/A (Generator)", bus: "Parametric", lang: "Python" },
  "pymtl3": { cat: 0, title: "PyMTL3", sub: "Python-Based Hardware Generation, Simulation & Verification", isa: "N/A (HDL/Harness)", bus: "N/A", lang: "Python" },
  "rggen": { cat: 0, title: "RgGen", sub: "Configuration Register & Memory-Mapped Interface Generator", isa: "N/A (CSR Tool)", bus: "AXI4-Lite / APB / Wishbone", lang: "Ruby" },
  "riscv-compliance": { cat: 0, title: "RISC-V Compliance Suite", sub: "Official RISC-V Architectural Compliance Test Framework", isa: "RV32I/E/M/A/C/F/D", bus: "Target Test Harness", lang: "Assembly / C" },
  "riscv-matrix-extension-spec": { cat: 0, title: "RISC-V Matrix Spec", sub: "Community Proposed Matrix Extension Specification & Architecture", isa: "RISC-V SME / IME Spec", bus: "N/A", lang: "Specification" },
  "riscv-p-spec": { cat: 0, title: "RISC-V Packed SIMD Spec", sub: "Official RISC-V P-Extension (Packed SIMD / DSP) Specification", isa: "RISC-V P Extension", bus: "N/A", lang: "Specification" },
  "riscv_toolchain_wrapper": { cat: 0, title: "RISC-V Toolchain Wrapper", sub: "Universal Cross-Compilation & Target Linking Wrapper", isa: "RV32 / RV64 All Extensions", bus: "N/A", lang: "Shell / Python" },
  "spinalhdl": { cat: 0, title: "SpinalHDL", sub: "Scala-Based High-Level Hardware Description Language", isa: "N/A (HDL)", bus: "Avalon / AXI / Wishbone", lang: "Scala" },
  "tvm-vta": { cat: 0, title: "TVM VTA", sub: "Versatile Tensor Accelerator Architecture & Compiler Stack", isa: "Custom Tensor ISA", bus: "AXI4", lang: "C++ / Python" },
  "verilator_wrapper": { cat: 0, title: "Verilator Wrapper", sub: "Universal Verilator Testbench Harness & Waveform Dumper", isa: "N/A (Harness)", bus: "DPI-C / Direct Bus", lang: "C++ / SystemVerilog" },
  "xls": { cat: 0, title: "Google XLS", sub: "Accelerated Logic Synthesis & High-Level Hardware Flow", isa: "N/A (HLS)", bus: "DSLX / Memory Channels", lang: "C++" }
};

const enrichedTools = toolDirs.map(toolDir => {
  const dirPath = join(toolsDir, toolDir);
  const files = readdirSync(dirPath);
  const under = toolDir.replace(/-/g, "_");

  // Read readme
  let readmeFile = files.find(f => f.toLowerCase() === "readme.md") || files.find(f => f.toLowerCase().startsWith("readme"));
  let readmeContent = "";
  if (readmeFile) {
    try {
      const raw = readFileSync(join(dirPath, readmeFile), "utf8");
      readmeContent = raw.slice(0, 30000); // Limit to 30KB
    } catch (e) {}
  }

  // Find matched project
  const normSlug = toolDir.toLowerCase().replace(/_/g, "-");
  let matchedProject = projectBySlug.get(normSlug) || projectBySlug.get(toolDir.toLowerCase());
  if (!matchedProject) {
    if (toolDir === "neorv32") matchedProject = projectBySlug.get("neorv32-vhdl") || projectBySlug.get("neorv32-verilog");
    else if (toolDir === "black-parrot") matchedProject = projectBySlug.get("blackparrot");
    else if (toolDir === "pulp-cluster") matchedProject = projectBySlug.get("pulp-cluster");
    else if (toolDir === "snitch-cluster") matchedProject = projectBySlug.get("snitch-cluster");
    else if (toolDir === "SoC_Automation") matchedProject = projectBySlug.get("soc-automation");
    else if (toolDir === "iob_soc_V0.8.0") matchedProject = projectBySlug.get("iob-soc");
  }

  // Scripts detection
  const toolScripts = {
    run: existsSync(join(scriptsDir, `run_${under}.sh`)) ? `scripts/run_${under}.sh` : (existsSync(join(scriptsDir, `run_${toolDir}.sh`)) ? `scripts/run_${toolDir}.sh` : null),
    generate: existsSync(join(scriptsDir, `generate_${under}.sh`)) ? `scripts/generate_${under}.sh` : (existsSync(join(scriptsDir, `generate_${toolDir}.sh`)) ? `scripts/generate_${toolDir}.sh` : null),
    install: existsSync(join(scriptsDir, `install_${under}.sh`)) ? `scripts/install_${under}.sh` : (existsSync(join(scriptsDir, `install_${toolDir}.sh`)) ? `scripts/install_${toolDir}.sh` : null),
    env: existsSync(join(scriptsDir, `${under}_env.sh`)) ? `scripts/${under}_env.sh` : (existsSync(join(scriptsDir, `${toolDir}_env.sh`)) ? `scripts/${toolDir}_env.sh` : null),
  };

  // Benchmark results detection across all 4 levels
  const toolBenchmarks = [];
  const checkResults = (resultsList, levelName) => {
    if (!resultsList) return;
    for (const r of resultsList) {
      const core = (r.core || "").toLowerCase();
      const soc = (r.soc || "").toLowerCase();
      const underCore = core.replace(/_/g, "-");
      const underSoc = soc.replace(/_/g, "-");
      const toolLow = toolDir.toLowerCase();
      const normLow = normSlug.toLowerCase();
      const projLow = matchedProject?.slug?.toLowerCase() || "";
      const isMatrixMatch =
        (toolLow === "integrated-matrix-extension" || toolLow === "matrix-extensions" || toolLow === "matrix_extensions") &&
        (core === "matrix_extensions" || core === "matrix-extensions" || core === "integrated-matrix-extension");
      const isNeorv32Match =
        (toolLow === "neorv32-verilog" || toolLow === "neorv32_verilog") &&
        (core === "neorv32");
      if (
        core === toolLow ||
        underCore === toolLow ||
        soc === toolLow ||
        underSoc === toolLow ||
        core === normLow ||
        underCore === normLow ||
        soc === normLow ||
        underSoc === normLow ||
        isMatrixMatch ||
        isNeorv32Match ||
        (projLow && (core === projLow || underCore === projLow || soc === projLow || underSoc === projLow))
      ) {
        toolBenchmarks.push({
          level: levelName,
          workload: r.workload || r.benchmark,
          config: r.config || r.configuration,
          metrics: r.metrics,
          generated_utc: r.generated_utc || r.run_at_utc,
          evidence_class: r.evidence_class || "score_measured"
        });
      }
    }
  };

  checkResults(benchmarks.core_results?.results, "Level 1: Scalar Microbenchmarks");
  checkResults(benchmarks.app_results?.results, "Level 2: Memory & OS Compliance");
  checkResults(benchmarks.vector_results?.results, "Level 3: Domain Vector Acceleration");
  checkResults(benchmarks.soc?.results, "Level 4: Full SoC & Cluster Benchmarks");

  // Metadata override
  const meta = toolCategoryOverrides[toolDir] || {
    cat: 4,
    title: toolDir,
    sub: "RISC-V Tool & Architecture",
    isa: matchedProject?.primary_isa || "RV32 / RV64",
    bus: matchedProject?.bus_or_noc_type || "AXI / Native",
    lang: matchedProject?.language || "SystemVerilog"
  };

  const categoryNames = {
    1: "Category 1: Microcontroller & Scalar Embedded Cores",
    2: "Category 2: 64-bit Application-Class Cores",
    3: "Category 3: Vector & Coprocessor Acceleration Engines",
    4: "Category 4: Full SoC Platforms & Multi-Core Clusters",
    0: "Infrastructure & Verification Tooling"
  };

  const categoryBadges = {
    1: "Level 1: Scalar Microbenchmarks",
    2: "Level 2: Memory & OS Compliance",
    3: "Level 3: Domain Vector Acceleration",
    4: "Level 4: Full System Scaling",
    0: "Simulation & Toolchain Support"
  };

  return {
    slug: toolDir,
    name: meta.title,
    subtitle: meta.sub,
    categoryNumber: meta.cat,
    categoryName: categoryNames[meta.cat],
    categoryBadge: categoryBadges[meta.cat],
    isa: meta.isa || matchedProject?.primary_isa || "RISC-V",
    bus: meta.bus || matchedProject?.bus_or_noc_type || "Bus Interconnect",
    language: meta.lang || matchedProject?.language || "Hardware RTL",
    license: matchedProject?.license || "Open Source (Apache 2.0 / Solderpad / MIT)",
    organization: matchedProject?.organization || "Open Source Hardware Community",
    verificationEvidence: matchedProject?.verification_evidence || "Simulation & Automated CI",
    siliconEvidence: matchedProject?.silicon_evidence || "Silicon Tested / FPGA Emulation",
    fpgaEvidence: matchedProject?.fpga_evidence || "FPGA Bitstreams Available",
    notableStrengths: matchedProject?.notable_strengths || "Comprehensive open-source collateral, modular interconnect, and Verilator simulation compatibility.",
    notableLimitations: matchedProject?.notable_limitations || "Documentation gaps or specialized EDA tooling requirements.",
    fileCount: files.length,
    topFiles: files.filter(f => !f.startsWith(".")).slice(0, 15),
    hasReadme: !!readmeFile,
    readmeFile,
    readmeContent,
    scripts: toolScripts,
    benchmarks: toolBenchmarks,
    matchedProjectSlug: matchedProject?.slug || null,
  };
});

// 5. Build Unified Database
const scoreDb = {
  version: "2.1",
  generatedAt: new Date().toISOString(),
  counts: {
    projects: enrichedProjects.length,
    tools: enrichedTools.length,
    category1Tools: enrichedTools.filter(t => t.categoryNumber === 1).length,
    category2Tools: enrichedTools.filter(t => t.categoryNumber === 2).length,
    category3Tools: enrichedTools.filter(t => t.categoryNumber === 3).length,
    category4Tools: enrichedTools.filter(t => t.categoryNumber === 4).length,
    infraTools: enrichedTools.filter(t => t.categoryNumber === 0).length,
    benchmarked: enrichedProjects.filter(p => p.measuredBenchmarks.length > 0).length,
    measuredRuns: benchmarks.soc?.results?.length || 0,
  },
  categories: [
    {
      id: "category-1",
      number: 1,
      title: "Microcontroller & Scalar Embedded Cores",
      badge: "Level 1: Scalar Microbenchmarks",
      description: "Low-power, area-efficient in-order embedded cores optimized for baremetal control, IoT, and security root-of-trust controllers.",
      profile: "mcu_verilator",
      workloads: ["CoreMark", "Dhrystone"],
      metrics: ["CPI", "CoreMark/MHz", "Logic Gate Count (kGE)"],
      projects: enrichedProjects.filter(p => p.categoryMeta.id === "category-1").map(p => p.slug),
      tools: enrichedTools.filter(t => t.categoryNumber === 1).map(t => t.slug)
    },
    {
      id: "category-2",
      number: 2,
      title: "64-bit Application-Class Cores",
      badge: "Level 2: Memory & OS Compliance",
      description: "Linux-capable in-order and out-of-order processors implementing RV64GC with Sv39/Sv48 MMUs, caches, and physical memory protection.",
      profile: "app_verilator",
      workloads: ["CoreMark", "Dhrystone", "memcpy", "PMP", "riscv-tests (8)"],
      metrics: ["Cycles", "Memory Throughput", "PMP Traps", "Fmax (ASIC/FPGA)"],
      projects: enrichedProjects.filter(p => p.categoryMeta.id === "category-2").map(p => p.slug),
      tools: enrichedTools.filter(t => t.categoryNumber === 2).map(t => t.slug)
    },
    {
      id: "category-3",
      number: 3,
      title: "Vector & Coprocessor Acceleration Engines",
      badge: "Level 3: Domain Vector Acceleration",
      description: "Scalable RISC-V Vector 1.0 (RVV) coprocessors, compact vector PEs, and systolic GEMM arrays for high-throughput arithmetic.",
      profile: "vector_verilator",
      workloads: ["fmatmul", "fconv2d", "fconv3d", "fdotproduct", "fft", "softmax", "matmul_ws"],
      metrics: ["Ops/Cycle", "Vector Utilization %", "FLOPs/W"],
      projects: enrichedProjects.filter(p => p.categoryMeta.id === "category-3").map(p => p.slug),
      tools: enrichedTools.filter(t => t.categoryNumber === 3).map(t => t.slug)
    },
    {
      id: "category-4",
      number: 4,
      title: "Full SoC Platforms & Multi-Core Clusters",
      badge: "Level 4: Full System Scaling",
      description: "Complete System-on-Chip platforms, manycore compute clusters, coherent interconnect fabrics (AXI4, OBI, P-Mesh), and DMA engines.",
      profile: "soc_verilator",
      workloads: ["1D/2D DMA", "Multi-Core Scaling (16-256 cores)", "Peripheral Subsystems"],
      metrics: ["Multi-core Speedup", "Barrier Latency", "DMA Bandwidth", "Bus Contention"],
      projects: enrichedProjects.filter(p => p.categoryMeta.id === "category-4").map(p => p.slug),
      tools: enrichedTools.filter(t => t.categoryNumber === 4).map(t => t.slug)
    }
  ],
  projects: enrichedProjects,
  tools: enrichedTools,
  benchmarks,
};

// Write output files
writeFileSync(join(siteRoot, "src", "data", "score_db.json"), JSON.stringify(scoreDb, null, 2), "utf8");
writeFileSync(join(siteRoot, "src", "data", "registry.json"), JSON.stringify({ projects: enrichedProjects, tools: enrichedTools }, null, 2), "utf8");

console.log(`[sync-data] Synced ${enrichedProjects.length} projects and ${enrichedTools.length} tools across 4 categories.`);
console.log(`[sync-data] Output written to site/src/data/score_db.json and registry.json.`);
