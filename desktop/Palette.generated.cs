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
 internal static LauncherPalette For(bool dark) { return dark ? new LauncherPalette { Background=Color.FromArgb(8,8,8),Ink=Color.FromArgb(250,250,250),Muted=Color.FromArgb(238,238,238),Surface=Color.FromArgb(21,21,21),Panel=Color.FromArgb(166,16,16,16),Field=Color.FromArgb(217,21,21,21),Primary=Color.FromArgb(238,238,238),PrimaryInk=Color.FromArgb(17,17,17),PrimaryHover=Color.FromArgb(255,255,255),Line=Color.FromArgb(85,176,176,176) } : new LauncherPalette { Background=Color.FromArgb(242,242,242),Ink=Color.FromArgb(16,16,16),Muted=Color.FromArgb(48,48,48),Surface=Color.FromArgb(249,249,249),Panel=Color.FromArgb(153,255,255,255),Field=Color.FromArgb(232,255,255,255),Primary=Color.FromArgb(23,23,23),PrimaryInk=Color.FromArgb(255,255,255),PrimaryHover=Color.FromArgb(48,48,48),Line=Color.FromArgb(101,128,128,128) }; }
}
