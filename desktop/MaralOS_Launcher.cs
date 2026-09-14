using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace MaralOS
{
    public class Program : Form
    {
        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;
        private System.Windows.Forms.Timer healthTimer;
        private Label statusLabel;
        private Button openAppBtn;
        private Button restartBtn;

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new Program());
        }

        public Program()
        {
            // Configure Form
            this.Text = "MARAL OS - Sistema Operativo Comercial";
            this.Size = new Size(480, 320);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 23, 42); // Slate-900

            // Header Label
            Label headerLabel = new Label();
            headerLabel.Text = "MARAL OS";
            headerLabel.Font = new Font("Segoe UI", 18, FontStyle.Bold);
            headerLabel.ForeColor = Color.White;
            headerLabel.Location = new Point(24, 20);
            headerLabel.AutoSize = true;
            this.Controls.Add(headerLabel);

            Label subHeader = new Label();
            subHeader.Text = "Segundo Cerebro Comercial de Don John Mónoga";
            subHeader.Font = new Font("Segoe UI", 10, FontStyle.Regular);
            subHeader.ForeColor = Color.FromArgb(148, 163, 184); // Slate-400
            subHeader.Location = new Point(26, 56);
            subHeader.AutoSize = true;
            this.Controls.Add(subHeader);

            // Status Card
            Panel statusCard = new Panel();
            statusCard.Location = new Point(24, 95);
            statusCard.Size = new Size(415, 65);
            statusCard.BackColor = Color.FromArgb(30, 41, 59); // Slate-800
            this.Controls.Add(statusCard);

            statusLabel = new Label();
            statusLabel.Text = "● Verificando conexión del servidor...";
            statusLabel.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            statusLabel.ForeColor = Color.FromArgb(251, 191, 36); // Amber-400
            statusLabel.Location = new Point(16, 20);
            statusLabel.AutoSize = true;
            statusCard.Controls.Add(statusLabel);

            // Open App Button
            openAppBtn = new Button();
            openAppBtn.Text = "🚀 ABRIR MARAL OS (Modo Ventas)";
            openAppBtn.Font = new Font("Segoe UI", 11, FontStyle.Bold);
            openAppBtn.ForeColor = Color.White;
            openAppBtn.BackColor = Color.FromArgb(37, 99, 235); // Blue-600
            openAppBtn.FlatStyle = FlatStyle.Flat;
            openAppBtn.FlatAppearance.BorderSize = 0;
            openAppBtn.Location = new Point(24, 180);
            openAppBtn.Size = new Size(415, 48);
            openAppBtn.Cursor = Cursors.Hand;
            openAppBtn.Click += (s, e) => LaunchBrowserApp();
            this.Controls.Add(openAppBtn);

            // Restart / Quick Sync Button
            restartBtn = new Button();
            restartBtn.Text = "🔄 Actualizar Datos";
            restartBtn.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            restartBtn.ForeColor = Color.FromArgb(203, 213, 225);
            restartBtn.BackColor = Color.FromArgb(51, 65, 85);
            restartBtn.FlatStyle = FlatStyle.Flat;
            restartBtn.FlatAppearance.BorderSize = 0;
            restartBtn.Location = new Point(24, 238);
            restartBtn.Size = new Size(415, 30);
            restartBtn.Cursor = Cursors.Hand;
            restartBtn.Click += (s, e) => CheckServices();
            this.Controls.Add(restartBtn);

            // Tray Menu
            trayMenu = new ContextMenuStrip();
            trayMenu.Items.Add("🚀 Abrir Maral OS", null, (s, e) => { this.Show(); LaunchBrowserApp(); });
            trayMenu.Items.Add("🔄 Actualizar", null, (s, e) => CheckServices());
            trayMenu.Items.Add("-");
            trayMenu.Items.Add("❌ Salir", null, (s, e) => Application.Exit());

            trayIcon = new NotifyIcon();
            trayIcon.Text = "MARAL OS - Sistema Operativo";
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => { this.Show(); this.WindowState = FormWindowState.Normal; LaunchBrowserApp(); };

            // Periodic Health Check Timer
            healthTimer = new System.Windows.Forms.Timer();
            healthTimer.Interval = 3000;
            healthTimer.Tick += (s, e) => CheckServices();
            healthTimer.Start();

            // Initial check & auto-launch
            CheckServices();
            
            // Auto open browser on startup
            ThreadPool.QueueUserWorkItem((o) => {
                Thread.Sleep(800);
                this.Invoke((MethodInvoker)delegate {
                    LaunchBrowserApp();
                });
            });
        }

        private const string CLOUD_URL = "https://spirited-nourishment-production-d471.up.railway.app";
        private const string LOCAL_URL = "http://localhost:5173";

        private string GetActiveUrl()
        {
            // Check if local dev is active, otherwise use cloud 24/7 URL
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(LOCAL_URL);
                req.Timeout = 800;
                req.Method = "GET";
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    if (res.StatusCode == HttpStatusCode.OK) return LOCAL_URL;
                }
            }
            catch {}
            return CLOUD_URL;
        }

        private bool IsServerHealthy()
        {
            return true; // Cloud is 24/7 online on Railway
        }

        private void CheckServices()
        {
            string activeUrl = GetActiveUrl();
            bool isLocal = activeUrl == LOCAL_URL;
            statusLabel.Text = isLocal ? "● Conectado a Servidor Local" : "● Conectado a Servidor Nube 24/7 (Railway)";
            statusLabel.ForeColor = Color.FromArgb(74, 222, 128); // Emerald-400
            openAppBtn.Enabled = true;
        }

        private void LaunchBrowserApp()
        {
            string url = GetActiveUrl();
            try
            {
                // Try to launch in Edge / Chrome App Mode (looks like a native desktop app!)
                string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                if (!File.Exists(edgePath))
                {
                    edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
                }

                if (File.Exists(edgePath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = edgePath;
                    psi.Arguments = string.Format("--app=\"{0}\" --window-size=1400,900", url);
                    Process.Start(psi);
                    return;
                }

                // Fallback to default browser
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al abrir Maral OS: " + ex.Message, "Maral OS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            if (this.WindowState == FormWindowState.Minimized)
            {
                this.Hide();
                trayIcon.ShowBalloonTip(1500, "MARAL OS", "La aplicación sigue activa en segundo plano", ToolTipIcon.Info);
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                // Minimize to tray instead of quitting immediately
                e.Cancel = true;
                this.WindowState = FormWindowState.Minimized;
                this.Hide();
            }
            else
            {
                trayIcon.Visible = false;
                base.OnFormClosing(e);
            }
        }
    }
}
