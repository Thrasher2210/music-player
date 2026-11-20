/**
 * Visibility for row controls that stay out of the way until the row is
 * hovered, keyboard focused, or the control's own menu is open. Touch screens
 * have no hover, so coarse pointers always see them.
 *
 * The row must carry the `group` class.
 */
export const REVEAL_ON_ROW_HOVER =
  "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-has-[:focus-visible]:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100";

/**
 * Same rule for a control group that should take no space until it shows, so
 * the text beside it keeps the full width of the row.
 */
export const SHOW_ON_ROW_HOVER =
  "hidden group-hover:flex group-focus-visible:flex group-has-[:focus-visible]:flex group-has-[[data-state=open]]:flex pointer-coarse:flex";
