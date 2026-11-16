#!/usr/bin/env python3
"""
clean_dossier_css.py
Replaces all 1fr 1fr / 2x2 grid CSS definitions for dossiers across subpages
with pure top-down single-column vertical flex layouts.
"""

import re

def update_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    orig = content

    # 1. Replace .dossier-specs-grid { display: grid; grid-template-columns: 1fr 1fr; ... }
    content = re.sub(
        r'\.dossier-specs-grid\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr\s+1fr;[^}]*\}',
        '''.dossier-specs-grid,
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
  }''',
        content
    )

    # 2. Replace .dossier-assessment-grid { display: grid; grid-template-columns: 1fr 1fr; ... }
    content = re.sub(
        r'\.dossier-assessment-grid\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr\s+1fr;[^}]*\}',
        '''.dossier-assessment-grid,
  .dossier-assessment-stack {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.85rem;
    margin-bottom: 1.25rem;
  }''',
        content
    )

    # 3. Replace .dossier-deep-grid { display: grid; grid-template-columns: 1fr 1fr; ... }
    content = re.sub(
        r'\.dossier-deep-grid\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr\s+1fr;[^}]*\}',
        '''.dossier-deep-grid,
  .dossier-deep-stack {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }''',
        content
    )

    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"No changes in {path}")

for p in [
    'website/src/pages/mcu-scalar/index.astro',
    'website/src/pages/app-cores/index.astro',
    'website/src/pages/soc-multicore/index.astro'
]:
    update_file(p)
