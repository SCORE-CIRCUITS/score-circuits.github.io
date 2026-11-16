#!/usr/bin/env python3
"""
apply_topdown_dossiers.py
Formats #core-dossiers and all subpage dossiers to strictly avoid 2x2 or NxN grids,
enforcing a clean, linear, top-down structure that is 100% mobile friendly.
"""

import sys
import re

with open('website/scripts/expand_mcu_dossiers.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace DOSSIER_SECTION_TEMPLATE
old_tmpl_start = text.find("DOSSIER_SECTION_TEMPLATE = '''")
old_styles_end = text.find("'''\n\ndef main():") + 3

new_code = """DOSSIER_SECTION_TEMPLATE = '''  <!-- SECTION 7: NATIVE DETAILED ARCHITECTURAL DOSSIERS (STRICT TOP-DOWN MOBILE-FRIENDLY) -->
  <section id="core-dossiers" class="dossiers-container">
    <div class="section-title-wrap">
      <div class="badge badge-primary">&sect; 7. NATIVE ARCHITECTURAL SPECIFICATIONS</div>
      <h2 class="section-heading">Detailed Native Core Dossiers</h2>
      <p class="section-sub">
        Comprehensive microarchitectural breakdowns, branch prediction mechanics, memory bus &amp; cache topologies, interrupt &amp; security features, and verified RTL parameters extracted directly from each core's source code.
      </p>

      <!-- Quick Dossier Jump Bar -->
      <div class="dossier-jump-bar">
        <span class="jump-label">Jump to Core Dossier:</span>
        {bespokeDossiers.map((c) => (
          <a href={`#dossier-${c.slug}`} class="dossier-jump-pill">{c.name.split(' ')[0]}</a>
        ))}
      </div>
    </div>

    <div class="dossiers-list">
      {bespokeDossiers.map((core) => (
        <article class="dossier-card" id={`dossier-${core.slug}`}>
          <!-- Dossier Header -->
          <div class="dossier-header">
            <div class="dh-left">
              <span class="d-badge">{core.lang}</span>
              <span class="d-org">{core.org}</span>
              <span class="d-class-pill">{core.archClass}</span>
            </div>
            <div class="dh-right">
              <span class="d-license">{core.license}</span>
            </div>
          </div>

          <h3 class="dossier-core-name">{core.name}</h3>
          <p class="dossier-lead">{core.subtitle}</p>

          <!-- Specifications & Empirical Benchmarks (Top-Down Card) -->
          <div class="dossier-specs-stack">
            <div class="ds-stack-header">
              <span class="ds-stack-title">&#128203; Microarchitectural Specifications &amp; Verified Benchmarks</span>
            </div>
            <table class="ds-table">
              <tbody>
                <tr><th>Target ISA:</th><td><code>{core.isa}</code></td></tr>
                <tr><th>Bus Interface:</th><td>{core.bus}</td></tr>
                <tr><th>Silicon Area:</th><td><strong>{core.area}</strong></td></tr>
                <tr><th>Target Fmax:</th><td>{core.fmax}</td></tr>
                <tr><th>Measured CoreMark:</th><td><span class="score-badge">{core.measuredCoremark}</span></td></tr>
                <tr><th>Measured Dhrystone:</th><td>{core.measuredDhrystone}</td></tr>
                <tr><th>Silicon Evidence:</th><td>{core.siliconEvidence}</td></tr>
                <tr><th>Verification Rigor:</th><td>{core.verificationRigor}</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Deep Microarchitectural Breakdown Stack (Top-Down Flow) -->
          <div class="dossier-deep-stack">
            <div class="deep-card">
              <div class="deep-card-header">
                <span class="deep-icon">&#9881;</span>
                <span class="deep-title">1. Pipeline &amp; Datapath Topology</span>
              </div>
              <p class="deep-desc">{core.pipelineDeepDive}</p>
            </div>

            <div class="deep-card">
              <div class="deep-card-header">
                <span class="deep-icon">&#128256;</span>
                <span class="deep-title">2. Branch Resolution &amp; Prediction Strategy</span>
              </div>
              <p class="deep-desc">{core.branchArch}</p>
            </div>

            <div class="deep-card">
              <div class="deep-card-header">
                <span class="deep-icon">&#128421;</span>
                <span class="deep-title">3. Memory Subsystem, Interconnect &amp; Caches</span>
              </div>
              <p class="deep-desc">{core.memSubsystem}</p>
            </div>

            <div class="deep-card">
              <div class="deep-card-header">
                <span class="deep-icon">&#128737;</span>
                <span class="deep-title">4. Interrupts, Privilege Modes &amp; Silicon Security</span>
              </div>
              <p class="deep-desc">{core.privAndSecurity}</p>
            </div>
          </div>

          <!-- Coprocessor & Extensibility Port -->
          {core.coprocessorAndExt && (
            <div class="dossier-coproc-box">
              <div class="coproc-header">
                <span class="coproc-badge">&#128268; Hardware Extensibility &amp; Coprocessor Interface</span>
              </div>
              <p class="coproc-desc">{core.coprocessorAndExt}</p>
            </div>
          )}

          <!-- Top-Level RTL Parameters & Generics Manifest Table -->
          {core.rtlParameters && core.rtlParameters.length > 0 && (
            <div class="dossier-params-box">
              <div class="params-header">
                <span class="params-title">&#128220; Top-Level RTL Parameters &amp; Generics (Source Code Manifest)</span>
              </div>
              <div class="table-responsive">
                <table class="rtl-params-table">
                  <thead>
                    <tr>
                      <th style="width: 25%;">Parameter / Generic</th>
                      <th style="width: 20%;">Default / Setting</th>
                      <th style="width: 55%;">Functional Impact &amp; Microarchitectural Effect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {core.rtlParameters.map((p) => (
                      <tr>
                        <td><code>{p.name}</code></td>
                        <td><span class="param-default">{p.defaultVal}</span></td>
                        <td>{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <!-- Architectural Assessment (Strengths & Trade-offs Stack) -->
          <div class="dossier-assessment-stack">
            <div class="assess-item strength">
              <strong>&#10003; Architectural Strengths:</strong> {core.strengths}
            </div>
            <div class="assess-item limitation">
              <strong>&#9888; Engineering Trade-offs:</strong> {core.tradeoffs}
            </div>
          </div>
        </article>
      ))}
    </div>
  </section>
'''

DOSSIER_EXTRA_STYLES = '''  /* Expanded Deep Dossier Cards & Manifest Tables (Strict Top-Down Mobile Friendly) */
  .dossier-specs-stack {
    display: flex;
    flex-direction: column;
    width: 100%;
    background: var(--paper, #fffaf0);
    border: 2px solid var(--ink, #151b20);
    border-radius: 10px;
    padding: 1.15rem 1.25rem;
    margin-bottom: 1.25rem;
    box-shadow: 3px 3px 0 var(--ink, #151b20);
    box-sizing: border-box;
  }

  .ds-stack-header {
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1.5px dashed var(--line, #eee4c8);
  }

  .ds-stack-title {
    font-size: 0.92rem;
    font-weight: 900;
    color: var(--ink, #151b20);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .dossier-deep-stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    margin-bottom: 1.25rem;
  }

  .deep-card {
    background: #ffffff;
    border: 2px solid var(--ink, #151b20);
    border-radius: 10px;
    padding: 1.15rem 1.25rem;
    box-shadow: 3px 3px 0 var(--ink, #151b20);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    box-sizing: border-box;
    width: 100%;
  }

  .deep-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .deep-icon {
    font-size: 1.15rem;
    line-height: 1;
  }

  .deep-title {
    font-size: 0.92rem;
    font-weight: 900;
    color: var(--ink, #151b20);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .deep-desc {
    font-size: 0.88rem;
    line-height: 1.6;
    color: #242c33;
    margin: 0;
  }

  .dossier-coproc-box {
    background: #fdfbf7;
    border: 2px solid var(--ink, #151b20);
    border-left: 6px solid #d97706;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
    box-shadow: 3px 3px 0 var(--ink, #151b20);
    box-sizing: border-box;
    width: 100%;
  }

  .coproc-header {
    margin-bottom: 0.4rem;
  }

  .coproc-badge {
    font-size: 0.85rem;
    font-weight: 900;
    color: #92400e;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .coproc-desc {
    font-size: 0.88rem;
    line-height: 1.6;
    color: #242c33;
    margin: 0;
  }

  .dossier-params-box {
    background: #ffffff;
    border: 2px solid var(--ink, #151b20);
    border-radius: 10px;
    padding: 1.15rem 1.25rem;
    margin-bottom: 1.25rem;
    box-shadow: 3px 3px 0 var(--ink, #151b20);
    box-sizing: border-box;
    width: 100%;
  }

  .params-header {
    margin-bottom: 0.75rem;
  }

  .params-title {
    font-size: 0.92rem;
    font-weight: 900;
    color: var(--ink, #151b20);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .rtl-params-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  .rtl-params-table th, .rtl-params-table td {
    padding: 0.5rem 0.65rem;
    border: 1px solid #d1d5db;
    text-align: left;
  }

  .rtl-params-table th {
    background: #f3f4f6;
    color: var(--ink, #151b20);
    font-weight: 800;
    font-size: 0.82rem;
  }

  .rtl-params-table td {
    color: #374151;
    line-height: 1.45;
  }

  .rtl-params-table td code {
    background: #eef2ff;
    color: #3730a3;
    padding: 0.15rem 0.35rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.82rem;
  }

  .param-default {
    display: inline-block;
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    font-size: 0.78rem;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
  }

  .dossier-assessment-stack {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    width: 100%;
    margin-bottom: 1.25rem;
  }

  .assess-item {
    border: 1.5px solid var(--ink, #151b20);
    border-radius: 8px;
    padding: 1rem 1.15rem;
    font-size: 0.88rem;
    line-height: 1.55;
    box-sizing: border-box;
    width: 100%;
  }

  /* Responsive Table Wrapper */
  .table-responsive {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
'''"""

text = text[:old_tmpl_start] + new_code + text[old_styles_end:]
with open('website/scripts/expand_mcu_dossiers.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated expand_mcu_dossiers.py successfully!")
