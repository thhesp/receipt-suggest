[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[^:\r\n\s]+$')]
    [string]$Username,

    [string]$OutputFile = (Join-Path $PSScriptRoot '.htpasswd'),

    [switch]$Append
)

$ErrorActionPreference = 'Stop'

$password = Read-Host "Password for $Username" -AsSecureString
$passwordConfirmation = Read-Host 'Confirm password' -AsSecureString

$passwordBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$confirmationBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordConfirmation)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordBstr)
    $plainConfirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordConfirmation)

    if ($plainPassword -cne $plainConfirmation) {
        throw 'The passwords do not match.'
    }

    $htpasswdCommand = Get-Command htpasswd -ErrorAction SilentlyContinue
    if ($htpasswdCommand) {
        $entry = $plainPassword | & $htpasswdCommand.Source -n -i -B -C 12 $Username
    }
    else {
        $entry = $plainPassword | docker run --rm --interactive --entrypoint htpasswd httpd:2.4-alpine -n -i -B -C 12 $Username
    }

    $entry = @($entry | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

    if ($LASTEXITCODE -ne 0 -or $entry.Count -ne 1 -or $entry -notmatch "^$([regex]::Escape($Username)):\`$2[aby]\`$") {
        throw 'Could not generate a bcrypt htpasswd entry. Install Apache htpasswd or start Docker Desktop and try again.'
    }

    $directory = Split-Path -Parent $OutputFile
    if ($directory) {
        New-Item -ItemType Directory -Force -Path $directory | Out-Null
    }

    if ((Test-Path -LiteralPath $OutputFile) -and -not $Append) {
        throw "Refusing to overwrite '$OutputFile'. Use -Append to add this user, or remove the file first."
    }

    Add-Content -LiteralPath $OutputFile -Value $entry -Encoding ascii
    Write-Host "Added '$Username' to $OutputFile."
}
finally {
    if ($passwordBstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordBstr)
    }

    if ($confirmationBstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationBstr)
    }
}
