using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.FileProviders;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.PropertyNamingPolicy = null);

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Abhishek Portfolio API", Version = "v1" });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Abhishek Portfolio API v1");
    c.RoutePrefix = "swagger";
});
if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("AllowAll");

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"]        = "SAMEORIGIN";
    context.Response.Headers["X-XSS-Protection"]       = "1; mode=block";
    context.Response.Headers["Referrer-Policy"]        = "strict-origin-when-cross-origin";
    await next();
});

// ── Serve Frontend static files ───────────────────────────────
var frontendPath = Path.Combine(builder.Environment.ContentRootPath, "Frontend");
if (Directory.Exists(frontendPath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new PhysicalFileProvider(frontendPath),
        RequestPath  = ""
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(frontendPath),
        RequestPath  = ""
    });
}

app.MapFallbackToFile("index.html");

// ── Config ────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
var adminPassword    = builder.Configuration["AdminPassword"] ?? "portfolio2024";

var emailSection  = builder.Configuration.GetSection("Email");
var emailHost     = emailSection["SmtpHost"]    ?? "smtp.gmail.com";
var emailPort     = int.TryParse(emailSection["SmtpPort"], out var ep) ? ep : 587;
var emailUser     = emailSection["SmtpUser"]    ?? "";
var emailPass     = emailSection["SmtpPass"]    ?? "";
var emailFrom     = emailSection["FromAddress"] ?? emailUser;
var emailTo       = emailSection["ToAddress"]   ?? emailUser;

// ── Rate limiter (in-memory, per IP, max 3/hour) ──────────────
var rateLimits = new ConcurrentDictionary<string, (int Count, DateTime ResetAt)>();

bool AdminPasswordValid(string? provided) =>
    !string.IsNullOrEmpty(provided) &&
    CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(provided.PadRight(adminPassword.Length)),
        Encoding.UTF8.GetBytes(adminPassword.PadRight(provided.Length)))
    && provided.Length == adminPassword.Length;

// ── Email helper (best-effort, non-blocking) ──────────────────
async Task TrySendEmailAsync(string subject, string body)
{
    if (string.IsNullOrEmpty(emailPass)) return;
    try
    {
#pragma warning disable SYSLIB0006
        using var smtp = new SmtpClient(emailHost, emailPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(emailUser, emailPass)
        };
#pragma warning restore SYSLIB0006
        await smtp.SendMailAsync(new MailMessage(emailFrom, emailTo, subject, body));
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Email] Send failed: {ex.Message}");
    }
}

// ── Hero ──────────────────────────────────────────────────────
app.MapGet("/api/portfolio/hero", () => Results.Json(new HeroContent(
    "Abhishek V Desai",
    ".NET & SQL Developer | 9+ Years Enterprise Experience | Finance · Real Estate · Healthcare",
    new[] { "ASP.NET Core", "SQL Server", "Azure DP-300", "Angular 8-14", "PySpark ETL" },
    "/Abhishek_Desai_Resume.pdf",
    "https://www.linkedin.com/in/abhishek-v-desai-273594311",
    "avdesai900@gmail.com",
    "+1 (540)-724-1408"
)))
.WithName("GetHeroContent")
.WithOpenApi()
.Produces<HeroContent>(200);

// ── Experience ────────────────────────────────────────────────
app.MapGet("/api/portfolio/experience", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"SELECT Company, Project, Role, StartDate, EndDate, Environment, Achievements
                         FROM dbo.WorkExperience
                         ORDER BY SortOrder";
    var experience = await connection.QueryAsync<WorkExperienceDto>(sql);
    return Results.Ok(experience);
})
.WithName("GetWorkExperience")
.WithOpenApi()
.Produces<IEnumerable<WorkExperienceDto>>(200);

// ── Skills ────────────────────────────────────────────────────
app.MapGet("/api/portfolio/skills", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    c.CategoryId,
    c.Name AS CategoryName,
    c.SortOrder AS CategorySortOrder,
    s.SkillId,
    s.Name AS SkillName,
    s.ProficiencyPct,
    s.SortOrder AS SkillSortOrder
FROM dbo.SkillCategory c
JOIN dbo.Skill s ON s.CategoryId = c.CategoryId
ORDER BY c.SortOrder, s.SortOrder";
    var rows       = await connection.QueryAsync<SkillCategorySkillRow>(sql);
    var categories = rows
        .GroupBy(r => new { r.CategoryId, r.CategoryName, r.CategorySortOrder })
        .Select(g => new SkillCategoryDto(
            g.Key.CategoryName,
            g.Select(r => new SkillDto(r.SkillId, r.SkillName, r.ProficiencyPct, r.SkillSortOrder)).ToList()))
        .ToList();
    return Results.Ok(categories);
})
.WithName("GetSkills")
.WithOpenApi()
.Produces<IEnumerable<SkillCategoryDto>>(200);

// ── Metrics ───────────────────────────────────────────────────
app.MapGet("/api/portfolio/metrics", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    AchievementId,
    MetricValue,
    TRY_CAST(REPLACE(MetricValue, '%', '') AS INT) AS MetricPercent,
    MetricLabel,
    CompanySource
FROM dbo.Achievement
ORDER BY SortOrder";
    var metrics = await connection.QueryAsync<AchievementDto>(sql);
    return Results.Ok(metrics);
})
.WithName("GetPortfolioMetrics")
.WithOpenApi()
.Produces<IEnumerable<AchievementDto>>(200);

// ── Projects ──────────────────────────────────────────────────
app.MapGet("/api/portfolio/projects", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    ProjectId,
    Title,
    Company,
    Industry,
    Description,
    MetricHighlight,
    Tags
FROM dbo.Project
ORDER BY SortOrder";
    var projects = await connection.QueryAsync<ProjectDto>(sql);
    return Results.Ok(projects);
})
.WithName("GetProjects")
.WithOpenApi()
.Produces<IEnumerable<ProjectDto>>(200);

// ── Certifications ────────────────────────────────────────────
app.MapGet("/api/portfolio/certifications", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    CertId,
    Name,
    Issuer,
    BadgeUrl,
    VerifyUrl
FROM dbo.Certification
ORDER BY SortOrder";
    var certs = await connection.QueryAsync<CertificationDto>(sql);
    return Results.Ok(certs);
})
.WithName("GetCertifications")
.WithOpenApi()
.Produces<IEnumerable<CertificationDto>>(200);

// ── Education ─────────────────────────────────────────────────
app.MapGet("/api/portfolio/education", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    EduId,
    Degree,
    Institution,
    CAST(GradYear AS INT) AS GradYear
FROM dbo.Education
ORDER BY SortOrder";
    var education = await connection.QueryAsync<EducationDto>(sql);
    return Results.Ok(education);
})
.WithName("GetEducation")
.WithOpenApi()
.Produces<IEnumerable<EducationDto>>(200);

// ── Domain Expertise ──────────────────────────────────────────
app.MapGet("/api/portfolio/domain-expertise", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    DomainId,
    Name,
    Icon,
    Headline,
    Bullets,
    TechChips
FROM dbo.DomainExpertise
ORDER BY SortOrder";
    var domains = await connection.QueryAsync<DomainExpertiseDto>(sql);
    return Results.Ok(domains);
})
.WithName("GetDomainExpertise")
.WithOpenApi()
.Produces<IEnumerable<DomainExpertiseDto>>(200);

// ── Technologies ──────────────────────────────────────────────
app.MapGet("/api/portfolio/technologies", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    TechId,
    Name,
    Category,
    YearsExp,
    UsedAt
FROM dbo.TechItem
ORDER BY Category, SortOrder";
    var tech = await connection.QueryAsync<TechItemDto>(sql);
    return Results.Ok(tech);
})
.WithName("GetTechnologies")
.WithOpenApi()
.Produces<IEnumerable<TechItemDto>>(200);

// ── Testimonials (public — approved only) ─────────────────────
app.MapGet("/api/portfolio/testimonials", async () =>
{
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    TestimonialId,
    AuthorName,
    AuthorTitle,
    Company,
    Quote,
    Rating,
    IsApproved
FROM dbo.Testimonial
WHERE IsApproved = 1
ORDER BY SortOrder";
    var testimonials = await connection.QueryAsync<TestimonialDto>(sql);
    return Results.Ok(testimonials);
})
.WithName("GetTestimonials")
.WithOpenApi()
.Produces<IEnumerable<TestimonialDto>>(200);

// ── Admin: Testimonials ───────────────────────────────────────
app.MapGet("/api/portfolio/admin/testimonials", async (HttpContext ctx) =>
{
    if (!AdminPasswordValid(ctx.Request.Headers["X-Admin-Password"]))
        return Results.Unauthorized();

    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT TestimonialId, AuthorName, AuthorTitle, Company, Quote, Rating, IsApproved
FROM dbo.Testimonial
ORDER BY SortOrder";
    var testimonials = await connection.QueryAsync<TestimonialDto>(sql);
    return Results.Ok(testimonials);
})
.WithName("GetAllTestimonials")
.WithOpenApi()
.Produces<IEnumerable<TestimonialDto>>(200)
.Produces(401);

app.MapPost("/api/portfolio/admin/testimonials", async (HttpContext ctx, TestimonialSubmission submission) =>
{
    if (!AdminPasswordValid(ctx.Request.Headers["X-Admin-Password"]))
        return Results.Unauthorized();

    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
INSERT INTO dbo.Testimonial (AuthorName, AuthorTitle, Company, Quote, Rating, IsApproved)
VALUES (@AuthorName, @AuthorTitle, @Company, @Quote, @Rating, 0)";
    await connection.ExecuteAsync(sql, submission);
    return Results.Created("/api/portfolio/testimonials", new { message = "Testimonial submitted for review" });
})
.WithName("SubmitTestimonial")
.WithOpenApi()
.Produces(201)
.Produces(401);

app.MapPut("/api/portfolio/admin/testimonials/{id}/approve", async (HttpContext ctx, int id) =>
{
    if (!AdminPasswordValid(ctx.Request.Headers["X-Admin-Password"]))
        return Results.Unauthorized();

    await using var connection = new SqlConnection(connectionString);
    await connection.ExecuteAsync("UPDATE dbo.Testimonial SET IsApproved = 1 WHERE TestimonialId = @Id", new { Id = id });
    return Results.Ok(new { message = "Testimonial approved" });
})
.WithName("ApproveTestimonial")
.WithOpenApi()
.Produces(200)
.Produces(401);

app.MapDelete("/api/portfolio/admin/testimonials/{id}", async (HttpContext ctx, int id) =>
{
    if (!AdminPasswordValid(ctx.Request.Headers["X-Admin-Password"]))
        return Results.Unauthorized();

    await using var connection = new SqlConnection(connectionString);
    await connection.ExecuteAsync("DELETE FROM dbo.Testimonial WHERE TestimonialId = @Id", new { Id = id });
    return Results.Ok(new { message = "Testimonial deleted" });
})
.WithName("DeleteTestimonial")
.WithOpenApi()
.Produces(200)
.Produces(401);

// ── Contact form submit ────────────────────────────────────────
app.MapPost("/api/portfolio/contact", async (HttpContext ctx, ContactLeadRequest req) =>
{
    // Honeypot: bots fill hidden fields, humans don't — silent accept, do not save
    if (!string.IsNullOrEmpty(req.Website))
        return Results.Ok(new { message = "Thank you for reaching out!" });

    // Input validation
    if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Length > 200)
        return Results.BadRequest(new { message = "Name is required (max 200 characters)." });

    if (string.IsNullOrWhiteSpace(req.Email) || req.Email.Length > 200)
        return Results.BadRequest(new { message = "Email address is required." });

    if (!Regex.IsMatch(req.Email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
        return Results.BadRequest(new { message = "Please enter a valid email address." });

    if (!string.IsNullOrWhiteSpace(req.Company) && req.Company.Length > 200)
        return Results.BadRequest(new { message = "Company name is too long (max 200 characters)." });

    if (string.IsNullOrWhiteSpace(req.Message) || req.Message.Length > 1000)
        return Results.BadRequest(new { message = "Message is required (max 1000 characters)." });

    if (!string.IsNullOrWhiteSpace(req.Phone))
    {
        var phone = req.Phone.Trim();
        if (!phone.StartsWith("+"))
            return Results.BadRequest(new { message = "Phone must start with + and a country code (e.g. +1, +44, +91)." });
        var digits = Regex.Replace(phone[1..], @"[\s\-.()\[\]]", "");
        if (!Regex.IsMatch(digits, @"^\d+$"))
            return Results.BadRequest(new { message = "Phone may only contain digits, spaces, dashes, or parentheses after +." });
        if (digits.Length < 5 || digits.Length > 13)
            return Results.BadRequest(new { message = "Phone number length is invalid. Include country code + up to 10 digits." });
    }

    string[] validLeadTypes = ["Full-Time Role", "Contract", "Consulting", "Just Networking"];
    if (!validLeadTypes.Contains(req.LeadType))
        return Results.BadRequest(new { message = "Please select a valid opportunity type." });

    // Rate limit: max 3 submissions per IP per hour
    var ip  = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var now = DateTime.UtcNow;

    if (rateLimits.Count > 1000)
        foreach (var k in rateLimits.Keys.ToList())
            if (rateLimits.TryGetValue(k, out var v) && v.ResetAt < now)
                rateLimits.TryRemove(k, out _);

    rateLimits.AddOrUpdate(ip,
        _  => (1, now.AddHours(1)),
        (_, e) => now > e.ResetAt ? (1, now.AddHours(1)) : (e.Count + 1, e.ResetAt));

    if (rateLimits.TryGetValue(ip, out var limit) && limit.Count > 3)
        return Results.StatusCode(429);

    // Persist to DB
    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
INSERT INTO dbo.ContactLead (Name, Email, Company, Phone, LeadType, Message, Source)
VALUES (@Name, @Email, @Company, @Phone, @LeadType, @Message, 'Portfolio')";

    await connection.ExecuteAsync(sql, new
    {
        Name    = req.Name.Trim(),
        Email   = req.Email.Trim(),
        Company = req.Company?.Trim(),
        Phone   = req.Phone?.Trim(),
        req.LeadType,
        Message = req.Message.Trim()
    });

    // Fire-and-forget email notification
    _ = TrySendEmailAsync(
        $"[Portfolio Lead] {req.LeadType} — {req.Name.Trim()}",
        $"""
        New contact form submission on your portfolio:

        Name:    {req.Name.Trim()}
        Email:   {req.Email.Trim()}
        Company: {req.Company?.Trim() ?? "(not provided)"}
        Phone:   {req.Phone?.Trim() ?? "(not provided)"}
        Type:    {req.LeadType}

        Message:
        {req.Message.Trim()}

        ---
        Open the admin dashboard in Frontend/admin.html after starting the API.
        """);

    return Results.Ok(new { message = "Thank you for reaching out! I'll get back to you within 24 hours." });
})
.WithName("SubmitContact")
.WithOpenApi()
.Produces(200)
.Produces(400)
.Produces(429);

// ── Admin: leads summary (must be before /admin/leads/{id}) ───
app.MapGet("/api/portfolio/admin/leads/summary", async (HttpContext ctx) =>
{
    if (!AdminPasswordValid(ctx.Request.Headers["X-Admin-Password"]))
        return Results.Unauthorized();

    await using var connection = new SqlConnection(connectionString);
    const string sql = @"
SELECT
    LeadType,
    COUNT(*)                                         AS TotalLeads,
    SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END)     AS UnreadLeads,
    MAX(SubmittedOn)                                 AS LastSubmittedOn
FROM dbo.ContactLead
GROUP BY LeadType
ORDER BY TotalLeads DESC";

    var summary     = await connection.QueryAsync(sql);
    var totalUnread = await connection.ExecuteScalarAsync<int>(
        "SELECT COUNT(*) FROM dbo.ContactLead WHERE IsRead = 0");

    return Results.Ok(new { totalUnread, summary });
})
.WithName("GetLeadSummary")
.WithOpenApi()
.Produces(200)
.Produces(401);

// ── Admin: list leads with filter ────────────────────────────
app.MapGet("/api/portfolio/admin/leads", async (HttpContext ctx, string? leadType, bool? unreadOnly) =>
{
    if (!AdminPasswordValid(ctx.Request.Headers["X-Admin-Password"]))
        return Results.Unauthorized();

    var conditions = new List<string>();
    var parameters = new DynamicParameters();

    if (!string.IsNullOrWhiteSpace(leadType) && leadType != "All")
    {
        conditions.Add("AND LeadType = @LeadType");
        parameters.Add("LeadType", leadType);
    }
    if (unreadOnly == true)
        conditions.Add("AND IsRead = 0");

    var sql = $@"
SELECT LeadId, Name, Email, Company, Phone, LeadType, Message, Source, SubmittedOn, IsRead
FROM dbo.ContactLead
WHERE 1=1 {string.Join(" ", conditions)}
ORDER BY SubmittedOn DESC";

    await using var connection = new SqlConnection(connectionString);
    var leads = await connection.QueryAsync<ContactLeadDto>(sql, parameters);
    return Results.Ok(leads);
})
.WithName("GetContactLeads")
.WithOpenApi()
.Produces<IEnumerable<ContactLeadDto>>(200)
.Produces(401);

// ── Admin: mark lead as read ──────────────────────────────────
app.MapPut("/api/portfolio/admin/leads/{id}/read", async (HttpContext ctx, int id) =>
{
    if (!AdminPasswordValid(ctx.Request.Headers["X-Admin-Password"]))
        return Results.Unauthorized();

    await using var connection = new SqlConnection(connectionString);
    await connection.ExecuteAsync(
        "UPDATE dbo.ContactLead SET IsRead = 1 WHERE LeadId = @Id", new { Id = id });
    return Results.Ok(new { message = "Marked as read." });
})
.WithName("MarkLeadRead")
.WithOpenApi()
.Produces(200)
.Produces(401);

app.Run();

// ── Record types ──────────────────────────────────────────────
record HeroContent(string Name, string Headline, string[] Tagline, string ResumeUrl, string LinkedInUrl, string Email, string Phone);

record WorkExperienceDto(string Company, string Project, string Role, DateTime StartDate, DateTime? EndDate, string Environment, string Achievements);
record SkillCategorySkillRow(int CategoryId, string CategoryName, int CategorySortOrder, int SkillId, string SkillName, byte ProficiencyPct, int SkillSortOrder);
record SkillDto(int SkillId, string Name, byte ProficiencyPct, int SortOrder);
record SkillCategoryDto(string Name, IEnumerable<SkillDto> Skills);
record AchievementDto(int AchievementId, string MetricValue, int MetricPercent, string MetricLabel, string CompanySource);
record ProjectDto(int ProjectId, string Title, string Company, string Industry, string? Description, string? MetricHighlight, string? Tags);
record CertificationDto(int CertId, string Name, string Issuer, string? BadgeUrl, string? VerifyUrl);
record EducationDto(int EduId, string Degree, string Institution, int? GradYear);
record DomainExpertiseDto(int DomainId, string Name, string? Icon, string Headline, string? Bullets, string? TechChips);
record TechItemDto(int TechId, string Name, string Category, byte? YearsExp, string? UsedAt);
record TestimonialDto(int TestimonialId, string AuthorName, string? AuthorTitle, string? Company, string Quote, byte Rating, bool IsApproved);
record TestimonialSubmission(string AuthorName, string? AuthorTitle, string? Company, string Quote, byte Rating);

record ContactLeadRequest(
    string Name,
    string Email,
    string? Company,
    string? Phone,
    string LeadType,
    string Message,
    string? Website   // honeypot — must be empty for real submissions
);
record ContactLeadDto(
    int LeadId,
    string Name,
    string Email,
    string? Company,
    string? Phone,
    string LeadType,
    string Message,
    string? Source,
    DateTime SubmittedOn,
    bool IsRead
);

