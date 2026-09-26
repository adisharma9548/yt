Add-Type -AssemblyName System.Windows.Forms

$fbd = New-Object System.Windows.Forms.FolderBrowserDialog
$fbd.Description = "Select Download Folder"
$fbd.ShowNewFolderButton = $true
$fbd.AutoUpgradeEnabled = $true

# Create an invisible top-most form to ensure dialog is in the foreground
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.Width = 1
$form.Height = 1
$form.StartPosition = "CenterScreen"
$form.Show()
$form.Activate()

$result = $fbd.ShowDialog($form)
$form.Close()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $fbd.SelectedPath
}
