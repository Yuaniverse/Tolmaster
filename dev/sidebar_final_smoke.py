import json

from playwright.sync_api import sync_playwright


URL = "http://127.0.0.1:4173"
PROJECTS = [
    {"id": "a", "name": "Alpha", "items": [], "simulationCount": 100000},
    {"id": "b", "name": "Beta", "items": [], "simulationCount": 100000},
]


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 700})
    seed = json.dumps(PROJECTS)
    page.add_init_script(
        f"localStorage.setItem('tolmaster_help_seen_v1', '1');"
        f"localStorage.setItem('tolMasterProjects_v2', {json.dumps(seed)});"
        "if (!sessionStorage.getItem('seeded')) { localStorage.removeItem('tolMasterProjectSidebarUI_v1'); sessionStorage.setItem('seeded','1'); }"
    )
    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    sidebar = page.locator("aside.project-sidebar")
    handle = page.get_by_role("separator", name="Resize project sidebar")
    sidebar.wait_for(state="visible")

    box = handle.bounding_box()
    assert box and box["width"] == 20
    page.mouse.move(box["x"] + 10, box["y"] + 100)
    page.mouse.down()
    page.mouse.move(1500, box["y"] + 100, steps=12)
    page.mouse.up()
    page.wait_for_timeout(250)
    assert round(sidebar.bounding_box()["width"]) == 420
    assert "project-sidebar-resizing" not in page.locator("body").get_attribute("class")

    handle.focus()
    page.keyboard.press("Home")
    page.wait_for_timeout(250)
    assert round(sidebar.bounding_box()["width"]) == 160
    page.get_by_role("button", name="Collapse project sidebar").click()
    page.wait_for_timeout(200)
    assert round(sidebar.bounding_box()["width"]) == 48
    assert not page.locator("nav.project-tabs").is_visible()
    page.reload(wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    assert round(sidebar.bounding_box()["width"]) == 48
    page.get_by_role("button", name="Expand project sidebar").click()
    page.wait_for_timeout(200)
    assert round(sidebar.bounding_box()["width"]) == 160

    # Sidebar remains sticky while the long document scrolls.
    page.evaluate("document.querySelector('#tolmaster-content').style.minHeight='2400px'; window.scrollTo(0, 900)")
    page.wait_for_timeout(150)
    assert round(sidebar.bounding_box()["y"]) == 48, sidebar.bounding_box()

    page.set_viewport_size({"width": 767, "height": 700})
    page.wait_for_timeout(200)
    assert round(sidebar.bounding_box()["width"]) == 767
    assert page.locator("nav.project-tabs").is_visible()
    assert page.locator("nav.project-tabs").evaluate("el => getComputedStyle(el).flexDirection") == "row"
    assert not handle.is_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
    print("PASS pointer capture, clamp, collapse persistence, sticky rail, mobile fallback")
    browser.close()
