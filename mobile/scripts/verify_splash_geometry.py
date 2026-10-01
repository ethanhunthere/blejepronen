#!/usr/bin/env python3
"""Splash logo geometry verification: native (iOS/Android) vs JS handoff must be pixel-identical.

Checks (all pass/fail, exit 1 on any failure):
  1. Source PNG: centered, mark fits inside Android's 192dp mask circle.
  2. app.json imageWidth == SplashHandover LOGO_SIZE (both 250).
  3. Background color #00675B everywhere (app.json, generated iOS colorset, Android colors.xml).
  4. Generated Android drawables: 288dp canvas per density, mark ~150x130dp.
  5. Generated iOS imageset: imageWidth*{1,2,3}px, storyboard centerX/centerY + aspectFit.
  6. Android styles: Theme.SplashScreen parent (no icon-bg -> 288dp area/192dp circle),
     windowSplashScreenBehavior=icon_preferred.

Run after `npx expo prebuild --platform ios|android` (generated dirs are gitignored;
native checks are skipped with a note if absent).

Residual risk printed as a warning: Android 12+ OEM/AOSP implementations may scale the
icon area relative to screen size — only device capture proves final px. dp-for-dp the
generated assets match iOS/JS exactly.
"""

import glob
import json
import math
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = "#00675B"
ALPHA_T = 8

failures: list[str] = []
notes: list[str] = []


def check(cond: bool, label: str) -> None:
    print(("PASS  " if cond else "FAIL  ") + label)
    if not cond:
        failures.append(label)


def mark_box(im: Image.Image):
    px = im.load()
    w, h = im.size
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > ALPHA_T:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs), max(ys)


def max_radial(im: Image.Image) -> float:
    px = im.load()
    w, h = im.size
    cx, cy = w / 2, h / 2
    m = 0.0
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > ALPHA_T:
                m = max(m, math.hypot(x - cx + 0.5, y - cy + 0.5))
    return m


def main() -> int:
    os.chdir(ROOT)

    # 1. Source PNG
    src = Image.open("assets/images/splash-logo.png").convert("RGBA")
    check(src.size == (1024, 1024), f"source PNG is 1024x1024 (got {src.size})")
    box = mark_box(src)
    assert box
    x0, y0, x1, y1 = box
    off_x = ((x0 + x1) / 2 - 512) / 1024
    off_y = ((y0 + y1) / 2 - 512) / 1024
    check(abs(off_x) < 0.002 and abs(off_y) < 0.002, f"mark centered (off {off_x:.4f},{off_y:.4f})")
    # 192dp mask circle on 250dp logo -> source radius = 96/250*1024
    r_limit = 96 / 250 * 1024
    r = max_radial(src)
    check(r < r_limit, f"mark inside Android 192dp mask circle (radial {r:.0f}px < {r_limit:.0f}px)")

    # 2. imageWidth == LOGO_SIZE
    app_json = json.load(open("app.json"))
    widths = set()

    def scan(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k == "imageWidth":
                    widths.add(v)
                scan(v)
        elif isinstance(obj, list):
            for v in obj:
                scan(v)

    scan(app_json)
    check(widths == {250}, f"app.json imageWidth consistently 250 (got {sorted(widths)})")

    hand = open("components/motion/SplashHandover.tsx").read()
    m = re.search(r"LOGO_SIZE = (\d+)", hand)
    check(bool(m) and int(m.group(1)) == 250, f"SplashHandover LOGO_SIZE 250 (got {m.group(1) if m else None})")

    # 3. colors
    cfg_text = open("app.json").read()
    bad = [c for c in re.findall(r'"backgroundColor":\s*"(#[0-9A-Fa-f]{6})"', cfg_text) if c.upper() != BRAND]
    check(not bad, f"all app.json backgroundColor are {BRAND} (bad: {bad})")

    # 4. Android generated
    if glob.glob("android/app/src/main/res"):
        dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
        for d, mult in dens.items():
            p = f"android/app/src/main/res/drawable-{d}/splashscreen_logo.png"
            if not os.path.exists(p):
                check(False, f"missing {p}")
                continue
            im = Image.open(p).convert("RGBA")
            exp = int(288 * mult)
            check(im.size == (exp, exp), f"android {d} canvas {exp}px (got {im.size})")
            b = mark_box(im)
            assert b
            bw = (b[2] - b[0] + 1) / mult
            bh = (b[3] - b[1] + 1) / mult
            check(abs(bw - 150) <= 2 and abs(bh - 130) <= 2,
                  f"android {d} mark {bw:.1f}x{bh:.1f}dp (~150x130)")

        colors_xml = open("android/app/src/main/res/values/colors.xml").read()
        check('name="splashscreen_background">#00675B' in colors_xml.replace(" ", ""),
              "android splashscreen_background #00675B")
        styles = open("android/app/src/main/res/values/styles.xml").read()
        check('parent="Theme.SplashScreen"' in styles, "android splash theme parent Theme.SplashScreen")
        check("icon_preferred" in styles, "android windowSplashScreenBehavior=icon_preferred")
        check("windowSplashScreenAnimatedIcon\">@drawable/splashscreen_logo" in styles.replace(" ", ""),
              "android animated icon = splashscreen_logo")
    else:
        notes.append("android/ not prebuilt — Android generated checks skipped")

    # 5. iOS generated
    imagesets = glob.glob("ios/*/Images.xcassets/SplashScreenLogo.imageset")
    if imagesets:
        base = imagesets[0]
        for scale, name in ((1, "image.png"), (2, "image@2x.png"), (3, "image@3x.png")):
            p = os.path.join(base, name)
            if not os.path.exists(p):
                check(False, f"missing {name}")
                continue
            im = Image.open(p)
            exp = 250 * scale
            check(im.size == (exp, exp), f"ios {name} {exp}px (got {im.size})")

        storyboards = glob.glob("ios/*/SplashScreen.storyboard")
        if storyboards:
            sb = open(storyboards[0]).read()
            check('contentMode="scaleAspectFit"' in sb, "ios storyboard aspectFit")
            check(len(re.findall(r'firstAttribute="centerX"', sb)) >= 1
                  and len(re.findall(r'firstAttribute="centerY"', sb)) >= 1
                  and "width" not in re.findall(r'firstAttribute="(\w+)"', sb),
                  "ios storyboard centerX/centerY constraints only")
        colorsets = glob.glob("ios/*/Images.xcassets/SplashScreenBackground.colorset/Contents.json")
        if colorsets:
            cj = json.load(open(colorsets[0]))
            ok = True
            for entry in cj.get("colors", []):
                comp = entry["color"]["components"]
                rgb = tuple(round(float(comp[k]) * 255) for k in ("red", "green", "blue"))
                ok = ok and rgb == (0, 103, 91)
            check(ok, "ios SplashScreenBackground #00675B (light+dark)")
    else:
        notes.append("ios/ not prebuilt — iOS generated checks skipped")

    # 6. dp/pt equivalence statement
    print("\nEquivalence: iOS storyboard image = 250pt box aspectFit; Android drawable = "
          "250dp logo centered on 288dp canvas; JS LOGO_SIZE = 250. Mark renders "
          "150x130 on all three (dp ~ pt).")
    print("WARNING: Android 12+ system splash may scale the icon area screen-relative on "
          "some OEM builds — only device screen capture can confirm final px.")
    for n in notes:
        print("SKIP  " + n)

    print()
    if failures:
        print(f"{len(failures)} check(s) FAILED")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
