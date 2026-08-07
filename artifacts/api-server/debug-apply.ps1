$pdfPath = Join-Path $PSScriptRoot 'sample_resume.pdf'
if (-not (Test-Path $pdfPath)) {
    Write-Error "sample_resume.pdf not found at $pdfPath"
    exit 1
}

$jobs = Invoke-RestMethod -Uri 'http://localhost:5000/api/public/jobs' -UseBasicParsing
if (-not $jobs -or $jobs.Count -eq 0) {
    Write-Error 'No jobs returned from /api/public/jobs'
    exit 1
}

$jobId = $jobs[0].id
if (-not $jobId) {
    $jobId = $jobs[0]._id
}
if (-not $jobId) {
    Write-Error 'Job ID missing in the first job entry'
    exit 1
}

Write-Host "Using jobId: $jobId"

$form = @{
    name = 'Test User'
    email = 'test@example.com'
    jobId = $jobId
    githubUrl = 'https://github.com/test'
    linkedinUrl = 'https://linkedin.com/in/test'
    resume = Get-Item $pdfPath
}

$response = Invoke-WebRequest -Uri 'http://localhost:5000/api/public/apply' -Method Post -Form $form -UseBasicParsing -ErrorAction Stop
Write-Host "Status: $($response.StatusCode)"
Write-Host $response.Content
