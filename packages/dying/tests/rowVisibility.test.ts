import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuickPickRow, TrackRow, type TrackData } from "../src/index";

const track: TrackData = { id: "vid1", title: "Song One", artist: "Artist A", duration: 180 };

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

/** Classes of the element whose opening tag contains `marker`. */
function classesOf(markup: string, marker: string): string[] {
  const tag = markup.match(new RegExp(`<[a-z]+[^>]*${marker}[^>]*>`))?.[0];
  assert.ok(tag, `no element found for ${marker}`);
  const value = tag.match(/class="([^"]*)"/)?.[1];
  assert.ok(value, `no class attribute on ${marker}`);
  return value.split(/\s+/);
}

/** What a keyboard or touch user needs in order to see a hover-only control. */
const VISIBLE_WITHOUT_HOVER = [
  "group-hover:opacity-100",
  "group-focus-visible:opacity-100",
  "group-has-[:focus-visible]:opacity-100",
  "focus-visible:opacity-100",
  "pointer-coarse:opacity-100",
];

describe("Dying Design System - row controls without a mouse", () => {
  test("TrackRow like button is revealed by keyboard focus and on touch screens", () => {
    const classes = classesOf(render(React.createElement(TrackRow, { track })), 'aria-label="Like"');
    assert.ok(classes.includes("opacity-0"));
    VISIBLE_WITHOUT_HOVER.forEach((c) => assert.ok(classes.includes(c), `missing ${c}`));
  });

  test("TrackRow keeps a liked heart visible", () => {
    const classes = classesOf(
      render(React.createElement(TrackRow, { track: { ...track, isLiked: true } })),
      'aria-label="Unlike"'
    );
    assert.ok(classes.includes("opacity-100"));
    assert.ok(!classes.includes("opacity-0"));
  });

  test("TrackRow callback actions button is revealed by keyboard focus and on touch screens", () => {
    const markup = render(
      React.createElement(TrackRow, { track, onActionClick: () => undefined })
    );
    const classes = classesOf(markup, 'aria-label="Track actions"');
    VISIBLE_WITHOUT_HOVER.forEach((c) => assert.ok(classes.includes(c), `missing ${c}`));
  });

  test("TrackRow shows no duration when it is unknown", () => {
    const unknown = render(React.createElement(TrackRow, { track: { ...track, duration: 0 } }));
    const missing = render(React.createElement(TrackRow, { track: { ...track, duration: undefined } }));
    assert.ok(!unknown.includes("0:00"));
    assert.ok(!missing.includes("0:00"));
    assert.ok(render(React.createElement(TrackRow, { track })).includes("3:00"));
  });

  test("QuickPickRow buttons take no width until hover, focus, open menu or touch", () => {
    const markup = render(
      React.createElement(QuickPickRow, {
        track,
        onQueue: () => undefined,
        onActionClick: () => undefined,
      })
    );
    const group = classesOf(markup, "gap-1 shrink-0");
    ["hidden", "group-hover:flex", "group-focus-visible:flex", "group-has-[:focus-visible]:flex",
      "group-has-[[data-state=open]]:flex", "pointer-coarse:flex"].forEach((c) =>
      assert.ok(group.includes(c), `missing ${c}`)
    );
    // The group is what hides, so the buttons themselves must not be transparent.
    assert.ok(!classesOf(markup, 'aria-label="Add Song One to queue"').includes("opacity-0"));
    assert.ok(!classesOf(markup, 'aria-label="More options for Song One"').includes("opacity-0"));
  });
});
