/**
 * Example Panel UI (Lit Web Component)
 * 
 * This is the client-side UI component that renders in the browser.
 * It receives data from the API endpoint and renders it.
 */

import { LitElement, html, css } from 'https://cdn.jsdelivr.net/npm/lit@3/+esm';

export class ExamplePanel extends LitElement {
  // ── Properties (reactive state) ──
  static properties = {
    data: { type: Object } // This will be set by the shell when data arrives
  };

  // ── Styles (scoped to this component via Shadow DOM) ──
  static styles = css`
    :host {
      display: block;
    }
    .metric-label {
      font-size: 11px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .metric-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      font-weight: 700;
      color: var(--accent);
    }
    .metric-sub {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 4px;
    }
  `;

  // ── Constructor (initialize state) ──
  constructor() {
    super();
    this.data = null;
  }

  // ── Render method (returns HTML template) ──
  render() {
    // Loading state (before data arrives)
    if (!this.data) {
      return html`
        <div class="metric-label">Example Panel</div>
        <div class="metric-value">—</div>
      `;
    }

    // Normal state (with data)
    return html`
      <div class="metric-label">Example Panel</div>
      <div class="metric-value">${this.data.value.toFixed(1)}</div>
      <div class="metric-sub">${this.data.message}</div>
    `;
  }
}

// ── Register the custom element ──
// The tag name must match the panel ID: panel-{id}
customElements.define('panel-example-panel', ExamplePanel);
