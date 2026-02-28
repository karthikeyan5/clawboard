# Browser CDP Helper — Clawboard

Python library for AI agents to control browsers via the OpenClaw relay CDP proxy.

## Quick Start

```python
import sys
sys.path.insert(0, '/tmp/clawboard/helpers')
from browser import Browser

b = Browser(relay_token="YOUR_TOKEN", server="http://localhost:3700")
b.connect()

b.navigate("https://example.com")
print(b.get_title())
print(b.read_page())

b.screenshot("/tmp/screenshot.png")
b.disconnect()
```

Or use as context manager:

```python
with Browser(relay_token="TOKEN", server="http://localhost:3700") as b:
    b.navigate("https://example.com")
    print(b.read_page())
```

## Relay Token

Get the relay token from Ram. It's the only secret needed. The relay CDP proxy runs at `ws://server:port/relay/cdp/ws?token=TOKEN`.

## Human Mode

Enable `human_mode=True` to automatically add human-like behavior:

```python
b = Browser(relay_token="TOKEN", human_mode=True)
```

When enabled:
- Mouse moves use Bezier curves with jitter before each click
- Typing has random delays (200-500ms before, 50-150ms between chars)
- Navigation triggers random scrolls/movements for 1-3 seconds
- Random pauses (100-500ms) between actions

## API Reference

### Connection

| Method | Description |
|--------|-------------|
| `connect()` | Connect to relay WebSocket |
| `disconnect()` | Close connection |
| `reconnect()` | Disconnect + reconnect |
| `list_tabs()` | Returns `[{id, title, url}, ...]` |

### Navigation

| Method | Description |
|--------|-------------|
| `new_tab(url)` | Create tab, returns target_id |
| `navigate(url, tab_id=None)` | Navigate current/specified tab |
| `close_tab(tab_id)` | Close a tab |
| `wait_for_load(timeout=10)` | Wait for page load event |

### Reading

| Method | Description |
|--------|-------------|
| `read_page()` | Page visible text (innerText) |
| `read_html()` | Full page HTML |
| `evaluate(js)` | Run JS, return result |
| `get_title()` | document.title |
| `get_url()` | Current URL |

### Interaction

| Method | Description |
|--------|-------------|
| `click(x, y)` | Click with natural mouse movement |
| `click_element(selector)` | Find element by CSS, click center |
| `type_text(text, selector=None)` | Type char-by-char with delays |
| `press_key(key)` | Press key: Enter, Tab, Escape, etc. |
| `scroll(direction, amount)` | Scroll up/down/left/right |

### Screenshots

| Method | Description |
|--------|-------------|
| `screenshot(path=None)` | Full page screenshot, returns base64 |
| `screenshot_element(selector, path=None)` | Screenshot specific element |

### Mouse Simulation

| Method | Description |
|--------|-------------|
| `human_mouse_move(x0, y0, x1, y1)` | Bezier curve mouse movement |
| `random_mouse_jitter()` | Small idle movements |
| `simulate_human_presence(duration)` | Random scrolls/moves/pauses |

## Common Patterns

### Login Flow

```python
with Browser(relay_token=TOKEN, human_mode=True) as b:
    b.navigate("https://example.com/login")
    b.type_text("myuser", "#username")
    b.type_text("mypass", "#password")
    b.click_element("button[type=submit]")
    b.wait_for_load()
    print(b.get_url())  # verify redirect
```

### Form Fill

```python
b.type_text("John", "#first-name")
b.type_text("Doe", "#last-name")
b.click_element("#agree-checkbox")
b.click_element("#submit-btn")
```

### Scraping

```python
b.navigate("https://example.com/data")
text = b.read_page()
# Or extract specific data:
titles = b.evaluate("Array.from(document.querySelectorAll('h2')).map(e => e.textContent)")
```

### Multi-tab

```python
tab1 = b.new_tab("https://site-a.com")
tab2 = b.new_tab("https://site-b.com")
b.navigate("https://site-a.com/page2", tab_id=tab1)
b.close_tab(tab2)
```

## Error Handling

```python
from browser import Browser, BrowserError, CDPError, ConnectionError, TimeoutError

try:
    b.click_element("#nonexistent")
except BrowserError as e:
    print(f"Element not found: {e}")
```

## Notes

- Single file, no deps beyond `websockets`
- All methods are synchronous
- Connection is persistent (connect once, reuse)
- Default timeout: 10 seconds for all operations
- Python 3.11 compatible
