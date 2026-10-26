// Compact inline icons (no icon dependency). 24x24 outline, currentColor.
const paths: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5.25 9.75V20a1 1 0 0 0 1 1H9v-6h6v6h2.75a1 1 0 0 0 1-1V9.75",
  applications:
    "M9 5h6M9 5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h4",
  students:
    "M15 19.5a6 6 0 0 0-12 0M17 15a4 4 0 0 0 4 4M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  lessons:
    "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5v-12ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 0 1.5-1.5v-12Z",
  syllabus:
    "M8 3v3M16 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3 8h3m-3 3h6",
  inventory:
    "M3.5 8 12 3l8.5 5v8L12 21l-8.5-5V8Zm0 0 8.5 5m0 0 8.5-5M12 13v8",
  equipment:
    "M14.5 6.5a3.5 3.5 0 0 1-4.6 4.6L5 16l3 3 4.9-4.9a3.5 3.5 0 0 0 4.6-4.6l-2.3 2.3-2-2 2.3-2.3Z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-3a8.4 8.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a8.3 8.3 0 0 0-2.2-1.3L15.3 2h-4l-.4 2.6a8.3 8.3 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a8.5 8.5 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a8.3 8.3 0 0 0 2.2 1.3l.4 2.6h4l.4-2.6a8.3 8.3 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.07-.4.1-.86.1-1.3Z",
  staff:
    "M17 20h5v-1a4 4 0 0 0-4-4h-1m-5 5H2v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1H7Zm2-11a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm8 .5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
  logout:
    "M15 12H4m0 0 4-4m-4 4 4 4m3-11h6a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: keyof typeof paths | string;
  className?: string;
}) {
  const d = paths[name] ?? paths.home;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
