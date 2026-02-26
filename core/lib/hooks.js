/**
 * WordPress-style hooks system (actions + filters)
 * 
 * Actions: Fire-and-forget event listeners (hooks.on, hooks.action)
 * Filters: Data transformation pipeline (hooks.addFilter, hooks.filter)
 * 
 * Priority: Lower number = runs earlier (default: 10)
 */

class HookSystem {
  constructor() {
    this.actions = new Map(); // { hookName: [{ fn, priority }, ...] }
    this.filters = new Map(); // { hookName: [{ fn, priority }, ...] }
  }

  /**
   * Register an action listener
   * @param {string} name - Hook name (e.g. 'server.init', 'panel.cpu.loaded')
   * @param {Function} fn - Callback function
   * @param {number} priority - Execution order (lower = earlier)
   */
  on(name, fn, priority = 10) {
    if (!this.actions.has(name)) {
      this.actions.set(name, []);
    }
    const hooks = this.actions.get(name);
    hooks.push({ fn, priority });
    hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Fire an action (calls all registered listeners in priority order)
   * @param {string} name - Hook name
   * @param {...any} args - Arguments passed to listeners
   */
  action(name, ...args) {
    const hooks = this.actions.get(name);
    if (!hooks) return;
    for (const { fn } of hooks) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[Hook Error] Action '${name}':`, err.message);
      }
    }
  }

  /**
   * Register a filter function
   * @param {string} name - Filter name (e.g. 'panel.cpu.data', 'panels.order')
   * @param {Function} fn - Filter function (receives data, returns modified data)
   * @param {number} priority - Execution order (lower = earlier)
   */
  addFilter(name, fn, priority = 10) {
    if (!this.filters.has(name)) {
      this.filters.set(name, []);
    }
    const hooks = this.filters.get(name);
    hooks.push({ fn, priority });
    hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Run data through a filter chain
   * @param {string} name - Filter name
   * @param {any} data - Initial data
   * @param {...any} args - Additional arguments passed to filter functions
   * @returns {any} Filtered data
   */
  filter(name, data, ...args) {
    const hooks = this.filters.get(name);
    if (!hooks) return data;
    let result = data;
    for (const { fn } of hooks) {
      try {
        result = fn(result, ...args);
      } catch (err) {
        console.error(`[Hook Error] Filter '${name}':`, err.message);
      }
    }
    return result;
  }

  /**
   * List all registered hooks (for debugging)
   */
  list() {
    return {
      actions: Array.from(this.actions.keys()),
      filters: Array.from(this.filters.keys())
    };
  }
}

// Export a singleton instance
module.exports = new HookSystem();
