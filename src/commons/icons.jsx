// src/commons/icons.jsx
// Minimal stroke icon set for Commons — replaces emoji glyphs so the shell reads as a real product.
// All icons: 24×24 viewBox, fill none, stroke currentColor, round caps/joins, uniform strokeWidth.

function Svg({ size = 22, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconMenu = (p) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconCheck = (p) => <Svg {...p}><path d="M5 12.5l4.2 4.2L19 7" /></Svg>;
export const IconChevronStart = (p) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;

// Tabs
export const IconMine = (p) => (
  <Svg {...p}><path d="M9 11.5l2 2 4-4.5" /><rect x="4" y="4" width="16" height="16" rx="4" /></Svg>
);
export const IconBoard = (p) => (
  <Svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></Svg>
);
export const IconActivity = (p) => <Svg {...p}><path d="M3 12h4l2.5 7 5-15L17 12h4" /></Svg>;
export const IconBell = (p) => (
  <Svg {...p}><path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" /><path d="M10 19a2 2 0 004 0" /></Svg>
);

// Menu
export const IconFolderPlus = (p) => (
  <Svg {...p}><path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M12 11.5v4M10 13.5h4" /></Svg>
);
export const IconUsers = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0111 0" /><path d="M16 6.2a3 3 0 010 5.6M17.5 19a5.5 5.5 0 00-3-4.9" /></Svg>
);
export const IconGear = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18 6l-1.8 1.8M7.8 16.2 6 18M18 18l-1.8-1.8M7.8 7.8 6 6" /></Svg>
);
export const IconUser = (p) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></Svg>
);
export const IconSwap = (p) => <Svg {...p}><path d="M7 8h12l-3-3M17 16H5l3 3" /></Svg>;
export const IconPencil = (p) => <Svg {...p}><path d="M4 20h4L18 10l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></Svg>;
export const IconTrash = (p) => <Svg {...p}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></Svg>;
export const IconExit = (p) => <Svg {...p}><path d="M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 8l-4 4 4 4M6 12h11" /></Svg>;

// Tasks
export const IconRepeat = (p) => <Svg {...p}><path d="M4 11V9a3 3 0 013-3h11l-3-3M20 13v2a3 3 0 01-3 3H6l3 3" /></Svg>;
export const IconClock = (p) => <Svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 1.8" /></Svg>;
export const IconInfo = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11.5v4.5" /><path d="M12 8h.01" /></Svg>;
