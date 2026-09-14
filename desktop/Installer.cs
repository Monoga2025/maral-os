using System;
using System.IO;
using System.Windows.Forms;

namespace MaralInstaller
{
    public class Program
    {
        [STAThread]
        public static void Main()
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string currentDir = AppDomain.CurrentDomain.BaseDirectory;
                string exePath = Path.Combine(currentDir, "MaralOS.exe");

                if (!File.Exists(exePath))
                {
                    MessageBox.Show("No se encontró MaralOS.exe en la misma carpeta.", "Error de Instalación", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // Create Shortcut on Desktop
                string shortcutPath = Path.Combine(desktopPath, "MARAL OS - Segundo Cerebro.lnk");
                Type t = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(t);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = exePath;
                shortcut.WorkingDirectory = currentDir;
                shortcut.Description = "MARAL OS - Sistema Operativo Comercial";
                shortcut.Save();

                MessageBox.Show("¡Instalación exitosa!\n\nSe ha creado el acceso directo 'MARAL OS - Segundo Cerebro' en el Escritorio de Don John.", "MARAL OS Instalado", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error durante la instalación: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
