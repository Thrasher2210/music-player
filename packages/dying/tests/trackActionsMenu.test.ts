import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  FloatingPlayerPill,
  QuickPickRow,
  TrackRow,
  TrackTable,
  type TrackData,
} from "../src/index";

const track: TrackData = {
  id: "vid1",
  title: "Song One",
  artist: "Artist A",
  duration: 180,
};

const menuItems = React.createElement(
  DropdownMenuItem,
  { onSelect: () => undefined },
  "Add to playlist"
);

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

describe("Dying Design System - Dropdown Menu & Track Actions", () => {
  test("exports the DropdownMenu family", () => {
    [
      DropdownMenu,
      DropdownMenuTrigger,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
    ].forEach((Component) => assert.ok(Component, "DropdownMenu part must be defined"));
  });

  describe("TrackRow", () => {
    test("renders no actions button without actions or onActionClick", () => {
      const html = render(React.createElement(TrackRow, { track }));
      assert.ok(!html.includes('aria-label="Track actions"'));
    });

    test("renders a plain button for onActionClick", () => {
      const html = render(
        React.createElement(TrackRow, { track, onActionClick: () => undefined })
      );
      assert.ok(html.includes('aria-label="Track actions"'));
      assert.ok(!html.includes('aria-haspopup="menu"'));
    });

    test("renders a closed menu trigger for actions", () => {
      const html = render(React.createElement(TrackRow, { track, actions: menuItems }));
      assert.ok(html.includes('aria-label="Track actions"'));
      assert.ok(html.includes('aria-haspopup="menu"'));
      assert.ok(html.includes('aria-expanded="false"'));
      assert.ok(!html.includes("Add to playlist"), "menu content stays unmounted until opened");
    });

    test("actions take precedence over onActionClick", () => {
      const html = render(
        React.createElement(TrackRow, {
          track,
          actions: menuItems,
          onActionClick: () => undefined,
        })
      );
      assert.equal(html.split('aria-label="Track actions"').length - 1, 1);
      assert.ok(html.includes('aria-haspopup="menu"'));
    });

    test("trigger keeps the focus-visible ring and stays visible while open", () => {
      const html = render(React.createElement(TrackRow, { track, actions: menuItems }));
      assert.ok(html.includes("focus-visible:ring-2"));
      assert.ok(html.includes("data-[state=open]:opacity-100"));
    });
  });

  describe("TrackTable", () => {
    test("renders one menu trigger per row from renderActions", () => {
      const tracks = [track, { ...track, id: "vid2", title: "Song Two" }];
      const seen: string[] = [];
      const html = render(
        React.createElement(TrackTable, {
          tracks,
          renderActions: (t: TrackData) => {
            seen.push(t.id);
            return menuItems;
          },
        })
      );
      assert.deepEqual(seen, ["vid1", "vid2"]);
      assert.equal(html.split('aria-haspopup="menu"').length - 1, 2);
    });
  });

  describe("QuickPickRow", () => {
    test("renders no more options button by default", () => {
      const html = render(React.createElement(QuickPickRow, { track }));
      assert.ok(!html.includes("More options for Song One"));
    });

    test("renders a plain button for onActionClick", () => {
      const html = render(
        React.createElement(QuickPickRow, { track, onActionClick: () => undefined })
      );
      assert.ok(html.includes('aria-label="More options for Song One"'));
      assert.ok(!html.includes('aria-haspopup="menu"'));
    });

    test("renders a menu trigger for actions", () => {
      const html = render(React.createElement(QuickPickRow, { track, actions: menuItems }));
      assert.ok(html.includes('aria-label="More options for Song One"'));
      assert.ok(html.includes('aria-haspopup="menu"'));
    });
  });

  describe("FloatingPlayerPill", () => {
    test("shows Add to playlist only when onAddToPlaylist is passed", () => {
      const without = render(React.createElement(FloatingPlayerPill, { title: "Song" }));
      assert.ok(!without.includes('aria-label="Add to playlist"'));

      const withHandler = render(
        React.createElement(FloatingPlayerPill, {
          title: "Song",
          onAddToPlaylist: () => undefined,
        })
      );
      assert.ok(withHandler.includes('aria-label="Add to playlist"'));
    });
  });
});
