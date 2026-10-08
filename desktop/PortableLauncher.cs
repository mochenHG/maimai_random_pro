using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
[assembly: AssemblyTitle("maimai Random Pro")]
[assembly: AssemblyDescription("maimai Random Pro portable browser launcher")]
[assembly: AssemblyVersion("3.6.0.0")]
[assembly: AssemblyFileVersion("3.6.0.0")]
static class PortableLauncher {
  static Process owned;
  static string address;
  static Mutex instance;
  static string Argument(string[] args,string key) { foreach(string arg in args) if(arg.StartsWith(key)) return arg.Substring(key.Length); return null; }
  [STAThread] static int Main(string[] args) {
    bool test=Array.IndexOf(args,"--self-test")>=0;
    string preview=Argument(args,"--render-preview=");
    string report=Argument(args,"--report=");
    try {
      if(!test && preview==null) {bool created;instance=new Mutex(true,"Local\\MaimaiRandomProPortable-3.6.0",out created);if(!created){Process.Start(new ProcessStartInfo(ReadSavedAddress()){UseShellExecute=true});return 0;}}
      string cache=Argument(args,"--cache-dir=") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"maimai-random-pro");
      string root=Extract(cache);
      if(preview!=null) {
        Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
        using(var previewWindow=new LauncherWindow("http://127.0.0.1:5174",root)) {
          previewWindow.CreateControl();
          using(var bitmap=new Bitmap(previewWindow.ClientSize.Width,previewWindow.ClientSize.Height)) {
            previewWindow.RenderClient(bitmap);bitmap.Save(preview,System.Drawing.Imaging.ImageFormat.Png);
          }
        }
        return 0;
      }
      int requested; if(!Int32.TryParse(Argument(args,"--port="),out requested)) requested=5174;
      string stateFile=Path.Combine(Path.GetFullPath(cache),"state","session.json");
      int port=Start(root,requested,test,stateFile);
      address="http://127.0.0.1:"+port;
      if(test) {
        string health=Read(address+"/api/health");string page=Read(address+"/");
        bool assets=true;
        foreach(string logo in new[]{"01-crossroads","02-orbit","03-draw-cards"}) foreach(string suffix in new[]{"","-dark"}) assets &= File.Exists(Path.Combine(root,"dist","logo-concepts",logo+suffix+".png"));
        assets &= Directory.GetFiles(Path.Combine(root,"dist","assets"),"roster.worker-*.js").Length>0;
        assets &= File.Exists(Path.Combine(root,"node_modules","ws","index.js"));
        foreach(string module in new[]{"pairing.mjs","journal.mjs","sync.mjs","music.mjs"}) assets &= File.Exists(Path.Combine(root,module));
        foreach(string route in new[]{"/director","/tournament","/raffle","/obs-live?clean=1","/obs?clean=1","/obs-tournament?clean=1","/obs-raffle?clean=1"}) assets &= Read(address+route).Contains("v3.6");
        bool ok=health.Contains("3.6.0") && page.Contains("v3.6") && assets && File.Exists(Path.Combine(root,"data","music-snapshot.json"));
        if(report!=null)File.WriteAllText(report,"{\"ok\":"+ok.ToString().ToLowerInvariant()+",\"port\":"+port+",\"version\":\"3.6.0\",\"runtimeBundled\":true,\"defaultBrowserInterface\":true}",Encoding.UTF8);
        Stop();return ok?0:1;
      }
      Directory.CreateDirectory(cache);File.WriteAllText(Path.Combine(cache,"last-address-3.6.0.txt"),address);
      Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
      var form=new LauncherWindow(address,root);
      form.Icon=Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
      form.FormClosed+=(sender,e)=>Stop();
      form.Shown+=(s,e)=>Process.Start(new ProcessStartInfo(address){UseShellExecute=true});Application.Run(form);return 0;
    } catch(Exception error) {
      Stop(); if(test && report!=null)File.WriteAllText(report,"{\"ok\":false,\"error\":\""+error.Message.Replace("\\","\\\\").Replace("\"","\\\"").Replace("\r"," ").Replace("\n"," ")+"\"}",Encoding.UTF8);
      if(!test)MessageBox.Show(error.Message,"无法启动 maimai Random Pro",MessageBoxButtons.OK,MessageBoxIcon.Error);
      return 1;
    } finally {if(instance!=null)instance.Dispose();}
  }
  static string ReadSavedAddress() {try{return File.ReadAllText(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"maimai-random-pro","last-address-3.6.0.txt"));}catch{return "http://127.0.0.1:5174";}}
  static string Extract(string cache) {
    byte[] bytes; using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))using(var data=new MemoryStream()){stream.CopyTo(data);bytes=data.ToArray();}
    string hash;using(var sha=SHA256.Create()){hash=BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").Substring(0,16);}
    string root=Path.GetFullPath(Path.Combine(cache,"runtime-3.6.0-"+hash));string marker=Path.Combine(root,".ready");
    if(File.Exists(marker) && File.Exists(Path.Combine(root,"node.exe")))return root;
    Directory.CreateDirectory(root);
    using(var zip=new ZipArchive(new MemoryStream(bytes),ZipArchiveMode.Read))foreach(var entry in zip.Entries) {
      string dest=Path.GetFullPath(Path.Combine(root,entry.FullName));
      if(!dest.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new IOException("Invalid bundled path");
      if(String.IsNullOrEmpty(entry.Name)){Directory.CreateDirectory(dest);continue;}
      Directory.CreateDirectory(Path.GetDirectoryName(dest));using(var source=entry.Open())using(var target=File.Create(dest))source.CopyTo(target);
    }
    File.WriteAllText(marker,hash);return root;
  }
  static string Read(string url) {var request=(HttpWebRequest)WebRequest.Create(url);request.Timeout=1500;request.Proxy=null;using(var response=request.GetResponse())using(var reader=new StreamReader(response.GetResponseStream(),Encoding.UTF8))return reader.ReadToEnd();}
  static bool Ready(int port) {try{return Read("http://127.0.0.1:"+port+"/api/health").Contains("\"version\":\"3.6.0\"");}catch{return false;}}
  static int Start(string root,int requested,bool test,string stateFile) {
    if(!test && Ready(requested))return requested;
    for(int port=requested;port<requested+20;port++) {
      if(Ready(port))continue;
      var info=new ProcessStartInfo(Path.Combine(root,"node.exe"),"server.mjs --lan --port="+port){WorkingDirectory=root,UseShellExecute=false,CreateNoWindow=true,RedirectStandardError=true,RedirectStandardOutput=true};
      // Keep saved tournaments and logs outside the hashed runtime extraction.
      info.EnvironmentVariables["MAIMAI_STATE_FILE"]=stateFile;
      owned=Process.Start(info);var errors=new StringBuilder();
      owned.OutputDataReceived+=(s,e)=>{};owned.ErrorDataReceived+=(s,e)=>{if(e.Data!=null)errors.AppendLine(e.Data);};owned.BeginOutputReadLine();owned.BeginErrorReadLine();
      for(int wait=0;wait<35;wait++){if(owned.HasExited)break;if(Ready(port))return port;Thread.Sleep(100);}
      if(!owned.HasExited)owned.Kill();owned.Dispose();owned=null;
      if(!errors.ToString().Contains("in use"))throw new InvalidOperationException("本地服务启动失败："+errors);
    }
    throw new InvalidOperationException("本地端口已被占用，请关闭旧版启动窗口。");
  }
  static void Stop() {if(owned!=null){try{if(!owned.HasExited)owned.Kill();}catch{}owned.Dispose();owned=null;}}
}


sealed class LauncherWindow : Form {
  readonly bool dark=true;
  LauncherPalette palette;
  readonly RoundedAction open,obs;
  readonly Image logoLight,logoDark;
  [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr handle,int attribute,ref int value,int size);
  protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);try{int enabled=1;if(DwmSetWindowAttribute(Handle,20,ref enabled,4)!=0)DwmSetWindowAttribute(Handle,19,ref enabled,4);}catch{}}
  public LauncherWindow(string url,string root) {
    Text="maimai Random Pro";ClientSize=new Size(720,454);StartPosition=FormStartPosition.CenterScreen;FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;
    DoubleBuffered=true;Font=new Font("Microsoft YaHei UI",12,FontStyle.Regular);AutoScaleMode=AutoScaleMode.None;
    logoLight=LoadLogo(root,"02-orbit.png");logoDark=LoadLogo(root,"02-orbit-dark.png");
    open=new RoundedAction{Text="打开页面",Bounds=new Rectangle(24,372,326,56),Primary=true};
    obs=new RoundedAction{Text="复制 OBS 地址",Bounds=new Rectangle(370,372,326,56)};
    open.Click+=(sender,e)=>Process.Start(new ProcessStartInfo(url){UseShellExecute=true});
    obs.Click+=(sender,e)=>{Clipboard.SetText(url+"/obs-live?clean=1");obs.Text="已复制";};
    Controls.AddRange(new Control[]{open,obs});ApplyPalette();
  }
  static Image LoadLogo(string root,string name){using(var file=Image.FromFile(Path.Combine(root,"dist","logo-concepts",name)))return new Bitmap(file);}
  void ApplyPalette(){palette=LauncherPalette.For(dark);BackColor=palette.Background;ForeColor=palette.Ink;foreach(var button in new[]{open,obs}){button.Palette=palette;button.Dark=dark;button.Invalidate();}Invalidate();}
  protected override void OnPaint(PaintEventArgs e){base.OnPaint(e);PaintScene(e.Graphics);}
  void PaintScene(Graphics g){
    g.SmoothingMode=SmoothingMode.AntiAlias;g.TextRenderingHint=System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;g.Clear(palette.Background);
    using(var dots=new SolidBrush(dark?Color.FromArgb(43,148,163,183):Color.FromArgb(36,82,106,130)))for(int y=12;y<Height;y+=24)for(int x=12;x<Width;x+=24)g.FillEllipse(dots,x,y,1.6f,1.6f);
    using(var orb=new GraphicsPath()){orb.AddEllipse(484,134,188,188);using(var glow=new PathGradientBrush(orb)){glow.CenterColor=dark?Color.FromArgb(40,125,161,210):Color.FromArgb(80,201,219,240);glow.SurroundColors=new[]{Color.Transparent};g.FillPath(glow,orb);}}
    Glass(g,new Rectangle(24,20,672,82),41,palette.Panel,dark);
    g.DrawImage(dark?logoDark:logoLight,new Rectangle(46,29,192,64));
    using(var ready=new SolidBrush(Color.FromArgb(139,199,120)))g.FillEllipse(ready,652,56,8,8);
    Glass(g,new Rectangle(24,126,672,220),28,palette.Panel,dark);
    using(var bold=new Font("Segoe UI",42,FontStyle.Bold))using(var italic=new Font("Segoe UI",42,FontStyle.Italic))using(var ink=new SolidBrush(palette.Ink)){
      var format=new StringFormat(StringFormat.GenericTypographic);format.FormatFlags|=StringFormatFlags.MeasureTrailingSpaces;
      float first=g.MeasureString("ready ",bold,1000,format).Width,second=g.MeasureString("to play",italic,1000,format).Width;
      float x=(ClientSize.Width-first-second-15)/2;
      g.DrawString("ready ",bold,ink,x,184,format);g.DrawString("to play",italic,ink,x+first,184,format);
      using(var yellow=new SolidBrush(Color.FromArgb(184,160,0)))g.FillEllipse(yellow,x+first+second+3,232,8,8);
    }
    using(var dot=new SolidBrush(dark?Color.FromArgb(139,199,120):Color.FromArgb(57,115,43)))g.FillEllipse(dot,281,280,7,7);
    using(var muted=new SolidBrush(palette.Muted))using(var format=new StringFormat{Alignment=StringAlignment.Near,LineAlignment=StringAlignment.Center})g.DrawString("本地服务已启动",Font,muted,new RectangleF(294,270,180,26),format);
  }
  internal void RenderClient(Bitmap bitmap){using(var g=Graphics.FromImage(bitmap)){PaintScene(g);foreach(var button in new[]{open,obs})using(var surface=new Bitmap(button.Width,button.Height)){using(var local=Graphics.FromImage(surface))button.PaintSurface(local);g.DrawImageUnscaled(surface,button.Left,button.Top);}}}
  internal static void Glass(Graphics g,Rectangle rect,int radius,Color fill,bool dark,bool primary=false){
    using(var path=Rounded(rect,radius)){
      using(var shadow=Rounded(new Rectangle(rect.X,rect.Y+4,rect.Width,rect.Height),radius))using(var brush=new SolidBrush(Color.FromArgb(dark?30:12,0,0,0)))g.FillPath(brush,shadow);
      using(var brush=new SolidBrush(fill))g.FillPath(brush,path);
      using(var shine=new LinearGradientBrush(rect,Color.FromArgb(primary?8:dark?18:80,255,255,255),Color.FromArgb(primary?2:dark?3:12,255,255,255),125f))g.FillPath(shine,path);
      using(var rim=new LinearGradientBrush(rect,Color.FromArgb(dark?100:240,255,255,255),dark?Color.FromArgb(75,3,6,10):Color.FromArgb(70,128,145,162),45f))using(var pen=new Pen(rim,1.2f))g.DrawPath(pen,path);
    }
  }
  internal static GraphicsPath Rounded(Rectangle r,int radius){var path=new GraphicsPath();int d=radius*2;path.AddArc(r.X,r.Y,d,d,180,90);path.AddArc(r.Right-d,r.Y,d,d,270,90);path.AddArc(r.Right-d,r.Bottom-d,d,d,0,90);path.AddArc(r.X,r.Bottom-d,d,d,90,90);path.CloseFigure();return path;}
  protected override void Dispose(bool disposing){if(disposing){logoLight.Dispose();logoDark.Dispose();}base.Dispose(disposing);}
}
sealed class RoundedAction : Button {
  internal bool Primary,Dark;
  internal LauncherPalette Palette=LauncherPalette.For(false);
  readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer{Interval=16};
  float hover;bool inside;
  internal RoundedAction(){SetStyle(ControlStyles.UserPaint|ControlStyles.AllPaintingInWmPaint|ControlStyles.OptimizedDoubleBuffer|ControlStyles.SupportsTransparentBackColor,true);BackColor=Color.Transparent;FlatStyle=FlatStyle.Flat;FlatAppearance.BorderSize=0;Cursor=Cursors.Hand;Font=new Font("Microsoft YaHei UI",12);timer.Tick+=(sender,e)=>{hover+=(inside?1f:-1f)*.12f;hover=Math.Max(0,Math.Min(1,hover));Invalidate();if(hover==0 || hover==1)timer.Stop();};}
  protected override void OnMouseEnter(EventArgs e){base.OnMouseEnter(e);inside=true;timer.Start();}
  protected override void OnMouseLeave(EventArgs e){base.OnMouseLeave(e);inside=false;timer.Start();}
  protected override void OnPaint(PaintEventArgs e){PaintSurface(e.Graphics);}
  internal void PaintSurface(Graphics g){
    g.SmoothingMode=SmoothingMode.AntiAlias;
    g.TextRenderingHint=System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
    Color fill=Primary?Blend(Palette.Primary,Palette.PrimaryHover,hover):Palette.Field;
    LauncherWindow.Glass(g,new Rectangle(0,0,Width-1,Height-5),Height/2-3,fill,Dark,Primary);
    Color ink=Primary?Palette.PrimaryInk:Palette.Ink;
    using(var brush=new SolidBrush(ink))using(var format=new StringFormat{Alignment=StringAlignment.Center,LineAlignment=StringAlignment.Center})g.DrawString(Text,Font,brush,new RectangleF(0,0,Width,Height-4),format);
    if(Focused)using(var pen=new Pen(ink,2))using(var focus=LauncherWindow.Rounded(new Rectangle(4,4,Width-9,Height-12),Height/2-6))g.DrawPath(pen,focus);
  }
  static Color Blend(Color a,Color b,float t){return Color.FromArgb((int)(a.R+(b.R-a.R)*t),(int)(a.G+(b.G-a.G)*t),(int)(a.B+(b.B-a.B)*t));}
  protected override void Dispose(bool disposing){if(disposing)timer.Dispose();base.Dispose(disposing);}
}
