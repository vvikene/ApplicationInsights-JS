##
## This script create and wrap the generated api dts file with a namespace and copyright notice the version
##
##  powershell.exe -ExecutionPolicy Bypass ../../scripts\dtsgen.ps1 'namespace.to.delare'
##
param (
  [string] $namespace = "",                                 # [Optional] Defines the namespave that should be declared
  [string] $projectPath = "./",                             # [Optional] The root path for the project
  [string] $dtsFile = "",                                   # [Optional] The generated Dts file (if cannot be derived from the package.json)
  [bool] $hidePrivate = $true                               # [Optional] Switch to hide private properties and functions
 )

if (!(Test-Path "$projectPath/package.json")) {
    Write-Warning "Missing package.json file [$projectPath/package.json]"
    exit
}

$packageJson = Get-Content "$projectPath/package.json" | Out-String | ConvertFrom-Json
$desc = $packageJson.description
$version = $packageJson.version
$author = $packageJson.author
$homepage = $packageJson.homepage

# Derive the default package name from the defined name
$packageName = $packageJson.name
$packageName = $packageName -replace '@microsoft/', ''
$packageName = $packageName -replace '/', '_'

# Try and find the default *.d.ts file
if (!$dtsFile) {
    $dtsFile = "$projectPath/dist/$packageName.d.ts"
}

if (!$dtsFile -or !(Test-Path $dtsFile -ErrorAction Ignore)) {
    Write-Error "Missing .d.ts file [$dtsFile]"
    exit
}

$newContent = 
    "/*`n" +
    " * $desc, $version`n" +
    " * Copyright (c) Microsoft and contributors. All rights reserved.`n" +
    " *`n" +
    " * Author  : $author`n" +
    " * HomePage: $homepage`n" +
    " */`n";

$postfix = "";
$indent = "";
if ([string]::IsNullOrWhiteSpace($namespace) -eq $false) {
    # foreach ($name in $namespace.Split(".")) {
    #     $newContent += "$($indent)declare namespace $name {`n";
    #     $postfix = "$indent`n}$postfix"
    #     $indent += "    ";
    # }

    $newContent += "$($indent)declare namespace $namespace {`n";
    $postfix = "`n}"
    $indent += "    ";
}
else {
    $newContent += "// No namespace defined!`n";
}

#Read the generated dts file and append to the new content
$lastLine = ""
# Prefix every line with 4 spaces (indenting the lines)
ForEach ($line in (Get-Content $dtsFile)) {
    # Remove exports and declares
    $line = $line -replace 'export declare ', ''
    $line = $line -replace 'declare ', ''
    $line = $line -replace 'export { }', ''

    # Trim whitespace from the end of the string
    $line = $line -replace '(\s+$)', ''

    if ($line) {
        if ($hidePrivate) {
            #Hide private properties and functions
            $line = $line -replace '(^\s+)private (.*);', '${1}// private ${2};'
        }
        $newContent += "`n$indent$line";
    } elseif ($lastLine) {
        # Only add 1 blank line
        $newContent += "`n"
    }

    $lastLine = $line
}

# Add final trailing closing bracket for the namespace
$newContent += $postfix

Set-Content -Path $dtsFile -Encoding Ascii -Value $newContent
