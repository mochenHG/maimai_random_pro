// Generated from design/palette.json.
using System.Drawing;
sealed class LauncherPalette {
 internal Color Background;
 internal Color Ink;
 internal Color Muted;
 internal Color Surface;
 internal Color Panel;
 internal Color Field;
 internal Color Primary;
 internal Color PrimaryInk;
 internal Color PrimaryHover;
 internal Color Line;
 internal static LauncherPalette For(bool dark) { return dark ? new LauncherPalette { Background=Color.FromArgb(9,14,22),Ink=Color.FromArgb(244,247,252),Muted=Color.FromArgb(225,232,243),Surface=Color.FromArgb(21,30,44),Panel=Color.FromArgb(179,17,26,41),Field=Color.FromArgb(238,16,24,37),Primary=Color.FromArgb(234,240,249),PrimaryInk=Color.FromArgb(17,25,39),PrimaryHover=Color.FromArgb(255,255,255),Line=Color.FromArgb(85,155,172,191) } : new LauncherPalette { Background=Color.FromArgb(245,247,250),Ink=Color.FromArgb(20,24,32),Muted=Color.FromArgb(53,63,77),Surface=Color.FromArgb(247,249,252),Panel=Color.FromArgb(173,255,255,255),Field=Color.FromArgb(232,245,247,250),Primary=Color.FromArgb(23,32,44),PrimaryInk=Color.FromArgb(255,255,255),PrimaryHover=Color.FromArgb(38,52,73),Line=Color.FromArgb(101,140,155,171) }; }
}
