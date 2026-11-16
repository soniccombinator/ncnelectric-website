# One-time Microsoft 365 setup so the website can send email as one mailbox (default sonic@ncnelectric.com).
# Run by an NCN Microsoft 365 admin (Global Admin, or Application Admin + Exchange Admin) from this repo folder:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-m365-mail.ps1
# What it does:
#   1. Creates a single-tenant Entra app "NCN Website Mailer" with NO Graph API permissions.
#   2. Grants that app Exchange "Application Mail.Send" scoped ONLY to the sender mailbox (Application RBAC).
#   3. Creates a client secret and writes it plus the IDs straight into Railway variables. The secret is never displayed.
param(
  [string]$Sender = 'sonic@ncnelectric.com',
  [string]$AdminTo = 'bsameit@ncnelectric.com,jalvarenga@ncnelectric.com',
  [string]$AppName = 'NCN Website Mailer',
  [int]$SecretMonths = 24
)
$ErrorActionPreference = 'Stop'

foreach ($m in 'Microsoft.Graph.Authentication','Microsoft.Graph.Applications','ExchangeOnlineManagement') {
  if (-not (Get-Module -ListAvailable $m)) { Write-Host "Installing $m ..."; Install-Module $m -Scope CurrentUser -Force -AllowClobber }
}
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) { throw 'Railway CLI not found. Run this on the PC where railway is installed and linked to the website service.' }

Write-Host "`n[1/4] Sign in to Microsoft Graph as an NCN admin (browser window)..."
Connect-MgGraph -Scopes 'Application.ReadWrite.All' -NoWelcome
$tenantId = (Get-MgContext).TenantId

$app = Get-MgApplication -Filter "displayName eq '$AppName'" | Select-Object -First 1
if (-not $app) { $app = New-MgApplication -DisplayName $AppName -SignInAudience 'AzureADMyOrg'; Write-Host "Created app $AppName" }
else { Write-Host "Using existing app $AppName" }
$sp = Get-MgServicePrincipal -Filter "appId eq '$($app.AppId)'" | Select-Object -First 1
if (-not $sp) { $sp = New-MgServicePrincipal -AppId $app.AppId }

Write-Host "`n[2/4] Sign in to Exchange Online as an NCN admin..."
Connect-ExchangeOnline -ShowBanner:$false
$mbx = Get-Mailbox -Identity $Sender -ErrorAction SilentlyContinue
if (-not $mbx) { throw "Mailbox $Sender was not found in this tenant. Create it (a shared mailbox is fine) and run again." }

if (-not (Get-ServicePrincipal -Identity $sp.Id -ErrorAction SilentlyContinue)) {
  New-ServicePrincipal -AppId $app.AppId -ObjectId $sp.Id -DisplayName $AppName | Out-Null
}
$scopeName = 'NCN Website Sender Only'
if (-not (Get-ManagementScope -Identity $scopeName -ErrorAction SilentlyContinue)) {
  New-ManagementScope -Name $scopeName -RecipientRestrictionFilter "PrimarySmtpAddress -eq '$($mbx.PrimarySmtpAddress)'" | Out-Null
}
$assignment = Get-ManagementRoleAssignment -Role 'Application Mail.Send' -ErrorAction SilentlyContinue | Where-Object { $_.RoleAssignee -eq $sp.Id -or $_.App -eq $app.AppId }
if (-not $assignment) {
  New-ManagementRoleAssignment -App $app.AppId -Role 'Application Mail.Send' -CustomResourceScope $scopeName | Out-Null
}
Write-Host "Granted Mail.Send for $($mbx.PrimarySmtpAddress) only. Checking:"
Test-ServicePrincipalAuthorization -Identity $app.AppId -Resource $mbx.PrimarySmtpAddress | Format-Table RoleName,InScope -AutoSize

Write-Host "`n[3/4] Creating client secret ($SecretMonths months) and saving it to Railway..."
$cred = Add-MgApplicationPassword -ApplicationId $app.Id -PasswordCredential @{ displayName = 'Railway website'; endDateTime = (Get-Date).AddMonths($SecretMonths) }
# Secret goes through stdin so it never appears on a command line or the screen.
$cred.SecretText | & railway variables --set-from-stdin MS_CLIENT_SECRET --skip-deploys | Out-Null
$secretOk = ($LASTEXITCODE -eq 0)
$cred = $null
if (-not $secretOk) { throw 'Saving the secret to Railway failed. Delete the new "Railway website" secret in Entra and run again.' }
& railway variables --skip-deploys `
  --set "MS_TENANT_ID=$tenantId" `
  --set "MS_CLIENT_ID=$($app.AppId)" `
  --set "MAIL_SENDER=$($mbx.PrimarySmtpAddress)" `
  --set "MAIL_ADMIN_TO=$AdminTo" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Saving Railway variables failed.' }

Write-Host "`n[4/4] Done. Secret expires $((Get-Date).AddMonths($SecretMonths).ToString('yyyy-MM-dd')); set a reminder to rotate it."
Write-Host "Tenant: $tenantId  App (client) ID: $($app.AppId)  Sender: $($mbx.PrimarySmtpAddress)"
Write-Host 'Exchange permission changes can take up to 30 minutes to apply. Then run:  railway run node scripts/mail-test.cjs'
Disconnect-ExchangeOnline -Confirm:$false | Out-Null
Disconnect-MgGraph | Out-Null
